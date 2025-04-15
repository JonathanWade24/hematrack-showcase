'use client';

import { useState, useEffect, useCallback } from 'react';
import { TableSelector } from './TableSelector';
import { FilterBuilder } from './FilterBuilder';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TableInfo {
  schema: string;
  table: string;
  description: string;
  date_columns: { name: string; type: string }[];
}

interface ContextSettings {
  direction: 'before' | 'after' | 'both' | 'exact';
  windowDays: number;
  referenceDateColumn: string;
  contextDateColumn: string;
}

interface ContextualizedDataSelectorProps {
  availableTables: TableInfo[];
  isLoading: boolean;
  primarySource: {
    schema: string;
    table: string;
    conditions: Record<string, { operator: string; value: any }>;
  };
  contextSource: {
    schema: string;
    table: string;
    conditions: Record<string, { operator: string; value: any }>;
  } | null;
  contextSettings: ContextSettings;
  onContextSourceChange: (schema: string, table: string, conditions?: Record<string, { operator: string; value: any }>) => void;
  onContextSettingsChange: (settings: Partial<ContextSettings>) => void;
}

export function ContextualizedDataSelector({
  availableTables,
  isLoading,
  primarySource,
  contextSource,
  contextSettings,
  onContextSourceChange,
  onContextSettingsChange
}: ContextualizedDataSelectorProps) {
  const [primaryDateColumns, setPrimaryDateColumns] = useState<{ name: string; type: string }[]>([]);
  const [contextDateColumns, setContextDateColumns] = useState<{ name: string; type: string }[]>([]);
  const [useContextualization, setUseContextualization] = useState<boolean>(!!contextSource);

  // Get date columns from the primary source
  useEffect(() => {
    if (primarySource && availableTables.length > 0) {
      const primaryTable = availableTables.find(
        t => t.schema === primarySource.schema && t.table === primarySource.table
      );
      
      if (primaryTable && primaryTable.date_columns) {
        setPrimaryDateColumns(primaryTable.date_columns);
      }
    }
  }, [primarySource, availableTables]);

  // Get date columns from the context source if selected
  useEffect(() => {
    if (contextSource && availableTables.length > 0) {
      const contextTable = availableTables.find(
        t => t.schema === contextSource.schema && t.table === contextSource.table
      );
      
      if (contextTable && contextTable.date_columns) {
        setContextDateColumns(contextTable.date_columns);
      }
    } else {
      setContextDateColumns([]);
    }
  }, [contextSource, availableTables]);

  // Update useContextualization when contextSource changes
  useEffect(() => {
    setUseContextualization(!!contextSource);
  }, [contextSource]);

  // Handle toggling contextualization on/off
  const handleToggleContextualization = useCallback((enabled: boolean) => {
    setUseContextualization(enabled);
    if (!enabled) {
      onContextSourceChange('', '');
    }
  }, [onContextSourceChange]);

  // Handle context source selection
  const handleContextSourceSelect = useCallback((schema: string, table: string) => {
    onContextSourceChange(schema, table, contextSource?.conditions || {});
    
    // Reset date columns if changing tables
    if (schema !== contextSource?.schema || table !== contextSource?.table) {
      onContextSettingsChange({ contextDateColumn: '' });
    }
  }, [contextSource, onContextSourceChange, onContextSettingsChange]);

  // Handle direction change
  const handleDirectionChange = useCallback((value: string) => {
    onContextSettingsChange({ 
      direction: value as 'before' | 'after' | 'both' | 'exact'
    });
  }, [onContextSettingsChange]);

  // Handle window days change
  const handleWindowDaysChange = useCallback((value: number[]) => {
    onContextSettingsChange({ windowDays: value[0] });
  }, [onContextSettingsChange]);

  if (!primarySource) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          id="contextualization"
          checked={useContextualization}
          onCheckedChange={handleToggleContextualization}
        />
        <Label htmlFor="contextualization">
          Enable Data Contextualization
        </Label>
      </div>

      {useContextualization && (
        <div className="space-y-6">
          {/* Context Data Source Selection */}
          <div>
            <TableSelector 
              availableTables={availableTables}
              isLoading={isLoading}
              onSelect={handleContextSourceSelect}
              selectedSchema={contextSource?.schema}
              selectedTable={contextSource?.table}
              label="Select a secondary data source to contextualize with the primary data"
            />
          </div>

          {/* Context Settings - visible only when context source is selected */}
          {contextSource && contextSource.schema && contextSource.table && (
            <div className="space-y-6">
              {/* Temporal Configuration */}
              <div>
                <Label className="text-lg font-semibold mb-3">Temporal Configuration</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                  {/* Primary Date Column Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="reference-date-column">Reference Date Column (from primary data)</Label>
                    <Select 
                      value={contextSettings.referenceDateColumn} 
                      onValueChange={(value) => onContextSettingsChange({ referenceDateColumn: value })}
                    >
                      <SelectTrigger id="reference-date-column">
                        <SelectValue placeholder="Select date column" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {primaryDateColumns.map(column => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.name} ({column.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Context Date Column Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="context-date-column">Context Date Column (from secondary data)</Label>
                    <Select 
                      value={contextSettings.contextDateColumn} 
                      onValueChange={(value) => onContextSettingsChange({ contextDateColumn: value })}
                    >
                      <SelectTrigger id="context-date-column">
                        <SelectValue placeholder="Select date column" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {contextDateColumns.map(column => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.name} ({column.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Time Direction Selection */}
              <div className="space-y-2">
                <Label className="text-base">Time Direction</Label>
                <RadioGroup 
                  value={contextSettings.direction} 
                  onValueChange={handleDirectionChange}
                  className="flex flex-col space-y-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="direction-before" />
                    <Label htmlFor="direction-before">Before reference date</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="direction-after" />
                    <Label htmlFor="direction-after">After reference date</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="direction-both" />
                    <Label htmlFor="direction-both">Around reference date (before and after)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exact" id="direction-exact" />
                    <Label htmlFor="direction-exact">Exact date match</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Time Window Size Slider - only show if not "exact" match */}
              {contextSettings.direction !== 'exact' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="window-days">Time Window (days): {contextSettings.windowDays}</Label>
                  </div>
                  <Slider
                    id="window-days"
                    value={[contextSettings.windowDays]}
                    min={1}
                    max={365}
                    step={1}
                    onValueChange={handleWindowDaysChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>365 days</span>
                  </div>
                </div>
              )}

              {/* Filters for Context Source */}
              <div className="mt-6">
                <Label className="text-lg font-semibold mb-3">Filters for Secondary Data</Label>
                <div className="mt-3">
                  <FilterBuilder 
                    schema={contextSource.schema}
                    table={contextSource.table}
                    onChange={(conditions) => 
                      onContextSourceChange(contextSource.schema, contextSource.table, conditions)
                    }
                    conditions={contextSource.conditions}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
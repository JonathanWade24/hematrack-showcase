'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TableSelector } from './TableSelector';
import { FilterBuilder } from './FilterBuilder';
import { ContextualizedDataSelector } from './ContextualizedDataSelector';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { DataPreview } from './DataPreview';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export function QueryBuilder() {
  const { toast } = useToast();
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [primarySource, setPrimarySource] = useState<{
    schema: string;
    table: string;
    conditions: Record<string, { operator: string; value: any }>;
  } | null>(null);
  const [contextSource, setContextSource] = useState<{
    schema: string;
    table: string;
    conditions: Record<string, { operator: string; value: any }>;
  } | null>(null);
  const [contextSettings, setContextSettings] = useState<ContextSettings>({
    direction: 'both',
    windowDays: 90,
    referenceDateColumn: '',
    contextDateColumn: ''
  });
  const [isExecutingQuery, setIsExecutingQuery] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("query-builder");

  // Fetch available tables when component mounts
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoadingTables(true);
        const response = await fetch('/api/query-builder?type=tables');
        if (!response.ok) {
          throw new Error('Failed to fetch tables');
        }
        const data = await response.json();
        setAvailableTables(data.data || []);
      } catch (error) {
        console.error('Error fetching tables:', error);
        toast({
          title: 'Error',
          description: 'Failed to load available tables',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTables(false);
      }
    };

    fetchTables();
  }, []); // Removed toast dependency

  const handlePrimarySourceChange = useCallback((
    schema: string,
    table: string,
    conditions: Record<string, { operator: string; value: any }> = {}
  ) => {
    setPrimarySource(prev => {
      // Only update if there's an actual change
      if (!prev || 
          prev.schema !== schema || 
          prev.table !== table || 
          JSON.stringify(prev.conditions) !== JSON.stringify(conditions)) {
        return { schema, table, conditions };
      }
      return prev;
    });
  }, []);

  const handleContextSourceChange = useCallback((
    schema: string,
    table: string,
    conditions: Record<string, { operator: string; value: any }> = {}
  ) => {
    setContextSource(prev => {
      // If schema and table are empty, return null to disable contextualization
      if (!schema && !table) return null;
      
      // Only update if there's an actual change
      if (!prev || 
          prev.schema !== schema || 
          prev.table !== table || 
          JSON.stringify(prev.conditions) !== JSON.stringify(conditions)) {
        return { schema, table, conditions };
      }
      return prev;
    });
  }, []);

  const handleContextSettingsChange = useCallback((settings: Partial<ContextSettings>) => {
    setContextSettings(prev => {
      const newSettings = { ...prev, ...settings };
      // Only update if there's an actual change
      if (JSON.stringify(newSettings) !== JSON.stringify(prev)) {
        return newSettings;
      }
      return prev;
    });
  }, []);

  const executeQuery = useCallback(async (exportFormat: 'json' | 'csv' = 'json') => {
    if (!primarySource) {
      toast({
        title: 'Error',
        description: 'Please select a primary data source',
        variant: 'destructive',
      });
      return;
    }

    // If context source is selected, ensure context settings are valid
    if (contextSource) {
      if (!contextSettings.referenceDateColumn) {
        toast({
          title: 'Error',
          description: 'Please select a reference date column from the primary source',
          variant: 'destructive',
        });
        return;
      }
      if (!contextSettings.contextDateColumn) {
        toast({
          title: 'Error',
          description: 'Please select a date column from the context source',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setIsExecutingQuery(true);

      const requestBody = {
        primarySource,
        contextSource,
        contextSettings: contextSource ? contextSettings : undefined,
        exportFormat
      };

      if (exportFormat === 'csv') {
        // For CSV, we need to handle the download directly
        const response = await fetch('/api/query-builder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to execute query');
        }

        // Create a blob from the response and download it
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Success',
          description: 'Data exported successfully',
        });
      } else {
        // For JSON, we'll show the results in the preview panel
        const response = await fetch('/api/query-builder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to execute query');
        }

        const result = await response.json();
        setQueryResult(result.data);
        setActiveTab('data-preview');
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while executing the query',
        variant: 'destructive',
      });
    } finally {
      setIsExecutingQuery(false);
    }
  }, [primarySource, contextSource, contextSettings, toast]);

  // Use memoized props for filter builder to avoid unnecessary re-renders
  const filterBuilderProps = useMemo(() => {
    if (!primarySource) return null;
    return {
      schema: primarySource.schema,
      table: primarySource.table,
      onChange: (conditions: Record<string, { operator: string; value: any }>) => 
        handlePrimarySourceChange(primarySource.schema, primarySource.table, conditions),
      conditions: primarySource.conditions
    };
  }, [primarySource, handlePrimarySourceChange]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="query-builder">Query Builder</TabsTrigger>
          <TabsTrigger value="data-preview" disabled={!queryResult}>
            Data Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query-builder" className="space-y-6">
          {/* Primary Data Source Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Data Source</CardTitle>
            </CardHeader>
            <CardContent>
              <TableSelector 
                availableTables={availableTables}
                isLoading={isLoadingTables}
                onSelect={(schema, table) => handlePrimarySourceChange(schema, table)}
                selectedSchema={primarySource?.schema}
                selectedTable={primarySource?.table}
                label="Select the main data you want to export"
              />

              {primarySource && filterBuilderProps && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Filters</h3>
                  <FilterBuilder 
                    schema={filterBuilderProps.schema}
                    table={filterBuilderProps.table}
                    onChange={filterBuilderProps.onChange}
                    conditions={filterBuilderProps.conditions}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contextualized Data Source Selector */}
          {primarySource && (
            <Card>
              <CardHeader>
                <CardTitle>Contextualized Data Source (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <ContextualizedDataSelector
                  availableTables={availableTables}
                  isLoading={isLoadingTables}
                  primarySource={primarySource}
                  contextSource={contextSource}
                  contextSettings={contextSettings}
                  onContextSourceChange={handleContextSourceChange}
                  onContextSettingsChange={handleContextSettingsChange}
                />
              </CardContent>
            </Card>
          )}

          {/* Query Execution Buttons */}
          {primarySource && (
            <div className="flex flex-wrap gap-4 justify-end">
              <Button
                variant="outline"
                onClick={() => executeQuery('csv')}
                disabled={isExecutingQuery}
              >
                {isExecutingQuery ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting CSV...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export as CSV
                  </>
                )}
              </Button>

              <Button
                onClick={() => executeQuery('json')}
                disabled={isExecutingQuery}
              >
                {isExecutingQuery ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Run Query'
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data-preview">
          {queryResult && <DataPreview data={queryResult} />}
        </TabsContent>
      </Tabs>
    </div>
  );
} 
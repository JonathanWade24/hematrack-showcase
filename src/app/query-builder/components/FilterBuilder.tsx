'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ColumnInfo {
  name: string;
  data_type: string;
  description: string | null;
  is_nullable: boolean;
}

interface FilterCondition {
  operator: string;
  value: any;
}

interface FilterBuilderProps {
  schema: string;
  table: string;
  onChange: (conditions: Record<string, FilterCondition>) => void;
  conditions: Record<string, FilterCondition>;
}

type OperatorOption = {
  value: string;
  label: string;
  applicableTypes: string[];
};

const OPERATORS: OperatorOption[] = [
  { value: 'eq', label: 'Equals', applicableTypes: ['all'] },
  { value: 'neq', label: 'Not Equals', applicableTypes: ['all'] },
  { value: 'gt', label: 'Greater Than', applicableTypes: ['numeric', 'date', 'timestamp'] },
  { value: 'gte', label: 'Greater Than or Equal', applicableTypes: ['numeric', 'date', 'timestamp'] },
  { value: 'lt', label: 'Less Than', applicableTypes: ['numeric', 'date', 'timestamp'] },
  { value: 'lte', label: 'Less Than or Equal', applicableTypes: ['numeric', 'date', 'timestamp'] },
  { value: 'like', label: 'Contains', applicableTypes: ['text', 'varchar', 'character varying'] },
  { value: 'ilike', label: 'Contains (Case Insensitive)', applicableTypes: ['text', 'varchar', 'character varying'] },
  { value: 'is_null', label: 'Is Null', applicableTypes: ['all'] },
  { value: 'is_not_null', label: 'Is Not Null', applicableTypes: ['all'] },
];

// Map PostgreSQL data types to simplified filter types
const DATA_TYPE_MAP: Record<string, string> = {
  'integer': 'numeric',
  'bigint': 'numeric',
  'smallint': 'numeric',
  'decimal': 'numeric',
  'numeric': 'numeric',
  'real': 'numeric',
  'double precision': 'numeric',
  'text': 'text',
  'character varying': 'text',
  'varchar': 'text',
  'char': 'text',
  'date': 'date',
  'timestamp': 'timestamp',
  'timestamp with time zone': 'timestamp',
  'timestamp without time zone': 'timestamp',
};

export function FilterBuilder({ schema, table, onChange, conditions }: FilterBuilderProps) {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterCondition>>(conditions || {});
  const [filterForm, setFilterForm] = useState<{
    column: string;
    operator: string;
    value: string;
  }>({
    column: '',
    operator: 'eq',
    value: '',
  });

  // Fetch columns for the selected table
  useEffect(() => {
    async function fetchColumns() {
      if (!schema || !table) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/query-builder?type=columns&schema=${schema}&table=${table}`);
        if (!response.ok) {
          throw new Error('Failed to fetch columns');
        }
        const data = await response.json();
        setColumns(data.data || []);
      } catch (error) {
        console.error('Error fetching columns:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchColumns();
  }, [schema, table]);

  // Update active filters when external conditions prop changes
  useEffect(() => {
    // Only update if conditions actually changed
    if (JSON.stringify(conditions) !== JSON.stringify(activeFilters)) {
      setActiveFilters(conditions || {});
    }
  }, [conditions, activeFilters]);

  // Avoid update loop by only calling onChange when activeFilters changes
  useEffect(() => {
    // Skip the initial render
    if (Object.keys(activeFilters).length > 0 || Object.keys(conditions).length > 0) {
      // Only call onChange if activeFilters is different from conditions
      if (JSON.stringify(activeFilters) !== JSON.stringify(conditions)) {
        onChange(activeFilters);
      }
    }
  }, [activeFilters, onChange, conditions]);

  const getColumnDataType = useCallback((columnName: string): string => {
    const column = columns.find(col => col.name === columnName);
    if (!column) return 'text';
    
    const dataType = column.data_type.toLowerCase();
    return DATA_TYPE_MAP[dataType] || 'text';
  }, [columns]);

  const getApplicableOperators = useCallback((columnName: string): OperatorOption[] => {
    if (!columnName) return OPERATORS;
    
    const dataType = getColumnDataType(columnName);
    return OPERATORS.filter(op => 
      op.applicableTypes.includes('all') || op.applicableTypes.includes(dataType)
    );
  }, [getColumnDataType]);

  const handleAddFilter = useCallback(() => {
    // Skip if column or operator is not selected
    if (!filterForm.column || !filterForm.operator) return;
    
    // Skip value check for IS NULL and IS NOT NULL operators
    if (!['is_null', 'is_not_null'].includes(filterForm.operator) && !filterForm.value) return;

    // Add the filter to active filters
    setActiveFilters(prev => ({
      ...prev,
      [filterForm.column]: {
        operator: filterForm.operator,
        value: filterForm.value
      }
    }));

    // Reset the form
    setFilterForm({
      column: '',
      operator: 'eq',
      value: '',
    });
  }, [filterForm]);

  const handleRemoveFilter = useCallback((columnName: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[columnName];
      return newFilters;
    });
  }, []);

  const handleColumnChange = useCallback((value: string) => {
    setFilterForm(prev => ({ ...prev, column: value }));
  }, []);

  const handleOperatorChange = useCallback((value: string) => {
    setFilterForm(prev => ({ ...prev, operator: value }));
  }, []);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterForm(prev => ({ ...prev, value: e.target.value }));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading columns...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="space-y-2">
          <Label>Active Filters</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([column, condition]) => (
              <Badge key={column} variant="secondary" className="flex items-center gap-1 p-1.5">
                <span>
                  {column} {getOperatorLabel(condition.operator)} {displayFilterValue(condition)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 rounded-full"
                  onClick={() => handleRemoveFilter(column)}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <Separator className="my-4" />
        </div>
      )}

      {/* Filter Builder Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column Selector */}
          <div className="space-y-2">
            <Label htmlFor="column-select">Column</Label>
            <Select 
              value={filterForm.column} 
              onValueChange={handleColumnChange}
            >
              <SelectTrigger id="column-select">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {columns.map(column => (
                  <SelectItem key={column.name} value={column.name}>
                    {column.name} ({column.data_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Selector */}
          <div className="space-y-2">
            <Label htmlFor="operator-select">Operator</Label>
            <Select 
              value={filterForm.operator} 
              onValueChange={handleOperatorChange}
              disabled={!filterForm.column}
            >
              <SelectTrigger id="operator-select">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {getApplicableOperators(filterForm.column).map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input (only show for operators that need a value) */}
          {!['is_null', 'is_not_null'].includes(filterForm.operator) && (
            <div className="space-y-2">
              <Label htmlFor="value-input">Value</Label>
              <Input
                id="value-input"
                value={filterForm.value}
                onChange={handleValueChange}
                disabled={!filterForm.column || !filterForm.operator}
                type={getInputType(getColumnDataType(filterForm.column))}
                placeholder="Enter value"
              />
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleAddFilter}
          disabled={!filterForm.column || !filterForm.operator || (!['is_null', 'is_not_null'].includes(filterForm.operator) && !filterForm.value)}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter
        </Button>
      </div>
    </div>
  );
}

// Helper functions
function getOperatorLabel(operatorValue: string): string {
  const operator = OPERATORS.find(op => op.value === operatorValue);
  return operator ? operator.label : operatorValue;
}

function displayFilterValue(condition: FilterCondition): string {
  if (['is_null', 'is_not_null'].includes(condition.operator)) {
    return '';
  }
  return condition.value?.toString() || '';
}

function getInputType(dataType: string): string {
  switch (dataType) {
    case 'numeric':
      return 'number';
    case 'date':
      return 'date';
    case 'timestamp':
      return 'datetime-local';
    default:
      return 'text';
  }
} 
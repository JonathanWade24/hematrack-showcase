'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface TableInfo {
  schema: string;
  table: string;
  description: string;
  date_columns: { name: string; type: string }[];
}

interface TableSelectorProps {
  availableTables: TableInfo[];
  isLoading: boolean;
  onSelect: (schema: string, table: string) => void;
  selectedSchema?: string;
  selectedTable?: string;
  label?: string;
}

export function TableSelector({
  availableTables,
  isLoading,
  onSelect,
  selectedSchema,
  selectedTable,
  label = 'Select a table'
}: TableSelectorProps) {
  const [schemas, setSchemas] = useState<string[]>([]);
  const [tables, setTables] = useState<{ [schema: string]: TableInfo[] }>({});
  const [selectedSchemaState, setSelectedSchemaState] = useState<string>(selectedSchema || '');
  
  // Group tables by schema when available tables change
  useEffect(() => {
    if (availableTables.length > 0) {
      const schemasList = Array.from(new Set(availableTables.map(t => t.schema)));
      const tablesBySchema: { [schema: string]: TableInfo[] } = {};
      
      schemasList.forEach(schema => {
        tablesBySchema[schema] = availableTables.filter(t => t.schema === schema);
      });
      
      setSchemas(schemasList);
      setTables(tablesBySchema);
    }
  }, [availableTables]);
  
  // Update selected schema when prop changes, but only if it's different
  useEffect(() => {
    if (selectedSchema !== undefined && selectedSchema !== selectedSchemaState) {
      setSelectedSchemaState(selectedSchema);
    }
  }, [selectedSchema, selectedSchemaState]);
  
  const handleSchemaChange = useCallback((value: string) => {
    setSelectedSchemaState(value);
    // Reset table selection if schema changes
    if (value !== selectedSchema) {
      onSelect(value, '');
    }
  }, [onSelect, selectedSchema]);
  
  const handleTableChange = useCallback((value: string) => {
    onSelect(selectedSchemaState, value);
  }, [onSelect, selectedSchemaState]);
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>{label}</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="schema-select">Schema</Label>
            <Select 
              value={selectedSchemaState} 
              onValueChange={handleSchemaChange}
            >
              <SelectTrigger id="schema-select">
                <SelectValue placeholder="Select a schema" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectGroup>
                  <SelectLabel>Available Schemas</SelectLabel>
                  {schemas.map(schema => (
                    <SelectItem key={schema} value={schema}>
                      {schema}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="table-select">Table</Label>
            <Select 
              value={selectedTable || ''} 
              onValueChange={handleTableChange}
              disabled={!selectedSchemaState}
            >
              <SelectTrigger id="table-select">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectGroup>
                  <SelectLabel>Available Tables</SelectLabel>
                  {selectedSchemaState && tables[selectedSchemaState]?.map(tableInfo => (
                    <SelectItem key={tableInfo.table} value={tableInfo.table}>
                      {tableInfo.table}
                      {tableInfo.description && ` - ${tableInfo.description}`}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
} 
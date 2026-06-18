"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@radix-ui/react-separator';
import { PlusCircle, X, Download, Save, Play, Eye, Database, Table2, Columns, Filter, Search, Info } from 'lucide-react';

// Types for our query builder
type Operator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
type LogicalOperator = 'AND' | 'OR';

interface Column {
  name: string;
  type: string;
  isNumeric: boolean;
  originalTable?: string;
  originalSchema?: string;
  originalName?: string;
}

interface ForeignKey {
  columnName: string;
  foreignSchema: string;
  foreignTable: string;
  foreignColumn: string;
}

interface Table {
  name: string;
  schema: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
}

interface Condition {
  id: string;
  column: string;
  operator: Operator;
  value: string;
}

interface ConditionGroup {
  id: string;
  logicalOperator: LogicalOperator;
  conditions: Condition[];
  groups: ConditionGroup[];
}

interface JoinCondition {
  leftColumn: string;
  rightColumn: string;
}

interface TableJoin {
  schema: string;
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT';
  conditions: JoinCondition[];
}

interface QueryDefinition {
  table: string;
  schema: string;
  joins: TableJoin[];
  columns: string[];
  conditionGroup: ConditionGroup;
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

interface QueryResult {
  [key: string]: string | number | boolean | null | Date;
}

interface ColumnValue {
  value: string | number | null;
  count?: number;
}

const OPERATORS: { [key: string]: string } = {
  equals: 'Equals',
  not_equals: 'Not Equals',
  contains: 'Contains',
  not_contains: 'Not Contains',
  greater_than: 'Greater Than',
  less_than: 'Less Than',
  in: 'In',
  not_in: 'Not In',
  is_null: 'Is Null',
  is_not_null: 'Is Not Null'
};

const QueryBuilder: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedSchema, setSelectedSchema] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<Column[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [queryDefinition, setQueryDefinition] = useState<QueryDefinition>({
    table: '',
    schema: '',
    joins: [],
    columns: [],
    conditionGroup: {
      id: 'root',
      logicalOperator: 'AND',
      conditions: [],
      groups: []
    },
    orderBy: [],
    limit: 100,
    offset: 0
  });
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawSql, setRawSql] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('builder');
  const [savedQueries, setSavedQueries] = useState<{ name: string; query: QueryDefinition }[]>([]);
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [columnValues, setColumnValues] = useState<{ [key: string]: ColumnValue[] }>({});
  const [isLoadingValues, setIsLoadingValues] = useState<{ [key: string]: boolean }>({});
  const [selectedJoinTable, setSelectedJoinTable] = useState<string>('');
  const [selectedJoinSchema, setSelectedJoinSchema] = useState<string>('');
  const [joins, setJoins] = useState<TableJoin[]>([]);

  // Fetch tables and their schemas when component mounts
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch('/api/query/metadata/tables');
        if (!response.ok) throw new Error('Failed to fetch tables');
        const data = await response.json() as Table[];
        
        console.log(`Fetched ${data.length} tables from API`);
        
        // Check for tables with duplicate columns
        data.forEach(table => {
          const columnNames = table.columns.map(col => col.name);
          const uniqueColumnNames = [...new Set(columnNames)];
          if (columnNames.length !== uniqueColumnNames.length) {
            console.log(`Table ${table.schema}.${table.name} has duplicate columns: ${columnNames.length} total, ${uniqueColumnNames.length} unique`);
          }
        });
        
        setTables(data);
      } catch (err) {
        setError('Failed to load database tables');
        console.error(err);
      }
    };

    fetchTables();
  }, []);

  // Update available columns when table selection changes
  useEffect(() => {
    if (selectedTable && selectedSchema) {
      const table = tables.find(t => t.name === selectedTable && t.schema === selectedSchema);
      if (table) {
        console.log(`Table ${selectedSchema}.${selectedTable} has ${table.columns.length} columns`);
        
        // Check for duplicate column names
        const columnNames = table.columns.map(col => col.name);
        const duplicateColumns = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
        if (duplicateColumns.length > 0) {
          console.log('Duplicate columns found:', duplicateColumns);
        }
        
        // Ensure we have unique columns by name
        const uniqueColumns = new Map<string, Column>();
        table.columns.forEach(col => {
          if (!uniqueColumns.has(col.name)) {
            uniqueColumns.set(col.name, col);
          }
        });
        
        const uniqueColumnsArray = Array.from(uniqueColumns.values());
        console.log(`After deduplication: ${uniqueColumnsArray.length} columns`);
        
        setAvailableColumns(uniqueColumnsArray);
        
        // Reset selected columns when table changes
        setSelectedColumns([]);
        // Update query definition
        setQueryDefinition(prev => ({
          ...prev,
          table: selectedTable,
          schema: selectedSchema,
          columns: [],
          conditionGroup: {
            id: 'root',
            logicalOperator: 'AND',
            conditions: [],
            groups: []
          },
          joins: [] // Reset joins when table changes
        }));
        
        // Reset joins state
        setJoins([]);
      }
    }
  }, [selectedTable, selectedSchema, tables]);

  // Effect to populate available columns from selected table and joins
  useEffect(() => {
    if (selectedTable && selectedSchema) {
      // Find the selected table in the tables array
      const selectedTableInfo = tables.find(t => t.name === selectedTable && t.schema === selectedSchema);
      
      // Initialize a Map to track columns and avoid duplicates
      const allColumns = new Map<string, Column>();
      
      // Add columns from the main table
      if (selectedTableInfo) {
        selectedTableInfo.columns.forEach(column => {
          allColumns.set(column.name, column);
        });
      }
      
      // Add columns from joined tables
      joins.forEach(join => {
        const joinedTable = tables.find(t => t.name === join.table && t.schema === join.schema);
        if (joinedTable) {
          joinedTable.columns.forEach(column => {
            // Prefix the column name with the table name to avoid conflicts
            const prefixedName = `${join.table}.${column.name}`;
            allColumns.set(prefixedName, {
              ...column,
              name: prefixedName,
              originalTable: column.originalTable || column.name,
              originalSchema: column.originalSchema || join.schema,
              originalName: column.originalName || column.name
            });
          });
        }
      });
      
      console.log(`Total columns including joins: ${allColumns.size}`);
      setAvailableColumns(Array.from(allColumns.values()));
    }
  }, [joins, selectedTable, selectedSchema, tables]);

  // Update fetchColumnValues to handle prefixed column names
  const fetchColumnValues = useCallback(async (column: string) => {
    if (!selectedTable || !selectedSchema) return;
    
    // Extract the actual column name and table/schema if prefixed
    let columnName = column;
    let tableSchema = selectedSchema;
    let tableName = selectedTable;
    
    if (column.includes('.')) {
      const [tablePrefix, colName] = column.split('.');
      columnName = colName;
      
      // Find the table from the prefix
      const joinInfo = joins.find(j => j.table === tablePrefix);
      if (joinInfo) {
        tableSchema = joinInfo.schema;
        tableName = joinInfo.table;
      } else if (tablePrefix === selectedTable) {
        // It's from the main table
        tableSchema = selectedSchema;
        tableName = selectedTable;
      } else {
        console.error(`Could not find table for column: ${column}`);
        return;
      }
    }
    
    // Set loading state for this column
    setIsLoadingValues(prev => ({ ...prev, [column]: true }));
    
    try {
      const response = await fetch('/api/query/values', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: tableSchema,
          table: tableName,
          column: columnName,
          limit: 100
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch column values');
      }
      
      const data = await response.json();
      setColumnValues(prev => ({ ...prev, [column]: data.values }));
    } catch (error) {
      console.error('Error fetching column values:', error);
    } finally {
      setIsLoadingValues(prev => ({ ...prev, [column]: false }));
    }
  }, [selectedTable, selectedSchema, joins, setIsLoadingValues, setColumnValues]);

  // Add this effect to fetch column values when a condition's column changes
  useEffect(() => {
    const fetchValuesForConditions = () => {
      queryDefinition.conditionGroup.conditions.forEach(condition => {
        const selectedColumn = availableColumns.find(col => col.name === condition.column);
        if (condition.column && selectedColumn && !selectedColumn.isNumeric) {
          fetchColumnValues(condition.column);
        }
      });
    };

    if (selectedTable && selectedSchema) {
      fetchValuesForConditions();
    }
  }, [selectedTable, selectedSchema, queryDefinition.conditionGroup.conditions, availableColumns, fetchColumnValues]);

  // Handle table selection
  const handleTableSelect = (tableName: string, schema: string) => {
    setSelectedTable(tableName);
    setSelectedSchema(schema);
  };

  // Handle column selection
  const handleColumnToggle = (columnName: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });

    setQueryDefinition(prev => ({
      ...prev,
      columns: prev.columns.includes(columnName)
        ? prev.columns.filter(col => col !== columnName)
        : [...prev.columns, columnName]
    }));
  };

  // Add a new condition
  const addCondition = (groupId: string = 'root') => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      column: availableColumns.length > 0 ? availableColumns[0].name : '',
      operator: 'equals',
      value: ''
    };

    setQueryDefinition(prev => {
      const updateGroup = (group: ConditionGroup): ConditionGroup => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: [...group.conditions, newCondition]
          };
        }

        return {
          ...group,
          groups: group.groups.map(g => updateGroup(g))
        };
      };

      return {
        ...prev,
        conditionGroup: updateGroup(prev.conditionGroup)
      };
    });
  };

  // Remove a condition
  const removeCondition = (groupId: string, conditionId: string) => {
    setQueryDefinition(prev => {
      const updateGroup = (group: ConditionGroup): ConditionGroup => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: group.conditions.filter(c => c.id !== conditionId)
          };
        }

        return {
          ...group,
          groups: group.groups.map(g => updateGroup(g))
        };
      };

      return {
        ...prev,
        conditionGroup: updateGroup(prev.conditionGroup)
      };
    });
  };

  // Update a condition
  const updateCondition = (groupId: string, conditionId: string, field: keyof Condition, value: string | Operator) => {
    setQueryDefinition(prev => {
      const updateGroup = (group: ConditionGroup): ConditionGroup => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: group.conditions.map(c => 
              c.id === conditionId ? { ...c, [field]: value } : c
            )
          };
        }

        return {
          ...group,
          groups: group.groups.map(g => updateGroup(g))
        };
      };

      return {
        ...prev,
        conditionGroup: updateGroup(prev.conditionGroup)
      };
    });
  };

  // Add a new condition group
  const addConditionGroup = (parentGroupId: string = 'root') => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      logicalOperator: 'AND',
      conditions: [],
      groups: []
    };

    setQueryDefinition(prev => {
      const updateGroup = (group: ConditionGroup): ConditionGroup => {
        if (group.id === parentGroupId) {
          return {
            ...group,
            groups: [...group.groups, newGroup]
          };
        }

        return {
          ...group,
          groups: group.groups.map(g => updateGroup(g))
        };
      };

      return {
        ...prev,
        conditionGroup: updateGroup(prev.conditionGroup)
      };
    });
  };

  // Remove a condition group
  const removeConditionGroup = (parentGroupId: string, groupId: string) => {
    setQueryDefinition(prev => {
      const updateGroup = (group: ConditionGroup): ConditionGroup => {
        if (group.id === parentGroupId) {
          return {
            ...group,
            groups: group.groups.filter(g => g.id !== groupId)
          };
        }

        return {
          ...group,
          groups: group.groups.map(g => updateGroup(g))
        };
      };

      return {
        ...prev,
        conditionGroup: updateGroup(prev.conditionGroup)
      };
    });
  };

  // Update a condition group's logical operator
  const updateGroupOperator = (groupId: string, operator: LogicalOperator) => {
    setQueryDefinition(prev => {
      const updateGroup = (group: ConditionGroup): ConditionGroup => {
        if (group.id === groupId) {
          return {
            ...group,
            logicalOperator: operator
          };
        }

        return {
          ...group,
          groups: group.groups.map(g => updateGroup(g))
        };
      };

      return {
        ...prev,
        conditionGroup: updateGroup(prev.conditionGroup)
      };
    });
  };

  // Execute the query
  const executeQuery = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryDefinition)
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: string };
        throw new Error(errorData.error || 'Failed to execute query');
      }

      const data = await response.json() as { results: QueryResult[]; sql: string };
      setQueryResults(data.results);
      setRawSql(data.sql || '');
      setActiveTab('results');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while executing the query');
      } else {
        setError('An unknown error occurred');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Preview SQL
  const previewSql = async () => {
    try {
      const response = await fetch('/api/query/preview-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryDefinition)
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: string };
        throw new Error(errorData.error || 'Failed to generate SQL preview');
      }

      const data = await response.json() as { sql: string };
      setRawSql(data.sql);
      setActiveTab('sql');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while generating SQL preview');
      } else {
        setError('An unknown error occurred');
      }
      console.error(err);
    }
  };

  // Save the current query
  const saveQuery = () => {
    const queryName = prompt('Enter a name for this query:');
    if (queryName) {
      setSavedQueries(prev => [...prev, { name: queryName, query: queryDefinition }]);
      // In a real app, you would save this to a database or localStorage
      localStorage.setItem('savedQueries', JSON.stringify([
        ...savedQueries,
        { name: queryName, query: queryDefinition }
      ]));
    }
  };

  // Load a saved query
  const loadQuery = (query: QueryDefinition) => {
    setQueryDefinition(query);
    setSelectedTable(query.table);
    setSelectedSchema(query.schema);
    setSelectedColumns(query.columns);
  };

  // Export results to CSV
  const exportToCsv = () => {
    if (!queryResults.length) return;

    const headers = Object.keys(queryResults[0]);
    const csvContent = [
      headers.join(','),
      ...queryResults.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that need to be quoted (contain commas, quotes, or newlines)
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value === null ? '' : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render a condition
  const renderCondition = (condition: Condition, groupId: string) => {
    const selectedColumn = availableColumns.find(col => col.name === condition.column);
    const isNumeric = selectedColumn?.isNumeric || false;
    const isLoading = isLoadingValues[condition.column] || false;
    const hasValues = columnValues[condition.column]?.length > 0;

    // Get grouped columns with duplicates removed
    const groupedColumns = groupColumnsByType(availableColumns);

    return (
      <div key={`condition-${groupId}-${condition.id}`} className="flex flex-col space-y-2 p-3 border rounded-md bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Condition</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeCondition(groupId, condition.id)}
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Select
            value={condition.column}
            onValueChange={(value) => updateCondition(groupId, condition.id, 'column', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedColumns).map(([type, columns]) => (
                <SelectGroup key={`column-type-${selectedSchema}-${selectedTable}-${type}-${groupId}-${condition.id}`}>
                  <SelectLabel>{type}</SelectLabel>
                  {columns.map((column, index) => (
                    <SelectItem 
                      key={`column-option-${selectedSchema}-${selectedTable}-${column.name}-${index}-${groupId}-${condition.id}`} 
                      value={column.name}
                    >
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(value) => updateCondition(groupId, condition.id, 'operator', value as Operator)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OPERATORS).map(([key, label]) => (
                <SelectItem key={`operator-${key}-${groupId}-${condition.id}`} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {condition.operator !== 'is_null' && condition.operator !== 'is_not_null' && (
            <>
              {!isNumeric && !['in', 'not_in'].includes(condition.operator) && hasValues ? (
                <Select
                  value={condition.value}
                  onValueChange={(value) => updateCondition(groupId, condition.id, 'value', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnValues[condition.column]?.map((item, index) => (
                      <SelectItem 
                        key={`value-${condition.column}-${index}-${groupId}-${condition.id}`} 
                        value={String(item.value)}
                      >
                        {String(item.value)} {item.count ? `(${item.count})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="relative">
                  <Input
                    value={condition.value}
                    onChange={(e) => updateCondition(groupId, condition.id, 'value', e.target.value)}
                    placeholder={isNumeric ? "Enter numeric value" : "Enter value"}
                    className={isLoading ? "pr-10" : ""}
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Render a condition group
  const renderConditionGroup = (group: ConditionGroup, parentId?: string, level: number = 0) => (
    <div key={`group-${parentId || 'root'}-${group.id}`} className="p-4 border rounded-md bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">Group with</h4>
          <Select
            value={group.logicalOperator}
            onValueChange={(value) => updateGroupOperator(group.id, value as LogicalOperator)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {group.logicalOperator === 'AND' ? '(all conditions must match)' : '(any condition can match)'}
          </span>
        </div>
        {parentId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeConditionGroup(parentId, group.id)}
            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {group.conditions.length === 0 && group.groups.length === 0 && (
        <div className="text-center p-4 text-muted-foreground text-sm">
          Add conditions or nested groups to build your query
        </div>
      )}

      <div className="space-y-3">
        {group.conditions.map(condition => renderCondition(condition, group.id))}
        
        {group.groups.map(nestedGroup => (
          <div key={`nested-group-${group.id}-${nestedGroup.id}`} className="ml-4">
            {renderConditionGroup(nestedGroup, group.id, level + 1)}
          </div>
        ))}
        
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addCondition(group.id)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-3 w-3" />
            Add Condition
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => addConditionGroup(group.id)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-3 w-3" />
            Add Nested Group
          </Button>
        </div>
      </div>
    </div>
  );

  // Update the renderTableSelection function to ensure unique keys
  const renderTableSelection = () => {
    // Group tables by schema
    const tablesBySchema = tables.reduce((acc, table) => {
      if (!acc[table.schema]) {
        acc[table.schema] = [];
      }
      acc[table.schema].push(table);
      return acc;
    }, {} as { [key: string]: Table[] });

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Select a table</h3>
        </div>
        <div className="space-y-6">
          {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
            <div key={`schema-${schema}`} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">{schema}</h4>
                <span className="text-xs text-muted-foreground">({schemaTables.length} tables)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {schemaTables.map((table, index) => (
                  <Card 
                    key={`table-${table.schema}-${table.name}-${index}`}
                    className={`cursor-pointer hover:border-primary transition-colors ${
                      selectedTable === table.name && selectedSchema === table.schema ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleTableSelect(table.name, table.schema)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">
                          {table.name}
                        </CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {table.columns.length} columns
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Update the groupColumnsByType function to handle duplicate columns
  const groupColumnsByType = (columns: Column[]) => {
    // Create a map to track unique columns by name
    const uniqueColumns = new Map<string, Column>();
    
    // Only keep the first occurrence of each column name
    columns.forEach(column => {
      if (!uniqueColumns.has(column.name)) {
        uniqueColumns.set(column.name, column);
      }
    });
    
    // Convert back to array and group by type
    const uniqueColumnsArray = Array.from(uniqueColumns.values());
    return uniqueColumnsArray.reduce((acc, column) => {
      const type = column.type.toUpperCase();
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(column);
      return acc;
    }, {} as { [key: string]: Column[] });
  };

  // Update the renderColumnSelection function to use the unique columns
  const renderColumnSelection = () => {
    if (!selectedTable) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Columns className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Select Columns</h3>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Card className="p-4">
          <div className="space-y-4">
            {Object.entries(groupColumnsByType(availableColumns)).map(([type, columns]) => {
              const filteredColumns = columns.filter(col => 
                col.name.toLowerCase().includes(columnSearch.toLowerCase())
              );
              
              if (filteredColumns.length === 0) return null;
              
              return (
                <div key={`column-group-${selectedSchema}-${selectedTable}-${type}`} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{type}</h4>
                    <span className="text-xs text-muted-foreground">({filteredColumns.length} columns)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredColumns.map((column, index) => (
                      <div
                        key={`column-select-${selectedSchema}-${selectedTable}-${column.name}-${index}`}
                        className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-muted ${
                          selectedColumns.includes(column.name) ? 'bg-primary/10 border border-primary/30' : 'border'
                        }`}
                        onClick={() => handleColumnToggle(column.name)}
                      >
                        <Checkbox
                          checked={selectedColumns.includes(column.name)}
                          onCheckedChange={() => handleColumnToggle(column.name)}
                          id={`column-checkbox-${selectedSchema}-${selectedTable}-${column.name}-${index}`}
                        />
                        <label
                          htmlFor={`column-checkbox-${selectedSchema}-${selectedTable}-${column.name}-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {column.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  // Render the query results section
  const renderQueryResults = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-500 mb-2">Error executing query</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      );
    }

    if (queryResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <div className="text-lg font-medium mb-2">No results found</div>
          <div className="text-sm text-muted-foreground">
            Try adjusting your query conditions or selecting a different table
          </div>
        </div>
      );
    }

    // Get column headers from the first result
    const columns = Object.keys(queryResults[0]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md">
          <div className="text-sm font-medium">
            {queryResults.length} {queryResults.length === 1 ? 'row' : 'rows'} returned
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                {columns.map((column, index) => (
                  <th 
                    key={`header-${index}-${column}`} 
                    className="px-4 py-2 text-left font-medium text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResults.map((row, rowIndex) => (
                <tr 
                  key={`row-${rowIndex}`} 
                  className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                >
                  {columns.map((column, colIndex) => (
                    <td 
                      key={`cell-${rowIndex}-${colIndex}`} 
                      className="px-4 py-2 border-t"
                    >
                      {row[column] === null ? (
                        <span className="text-muted-foreground italic">null</span>
                      ) : (
                        String(row[column])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render the SQL preview section
  const renderSqlPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">SQL Preview</h3>
      </div>
      
      <Card className="p-4 bg-muted/20">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Generated SQL Query</h4>
        </div>
        <pre className="p-4 bg-background rounded-md text-sm overflow-x-auto">
          {rawSql || 'SQL query will appear here when you build your query'}
        </pre>
      </Card>
    </div>
  );

  // Render the saved queries section
  const renderSavedQueries = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Save className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Saved Queries</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={saveQuery}
          disabled={!selectedTable}
          className="flex items-center gap-1"
        >
          <Save className="h-4 w-4" />
          Save Current Query
        </Button>
      </div>

      {savedQueries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <Save className="h-12 w-12 text-muted-foreground mb-4" />
          <div className="text-lg font-medium mb-2">No saved queries</div>
          <div className="text-sm text-muted-foreground">
            Save your queries to quickly access them later
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedQueries.map((savedQuery, index) => (
            <Card 
              key={`saved-query-${index}`} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => loadQuery(savedQuery.query)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{savedQuery.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">{savedQuery.query.schema}.{savedQuery.query.table}</span>
                  {' • '}
                  {savedQuery.query.columns.length} columns
                  {' • '}
                  {savedQuery.query.conditionGroup.conditions.length} conditions
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Update the getRelatedTables function to focus on patient_mrn joins
  const getRelatedTables = (currentTable: Table): { table: Table, relationship: ForeignKey, id: string }[] => {
    if (!currentTable) return [];
    
    const relatedTables: { table: Table, relationship: ForeignKey, id: string }[] = [];
    
    // If the current table has patient_mrn, we can join with other tables that have patient_mrn
    const hasPatientMrn = currentTable.columns.some(col => col.name === 'patient_mrn');
    
    if (hasPatientMrn) {
      // Find all tables that have patient_mrn
      tables.forEach((table, tableIndex) => {
        // Skip the current table
        if (table.schema === currentTable.schema && table.name === currentTable.name) {
          return;
        }
        
        // Check if this table has patient_mrn
        const hasPatientMrnColumn = table.columns.some(col => col.name === 'patient_mrn');
        
        if (hasPatientMrnColumn) {
          relatedTables.push({
            table,
            relationship: {
              columnName: 'patient_mrn',
              foreignSchema: table.schema,
              foreignTable: table.name,
              foreignColumn: 'patient_mrn'
            },
            id: `patient-mrn-join-${table.schema}-${table.name}-${tableIndex}`
          });
        }
      });
    }
    
    // Add special case for omics_results -> omics_subjects
    if (currentTable.schema === 'laboratory' && currentTable.name === 'omics_results') {
      const omicsSubjectsTable = tables.find(t => 
        t.schema === 'laboratory' && t.name === 'omics_subjects'
      );
      
      if (omicsSubjectsTable) {
        relatedTables.push({
          table: omicsSubjectsTable,
          relationship: {
            columnName: 'subject_id',
            foreignSchema: 'laboratory',
            foreignTable: 'omics_subjects',
            foreignColumn: 'subject_id'
          },
          id: `subject-id-join-laboratory-omics_subjects`
        });
      }
    }
    
    // Add special case for omics_subjects -> omics_results
    if (currentTable.schema === 'laboratory' && currentTable.name === 'omics_subjects') {
      const omicsResultsTable = tables.find(t => 
        t.schema === 'laboratory' && t.name === 'omics_results'
      );
      
      if (omicsResultsTable) {
        relatedTables.push({
          table: omicsResultsTable,
          relationship: {
            columnName: 'subject_id',
            foreignSchema: 'laboratory',
            foreignTable: 'omics_results',
            foreignColumn: 'subject_id'
          },
          id: `subject-id-join-laboratory-omics_results`
        });
      }
    }
    
    // Remove duplicates
    const uniqueTables = relatedTables.reduce((acc, current) => {
      const x = acc.find(item => 
        item.table.schema === current.table.schema && 
        item.table.name === current.table.name
      );
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, [] as { table: Table, relationship: ForeignKey, id: string }[]);
    
    return uniqueTables;
  };

  // Update the renderJoins function to use the unique IDs
  const renderJoins = () => {
    if (!selectedTable) return null;

    const currentTable = tables.find(t => t.name === selectedTable && t.schema === selectedSchema);
    if (!currentTable) return null;

    const relatedTables = getRelatedTables(currentTable);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Join Tables</h3>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                <h4 className="text-sm font-medium text-blue-700">Joining Tables</h4>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <p>Tables in this database are primarily connected through <code className="bg-blue-100 px-1 rounded">patient_mrn</code>, which allows you to link patient data across different tables.</p>
                
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>All <strong>clinical</strong> tables can be joined with <code className="bg-blue-100 px-1 rounded">phi.patients</code> via <code className="bg-blue-100 px-1 rounded">patient_mrn</code></li>
                  <li>Clinical tables can be joined with each other via <code className="bg-blue-100 px-1 rounded">patient_mrn</code></li>
                  <li><code className="bg-blue-100 px-1 rounded">laboratory.omics_subjects</code> and <code className="bg-blue-100 px-1 rounded">laboratory.omics_results</code> are linked via <code className="bg-blue-100 px-1 rounded">subject_id</code></li>
                </ul>
                
                <p className="mt-2"><strong>Example:</strong> To analyze lab results with patient demographics:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Select <code className="bg-blue-100 px-1 rounded">clinical.Labs</code> as your main table</li>
                  <li>Join with <code className="bg-blue-100 px-1 rounded">phi.patients</code> via <code className="bg-blue-100 px-1 rounded">patient_mrn</code></li>
                  <li>Join with <code className="bg-blue-100 px-1 rounded">clinical.demographics</code> via <code className="bg-blue-100 px-1 rounded">patient_mrn</code></li>
                </ol>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-medium">Related Tables</h4>
                <span className="text-xs text-muted-foreground">
                  (based on common join fields)
                </span>
              </div>
              
              {relatedTables.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedTables.map(({ table, relationship, id }) => (
                    <Card
                      key={id}
                      className={`cursor-pointer hover:border-primary transition-colors ${
                        joins.some(j => j.schema === table.schema && j.table === table.name)
                          ? 'border-primary bg-primary/5'
                          : ''
                      }`}
                      onClick={() => {
                        // Add join with pre-populated condition based on the relationship
                        const newJoin: TableJoin = {
                          schema: table.schema,
                          table: table.name,
                          type: 'INNER',
                          conditions: [{
                            leftColumn: relationship.columnName,
                            rightColumn: relationship.foreignColumn
                          }]
                        };
                        
                        setJoins(prev => [...prev, newJoin]);
                        setQueryDefinition(prev => ({
                          ...prev,
                          joins: [...prev.joins, newJoin]
                        }));
                      }}
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Table2 className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">
                              {table.schema}.{table.name}
                            </CardTitle>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Joins on {relationship.columnName} = {relationship.foreignColumn}
                        </p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border rounded-md bg-muted/20">
                  <p className="text-sm text-muted-foreground">No related tables found based on common join fields.</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <h4 className="text-sm font-medium">Custom Join</h4>
                <span className="text-xs text-muted-foreground">
                  (select any other table)
                </span>
              </div>

              <div className="flex items-center gap-4">
                <Select
                  value={selectedJoinSchema}
                  onValueChange={setSelectedJoinSchema}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(tables.map(t => t.schema))).map(schema => (
                      <SelectItem key={schema} value={schema}>
                        {schema}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedJoinTable}
                  onValueChange={setSelectedJoinTable}
                  disabled={!selectedJoinSchema}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables
                      .filter(t => t.schema === selectedJoinSchema)
                      .map(table => (
                        <SelectItem key={table.name} value={table.name}>
                          {table.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addJoin}
                  disabled={!selectedJoinTable}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Custom Join
                </Button>
              </div>
            </div>
          </Card>

          {joins.map((join, joinIndex) => (
            <Card key={`join-${joinIndex}`} className="p-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <Select
                    value={join.type}
                    onValueChange={(value) => updateJoinType(joinIndex, value as 'INNER' | 'LEFT' | 'RIGHT')}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INNER">INNER JOIN</SelectItem>
                      <SelectItem value="LEFT">LEFT JOIN</SelectItem>
                      <SelectItem value="RIGHT">RIGHT JOIN</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-medium">{join.schema}.{join.table}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeJoin(joinIndex)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {join.conditions.map((condition, conditionIndex) => (
                  <div key={`join-${joinIndex}-condition-${conditionIndex}`} className="flex items-center gap-2">
                    <Select
                      value={condition.leftColumn}
                      onValueChange={(value) => updateJoinCondition(joinIndex, conditionIndex, 'leftColumn', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(column => (
                          <SelectItem key={column.name} value={column.name}>
                            {column.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>=</span>
                    <Select
                      value={condition.rightColumn}
                      onValueChange={(value) => updateJoinCondition(joinIndex, conditionIndex, 'rightColumn', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables
                          .find(t => t.schema === join.schema && t.name === join.table)
                          ?.columns.map(column => (
                            <SelectItem key={column.name} value={column.name}>
                              {column.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeJoinCondition(joinIndex, conditionIndex)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addJoinCondition(joinIndex)}
                  className="mt-2"
                >
                  Add Join Condition
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Add function to handle adding a join
  const addJoin = () => {
    if (!selectedJoinTable || !selectedJoinSchema) return;

    const newJoin: TableJoin = {
      schema: selectedJoinSchema,
      table: selectedJoinTable,
      type: 'INNER',
      conditions: []
    };

    setJoins(prev => [...prev, newJoin]);
    setQueryDefinition(prev => ({
      ...prev,
      joins: [...prev.joins, newJoin]
    }));

    setSelectedJoinTable('');
    setSelectedJoinSchema('');
  };

  // Add function to handle removing a join
  const removeJoin = (index: number) => {
    setJoins(prev => prev.filter((_, i) => i !== index));
    setQueryDefinition(prev => ({
      ...prev,
      joins: prev.joins.filter((_, i) => i !== index)
    }));
  };

  // Add function to update join type
  const updateJoinType = (index: number, type: 'INNER' | 'LEFT' | 'RIGHT') => {
    setJoins(prev => prev.map((join, i) => 
      i === index ? { ...join, type } : join
    ));
    setQueryDefinition(prev => ({
      ...prev,
      joins: prev.joins.map((join, i) => 
        i === index ? { ...join, type } : join
      )
    }));
  };

  // Add function to update join condition
  const updateJoinCondition = (
    joinIndex: number,
    conditionIndex: number,
    field: 'leftColumn' | 'rightColumn',
    value: string
  ) => {
    setJoins(prev => prev.map((join, i) => 
      i === joinIndex 
        ? { 
            ...join, 
            conditions: join.conditions.map((cond, ci) =>
              ci === conditionIndex
                ? { ...cond, [field]: value }
                : cond
            )
          }
        : join
    ));
    setQueryDefinition(prev => ({
      ...prev,
      joins: prev.joins.map((join, i) => 
        i === joinIndex 
          ? { 
              ...join, 
              conditions: join.conditions.map((cond, ci) =>
                ci === conditionIndex
                  ? { ...cond, [field]: value }
                  : cond
              )
            }
          : join
      )
    }));
  };

  // Add function to add join condition
  const addJoinCondition = (joinIndex: number) => {
    const newCondition: JoinCondition = {
      leftColumn: '',
      rightColumn: ''
    };

    setJoins(prev => prev.map((join, i) => 
      i === joinIndex 
        ? { 
            ...join, 
            conditions: [...join.conditions, newCondition]
          }
        : join
    ));
    setQueryDefinition(prev => ({
      ...prev,
      joins: prev.joins.map((join, i) => 
        i === joinIndex 
          ? { 
              ...join, 
              conditions: [...join.conditions, newCondition]
            }
          : join
      )
    }));
  };

  // Add function to remove join condition
  const removeJoinCondition = (joinIndex: number, conditionIndex: number) => {
    setJoins(prev => prev.map((join, i) => 
      i === joinIndex 
        ? { 
            ...join, 
            conditions: join.conditions.filter((_, ci) => ci !== conditionIndex)
          }
        : join
    ));
    setQueryDefinition(prev => ({
      ...prev,
      joins: prev.joins.map((join, i) => 
        i === joinIndex 
          ? { 
              ...join, 
              conditions: join.conditions.filter((_, ci) => ci !== conditionIndex)
            }
          : join
      )
    }));
  };

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="builder" className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-1">
              <Table2 className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="sql" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              SQL
            </TabsTrigger>
          </TabsList>
          
          {selectedTable && selectedColumns.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveQuery}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                Save Query
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={previewSql}
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                Preview SQL
              </Button>
              
              <Button
                size="sm"
                onClick={executeQuery}
                className="flex items-center gap-1"
                disabled={isLoading}
              >
                {isLoading ? 'Running...' : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Query
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
        
        <TabsContent value="builder" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {renderTableSelection()}
              
              {selectedTable && (
                <>
                  <Separator className="my-6" />
                  {renderJoins()}
                  
                  <Separator className="my-6" />
                  {renderColumnSelection()}
                  
                  <Separator className="my-6" />
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Filter className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Build your query</h3>
                    </div>
                    {renderConditionGroup(queryDefinition.conditionGroup)}
                  </div>
                </>
              )}
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
                  {error}
                </div>
              )}
            </div>
            
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Saved Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderSavedQueries()}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="results" className="mt-0">
          {renderQueryResults()}
        </TabsContent>
        
        <TabsContent value="sql" className="mt-0">
          {renderSqlPreview()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueryBuilder; 
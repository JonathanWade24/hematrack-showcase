# SQL Query Builder Implementation

## Overview

The SQL query builder is responsible for converting the user's query definition into a valid SQL query that can be executed against the database. It needs to handle table selection, joins, column selection, conditions, and pagination.

## Components

### 1. Query Definition Interface

```typescript
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

interface TableJoin {
  schema: string;
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT';
  conditions: JoinCondition[];
}

interface JoinCondition {
  leftColumn: string;
  rightColumn: string;
}

interface ConditionGroup {
  id: string;
  logicalOperator: 'AND' | 'OR';
  conditions: Condition[];
  groups: ConditionGroup[];
}

interface Condition {
  id: string;
  column: string;
  operator: Operator;
  value: string;
}

type Operator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
```

### 2. Main Query Builder Function

```typescript
function buildSqlQuery(queryDefinition: QueryDefinition): { sql: string; params: unknown[] } {
  // 1. Validate inputs
  // 2. Set up table aliases
  // 3. Process columns
  // 4. Build FROM clause
  // 5. Build JOIN clauses
  // 6. Build WHERE clause
  // 7. Build ORDER BY clause
  // 8. Add LIMIT and OFFSET
  // 9. Return SQL and parameters
}
```

### 3. Table Alias Management

To avoid ambiguity in column references, we'll use table aliases:

```typescript
// Track all tables in the query for column disambiguation
const tableAliases: Record<string, string> = {
  [`${schema}.${table}`]: 't0'
};
let aliasCounter = 1;

// Process joins and create aliases
const processedJoins = joins?.map(join => {
  const joinAlias = `t${aliasCounter++}`;
  tableAliases[`${join.schema}.${join.table}`] = joinAlias;
  
  return {
    ...join,
    alias: joinAlias
  };
}) || [];
```

### 4. Column Processing

Handle prefixed column names (e.g., "patients.first_name"):

```typescript
const processedColumns = columns.map(column => {
  // Check if column is prefixed with table name
  if (column.includes('.')) {
    const [tableName, columnName] = column.split('.');
    
    // Find the table alias
    let tableAlias = '';
    if (tableName === table) {
      tableAlias = 't0';
    } else {
      const joinEntry = processedJoins.find(j => j.table === tableName);
      if (joinEntry) {
        tableAlias = joinEntry.alias;
      }
    }
    
    return {
      tableAlias,
      columnName,
      fullName: `"${tableAlias}"."${columnName}"`
    };
  } else {
    // Non-prefixed column, assume it's from the main table
    return {
      tableAlias: 't0',
      columnName: column,
      fullName: `"t0"."${column}"`
    };
  }
});
```

### 5. WHERE Clause Builder

Handle conditions with proper table aliases:

```typescript
function buildWhereClause(
  group: ConditionGroup, 
  tableAliases: Record<string, string>,
  paramIndex = 0
): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [];
  
  // Process conditions
  const conditionSqls = group.conditions.map(condition => {
    // Handle prefixed column names
    let tableAlias = 't0'; // Default to main table
    let columnName = condition.column;
    
    if (condition.column.includes('.')) {
      const [tableName, colName] = condition.column.split('.');
      columnName = colName;
      
      // Find the table alias
      const tableKey = Object.keys(tableAliases).find(key => key.endsWith(`.${tableName}`));
      if (tableKey) {
        tableAlias = tableAliases[tableKey];
      }
    }
    
    // Build condition SQL based on operator
    switch (condition.operator) {
      case 'equals':
        params.push(condition.value);
        return `"${tableAlias}"."${columnName}" = $${++paramIndex}`;
      // ... other operators
    }
  });
  
  // Process nested groups recursively
  const nestedGroupResults = group.groups.map(nestedGroup => {
    const result = buildWhereClause(nestedGroup, tableAliases, paramIndex + params.length);
    params.push(...result.params);
    paramIndex += result.params.length;
    return result.whereSql;
  });
  
  // Combine conditions and nested groups
  const allConditions = [...conditionSqls, ...nestedGroupResults];
  
  if (allConditions.length === 0) {
    return { whereSql: '', params: [] };
  }
  
  const whereSql = `(${allConditions.join(` ${group.logicalOperator} `)})`;
  
  return { whereSql, params };
}
```

## Implementation Steps

### 1. Create the API Route

Create a new file at `src/app/api/query/execute/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define validation schemas
const OperatorSchema = z.enum([
  'equals', 'not_equals', 'contains', 'not_contains', 
  'greater_than', 'less_than', 'in', 'not_in', 
  'is_null', 'is_not_null'
]);

const ConditionSchema = z.object({
  id: z.string(),
  column: z.string(),
  operator: OperatorSchema,
  value: z.string(),
});

// Define recursive ConditionGroupSchema
const ConditionGroupSchema: z.ZodType<any> = z.lazy(() => 
  z.object({
    id: z.string(),
    logicalOperator: z.enum(['AND', 'OR']),
    conditions: z.array(ConditionSchema),
    groups: z.array(ConditionGroupSchema),
  })
);

const JoinConditionSchema = z.object({
  leftColumn: z.string(),
  rightColumn: z.string(),
});

const TableJoinSchema = z.object({
  schema: z.string(),
  table: z.string(),
  type: z.enum(['INNER', 'LEFT', 'RIGHT']),
  conditions: z.array(JoinConditionSchema),
});

const OrderBySchema = z.array(
  z.object({
    column: z.string(),
    direction: z.enum(['asc', 'desc']),
  })
).optional();

const QueryDefinitionSchema = z.object({
  table: z.string(),
  schema: z.string(),
  joins: z.array(TableJoinSchema).optional(),
  columns: z.array(z.string()),
  conditionGroup: ConditionGroupSchema,
  orderBy: OrderBySchema,
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const queryDefinition = QueryDefinitionSchema.parse(body);
    
    // Build SQL query from query definition
    const { sql, params } = buildSqlQuery(queryDefinition);
    
    // Execute the query
    const results = await prisma.$queryRawUnsafe(sql, ...params);
    
    // Return the results
    return NextResponse.json({
      results,
      sql
    }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute query';
    console.error('Error executing query:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Implement buildSqlQuery and buildWhereClause functions
// ...
```

### 2. Implement the buildSqlQuery Function

```typescript
function buildSqlQuery(queryDefinition: z.infer<typeof QueryDefinitionSchema>) {
  const { table, schema, columns, joins, conditionGroup, orderBy, limit, offset } = queryDefinition;
  
  // Validate table and schema names to prevent SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(schema)) {
    throw new Error('Invalid table or schema name');
  }
  
  // Track all tables in the query for column disambiguation
  const tableAliases: Record<string, string> = {
    [`${schema}.${table}`]: 't0'
  };
  let aliasCounter = 1;
  
  // Process joins and create aliases
  const processedJoins = joins?.map(join => {
    // Validate join table and schema
    if (!/^[a-zA-Z0-9_]+$/.test(join.table) || !/^[a-zA-Z0-9_]+$/.test(join.schema)) {
      throw new Error('Invalid join table or schema name');
    }
    
    // Create alias for this join
    const joinAlias = `t${aliasCounter++}`;
    tableAliases[`${join.schema}.${join.table}`] = joinAlias;
    
    return {
      ...join,
      alias: joinAlias
    };
  }) || [];
  
  // Process columns to handle prefixed names
  const processedColumns = columns.map(column => {
    // Check if column is prefixed with table name
    if (column.includes('.')) {
      const [tableName, columnName] = column.split('.');
      
      // Find the table alias
      let tableAlias = '';
      if (tableName === table) {
        tableAlias = 't0';
      } else {
        const joinEntry = processedJoins.find(j => j.table === tableName);
        if (joinEntry) {
          tableAlias = joinEntry.alias;
        }
      }
      
      // Validate column name
      if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
        throw new Error(`Invalid column name: ${columnName}`);
      }
      
      return {
        tableAlias,
        columnName,
        fullName: `"${tableAlias}"."${columnName}"`
      };
    } else {
      // Non-prefixed column, assume it's from the main table
      // Validate column name
      if (!/^[a-zA-Z0-9_]+$/.test(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      
      return {
        tableAlias: 't0',
        columnName: column,
        fullName: `"t0"."${column}"`
      };
    }
  });
  
  // Start building the SQL query
  let sql = `SELECT `;
  
  // Add selected columns or * if none specified
  if (processedColumns.length > 0) {
    sql += processedColumns.map(col => `${col.fullName} AS "${col.columnName}"`).join(', ');
  } else {
    sql += `"t0".*`;
  }
  
  sql += ` FROM "${schema}"."${table}" AS "t0"`;
  
  // Add joins
  if (processedJoins.length > 0) {
    processedJoins.forEach(join => {
      // Validate join conditions
      join.conditions.forEach(condition => {
        if (
          !/^[a-zA-Z0-9_]+$/.test(condition.leftColumn) || 
          !/^[a-zA-Z0-9_]+$/.test(condition.rightColumn)
        ) {
          throw new Error('Invalid join column name');
        }
      });

      // Build join clause
      sql += ` ${join.type} JOIN "${join.schema}"."${join.table}" AS "${join.alias}" ON ${
        join.conditions.map(condition => 
          `"t0"."${condition.leftColumn}" = "${join.alias}"."${condition.rightColumn}"`
        ).join(' AND ')
      }`;

      // Add columns from joined table if no specific columns are selected
      if (processedColumns.length === 0) {
        sql = sql.replace(
          /SELECT (.*?) FROM/,
          `SELECT $1, "${join.alias}".* FROM`
        );
      }
    });
  }
  
  // Build WHERE clause
  const { whereSql, params } = buildWhereClause(conditionGroup, tableAliases);
  if (whereSql) {
    sql += ` WHERE ${whereSql}`;
  }
  
  // Add ORDER BY clause
  if (orderBy && orderBy.length > 0) {
    const orderByClauses = orderBy.map(order => {
      if (!/^[a-zA-Z0-9_]+$/.test(order.column)) {
        throw new Error(`Invalid column name in ORDER BY: ${order.column}`);
      }
      return `"t0"."${order.column}" ${order.direction.toUpperCase()}`;
    });
    sql += ` ORDER BY ${orderByClauses.join(', ')}`;
  }
  
  // Add LIMIT and OFFSET
  if (limit !== undefined && limit > 0) {
    sql += ` LIMIT ${limit}`;
  } else {
    // Default limit to prevent returning too many rows
    sql += ' LIMIT 1000';
  }
  
  if (offset !== undefined && offset > 0) {
    sql += ` OFFSET ${offset}`;
  }
  
  return { sql, params };
}
```

### 3. Implement the buildWhereClause Function

```typescript
function buildWhereClause(
  group: ConditionGroupType, 
  tableAliases: Record<string, string> = { 'main': 't0' }, 
  paramIndex = 0
): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [];
  
  // Process conditions
  const conditionSqls = group.conditions.map(condition => {
    // Check if column is prefixed with table name
    let tableAlias = 't0'; // Default to main table
    let columnName = condition.column;
    
    if (condition.column.includes('.')) {
      const [tableName, colName] = condition.column.split('.');
      columnName = colName;
      
      // Find the table alias
      const tableKey = Object.keys(tableAliases).find(key => key.endsWith(`.${tableName}`));
      if (tableKey) {
        tableAlias = tableAliases[tableKey];
      }
    }
    
    // Validate column name
    if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
      throw new Error(`Invalid column name in condition: ${columnName}`);
    }
    
    switch (condition.operator) {
      case 'equals':
        params.push(condition.value);
        return `"${tableAlias}"."${columnName}" = $${++paramIndex}`;
      case 'not_equals':
        params.push(condition.value);
        return `"${tableAlias}"."${columnName}" <> $${++paramIndex}`;
      case 'contains':
        params.push(`%${condition.value}%`);
        return `"${tableAlias}"."${columnName}" ILIKE $${++paramIndex}`;
      case 'not_contains':
        params.push(`%${condition.value}%`);
        return `"${tableAlias}"."${columnName}" NOT ILIKE $${++paramIndex}`;
      case 'greater_than':
        params.push(condition.value);
        return `"${tableAlias}"."${columnName}" > $${++paramIndex}`;
      case 'less_than':
        params.push(condition.value);
        return `"${tableAlias}"."${columnName}" < $${++paramIndex}`;
      case 'in':
        const values = condition.value.split(',').map(v => v.trim());
        params.push(values);
        return `"${tableAlias}"."${columnName}" = ANY($${++paramIndex})`;
      case 'not_in':
        const notValues = condition.value.split(',').map(v => v.trim());
        params.push(notValues);
        return `"${tableAlias}"."${columnName}" != ALL($${++paramIndex})`;
      case 'is_null':
        return `"${tableAlias}"."${columnName}" IS NULL`;
      case 'is_not_null':
        return `"${tableAlias}"."${columnName}" IS NOT NULL`;
      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }
  });
  
  // Process nested groups
  const nestedGroupResults = group.groups.map(nestedGroup => {
    const result = buildWhereClause(nestedGroup, tableAliases, paramIndex + params.length);
    params.push(...result.params);
    paramIndex += result.params.length;
    return result.whereSql;
  });
  
  // Combine conditions and nested groups
  const allConditions = [...conditionSqls, ...nestedGroupResults];
  
  if (allConditions.length === 0) {
    return { whereSql: '', params: [] };
  }
  
  const whereSql = `(${allConditions.join(` ${group.logicalOperator} `)})`;
  
  return { whereSql, params };
}
```

## Testing Strategy

1. Unit test the buildSqlQuery function with various inputs
2. Test with simple queries first
3. Test with joins
4. Test with complex conditions
5. Test with edge cases (NULL values, empty conditions, etc.)
6. Integration test with the frontend 
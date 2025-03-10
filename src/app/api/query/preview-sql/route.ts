import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define schemas for validation (same as in execute route)
const OperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'in',
  'not_in',
  'is_null',
  'is_not_null'
]);

const ConditionSchema = z.object({
  id: z.string(),
  column: z.string(),
  operator: OperatorSchema,
  value: z.string()
});

// Use type recursion for ConditionGroupSchema
type ConditionGroupType = {
  id: string;
  logicalOperator: 'AND' | 'OR';
  conditions: Array<{
    id: string;
    column: string;
    operator: z.infer<typeof OperatorSchema>;
    value: string;
  }>;
  groups: ConditionGroupType[];
};

const ConditionGroupSchema: z.ZodType<ConditionGroupType> = z.lazy(() => 
  z.object({
    id: z.string(),
    logicalOperator: z.enum(['AND', 'OR']),
    conditions: z.array(ConditionSchema),
    groups: z.array(ConditionGroupSchema)
  })
);

const OrderBySchema = z.array(
  z.object({
    column: z.string(),
    direction: z.enum(['asc', 'desc'])
  })
).optional();

const QueryDefinitionSchema = z.object({
  table: z.string(),
  schema: z.string(),
  columns: z.array(z.string()),
  conditionGroup: ConditionGroupSchema,
  orderBy: OrderBySchema,
  limit: z.number().optional(),
  offset: z.number().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const queryDefinition = QueryDefinitionSchema.parse(body);
    
    // Build the SQL query
    const { sql, params } = buildSqlQuery(queryDefinition);
    
    // Format the SQL query with parameter values for preview
    const formattedSql = formatSqlWithParams(sql, params);
    
    return NextResponse.json({ 
      sql: formattedSql
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating SQL preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate SQL preview';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to build SQL query from query definition
function buildSqlQuery(queryDefinition: z.infer<typeof QueryDefinitionSchema>) {
  const { table, schema, columns, conditionGroup, orderBy, limit, offset } = queryDefinition;
  
  // Validate table and schema names to prevent SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(schema)) {
    throw new Error('Invalid table or schema name');
  }
  
  // Validate column names
  for (const column of columns) {
    if (!/^[a-zA-Z0-9_]+$/.test(column)) {
      throw new Error(`Invalid column name: ${column}`);
    }
  }
  
  // Start building the SQL query
  let sql = `SELECT ${columns.length > 0 ? columns.map(c => `"${c}"`).join(', ') : '*'} FROM "${schema}"."${table}"`;
  
  // Build WHERE clause
  const { whereSql, params } = buildWhereClause(conditionGroup);
  if (whereSql) {
    sql += ` WHERE ${whereSql}`;
  }
  
  // Add ORDER BY clause
  if (orderBy && orderBy.length > 0) {
    const orderByClauses = orderBy.map(order => {
      if (!/^[a-zA-Z0-9_]+$/.test(order.column)) {
        throw new Error(`Invalid column name in ORDER BY: ${order.column}`);
      }
      return `"${order.column}" ${order.direction.toUpperCase()}`;
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

// Helper function to build WHERE clause
function buildWhereClause(group: ConditionGroupType, paramIndex = 0): { whereSql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  
  // Process conditions
  for (const condition of group.conditions) {
    const { column, operator, value } = condition;
    
    // Validate column name
    if (!/^[a-zA-Z0-9_]+$/.test(column)) {
      throw new Error(`Invalid column name in condition: ${column}`);
    }
    
    let conditionSql = '';
    
    switch (operator) {
      case 'equals':
        conditionSql = `"${column}" = $${paramIndex + 1}`;
        params.push(value);
        paramIndex++;
        break;
      case 'not_equals':
        conditionSql = `"${column}" <> $${paramIndex + 1}`;
        params.push(value);
        paramIndex++;
        break;
      case 'contains':
        conditionSql = `"${column}" ILIKE $${paramIndex + 1}`;
        params.push(`%${value}%`);
        paramIndex++;
        break;
      case 'not_contains':
        conditionSql = `"${column}" NOT ILIKE $${paramIndex + 1}`;
        params.push(`%${value}%`);
        paramIndex++;
        break;
      case 'greater_than':
        conditionSql = `"${column}" > $${paramIndex + 1}`;
        params.push(value);
        paramIndex++;
        break;
      case 'less_than':
        conditionSql = `"${column}" < $${paramIndex + 1}`;
        params.push(value);
        paramIndex++;
        break;
      case 'in':
        // Split comma-separated values
        const inValues = value.split(',').map((v: string) => v.trim());
        const placeholders = inValues.map((_: string, i: number) => `$${paramIndex + 1 + i}`).join(', ');
        conditionSql = `"${column}" IN (${placeholders})`;
        params.push(...inValues);
        paramIndex += inValues.length;
        break;
      case 'not_in':
        // Split comma-separated values
        const notInValues = value.split(',').map((v: string) => v.trim());
        const notInPlaceholders = notInValues.map((_: string, i: number) => `$${paramIndex + 1 + i}`).join(', ');
        conditionSql = `"${column}" NOT IN (${notInPlaceholders})`;
        params.push(...notInValues);
        paramIndex += notInValues.length;
        break;
      case 'is_null':
        conditionSql = `"${column}" IS NULL`;
        break;
      case 'is_not_null':
        conditionSql = `"${column}" IS NOT NULL`;
        break;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
    
    conditions.push(conditionSql);
  }
  
  // Process nested groups
  for (const nestedGroup of group.groups) {
    const { whereSql, params: nestedParams } = buildWhereClause(nestedGroup, paramIndex);
    if (whereSql) {
      conditions.push(`(${whereSql})`);
      params.push(...nestedParams);
      paramIndex += nestedParams.length;
    }
  }
  
  // Combine conditions with logical operator
  const whereSql = conditions.length > 0 ? conditions.join(` ${group.logicalOperator} `) : '';
  
  return { whereSql, params };
}

// Helper function to format SQL with parameter values for preview
function formatSqlWithParams(sql: string, params: unknown[]): string {
  let formattedSql = sql;
  
  // Replace parameter placeholders with actual values
  for (let i = 0; i < params.length; i++) {
    const paramValue = typeof params[i] === 'string' 
      ? `'${(params[i] as string).replace(/'/g, "''")}'` // Escape single quotes in string values
      : params[i];
    
    formattedSql = formattedSql.replace(`$${i + 1}`, String(paramValue));
  }
  
  return formattedSql;
} 
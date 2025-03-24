import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Define schemas for validation
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
  joins: z.array(z.object({
    type: z.enum(['INNER', 'LEFT', 'RIGHT', 'FULL']),
    table: z.string(),
    schema: z.string(),
    conditions: z.array(z.object({
      leftColumn: z.string(),
      rightColumn: z.string()
    }))
  })).optional(),
  conditionGroup: ConditionGroupSchema,
  orderBy: OrderBySchema,
  limit: z.number().optional(),
  offset: z.number().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const queryDefinition = QueryDefinitionSchema.parse(body);
    
    // Build query parameters from query definition
    const { table, schema, columns, conditionGroup, orderBy, limit = 1000, offset = 0 } = queryDefinition;
    
    // Create a schema-specific client with the correct schema set
    const cookieStore = await cookies();
    const schemaClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => 
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
        db: {
          schema: schema // This explicitly sets the schema
        }
      }
    );
    
    // Set up query with selected table
    const query = schemaClient
      .from(table)
      .select(columns.join(','))
      .limit(limit);
    
    // Add range for pagination instead of using offset directly
    if (offset > 0) {
      query.range(offset, offset + limit - 1);
    }
    
    // Add filter conditions - for simple conditions only
    // Note: Complex conditions require more advanced handling
    // This is a simplified implementation
    if (conditionGroup.conditions.length > 0) {
      conditionGroup.conditions.forEach(condition => {
        switch (condition.operator) {
          case 'equals':
            query.eq(condition.column, condition.value);
            break;
          case 'not_equals':
            query.neq(condition.column, condition.value);
            break;
          case 'contains':
            query.ilike(condition.column, `%${condition.value}%`);
            break;
          case 'not_contains':
            query.not(condition.column, 'ilike', `%${condition.value}%`);
            break;
          case 'greater_than':
            query.gt(condition.column, condition.value);
            break;
          case 'less_than':
            query.lt(condition.column, condition.value);
            break;
          case 'is_null':
            query.is(condition.column, null);
            break;
          case 'is_not_null':
            query.not(condition.column, 'is', null);
            break;
          // Other cases would need implementation
        }
      });
    }
    
    // Add ordering
    if (orderBy && orderBy.length > 0) {
      orderBy.forEach(order => {
        query.order(order.column, { ascending: order.direction === 'asc' });
      });
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error executing query on ${schema}.${table}:`, error);
      throw error;
    }
    
    // Return the results
    return NextResponse.json({
      results: data,
      sql: `Query executed on ${schema}.${table} using Supabase query builder`
    }, { status: 200 });
  } catch (error) {
    // Fix error handling to avoid null payload
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute query';
    console.error('Error executing query:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
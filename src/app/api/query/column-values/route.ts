import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  QueryRequestSchema, 
  ColumnQueryExecutor, 
  isAllowedQuery, 
  TableNames
} from '@/lib/db/column-queries';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schema, table, column, search, limit } = QueryRequestSchema.parse(body);
    const typedSchema = schema as TableNames;

    // Check if the requested query is allowed
    if (!isAllowedQuery(typedSchema, table, column)) {
      return NextResponse.json(
        { error: 'Invalid schema, table, or column combination' },
        { status: 400 }
      );
    }

    // Create query executor and run the query
    const queryExecutor = new ColumnQueryExecutor(db);
    
    // Use the factory method to create a dynamic query
    const queryMethod = ColumnQueryExecutor.createQueryMethod(
      typedSchema,
      table,
      column
    );
    const results = await queryMethod.call(queryExecutor, { search, limit });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching column values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch column values' },
      { status: 500 }
    );
  }
} 
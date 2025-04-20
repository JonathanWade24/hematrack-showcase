import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schema = searchParams.get('schema');
    const table = searchParams.get('table');
    const column = searchParams.get('column');
    const search = searchParams.get('search');
    
    if (!schema || !table || !column) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn(`[GET /api/query/values] Supabase client not available for ${schema}.${table}.${column}. Returning empty placeholder.`);
        return NextResponse.json([]); // Return empty array as placeholder
    }
    
    // Build the query
    let queryBuilder = supabase
      .schema(schema)
      .from(table)
      .select(column)
      .order(column);
    
    // Add search filter if provided
    if (search) {
      queryBuilder = queryBuilder.ilike(column, `%${search}%`);
    }
    
    // Execute the query
    const { data: values, error } = await queryBuilder;
    
    if (error) {
      throw error;
    }
    
    // Extract unique values
    // Added explicit 'any' for v in map callback
    const uniqueValues = [...new Set(values?.map((v: any) => v[column as keyof typeof v]))]
      .filter((v): v is string | number => v !== null && (typeof v === 'string' || typeof v === 'number'))
      .sort();
    
    return NextResponse.json(uniqueValues);
  } catch (error) {
    console.error('Error fetching values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch values' },
      { status: 500 }
    );
  }
} 
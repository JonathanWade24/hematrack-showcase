import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Define the request schema
const ColumnValuesRequestSchema = z.object({
  schema: z.string(),
  table: z.string(),
  column: z.string(),
  search: z.string().optional(),
  limit: z.number().optional().default(100),
});

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
    
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Build the query
    let query = supabase
      .schema(schema)
      .from(table)
      .select(column)
      .order(column);
    
    // Add search filter if provided
    if (search) {
      query = query.ilike(column, `%${search}%`);
    }
    
    // Execute the query
    const { data: values, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Extract unique values
    const uniqueValues = [...new Set(values?.map(v => v[column as keyof typeof v]))]
      .filter((v): v is string | number => v !== null)
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
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Add GET handler to support API route with method override
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { message: 'Please use POST method for this endpoint' },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, table, columns, whereClause, orderBy, orderDirection, limit = 1000 } = body;
    
    // Validate inputs
    if (!schema || !table || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
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
    
    // Query directly from the table within the set schema
    const queryBuilder = schemaClient
      .from(table)
      .select(columns.join(','));
    
    // Add where clause if provided
    if (whereClause) {
      queryBuilder.or(whereClause);
    }
    
    // Add order by
    if (orderBy) {
      queryBuilder.order(orderBy, { ascending: orderDirection === 'asc' });
    }
    
    // Add limit
    queryBuilder.limit(limit);
    
    // Execute query
    const { data, error } = await queryBuilder;
    
    if (error) {
      console.error(`Error fetching data from ${schema}.${table}:`, error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data found' },
        { status: 404 }
      );
    }
    
    // Convert data to CSV
    const headers = columns.join(',');
    
    const rows = data.map((row) => {
      return columns.map(col => {
        const value = row[col];
        return formatValueForCSV(value);
      }).join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    
    // Return CSV as a blob
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${schema}_${table}_export_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  } catch (error) {
    console.error('Error processing download:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download data' },
      { status: 500 }
    );
  }
}

// Helper function to format values for CSV
function formatValueForCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
  if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  return String(value);
} 
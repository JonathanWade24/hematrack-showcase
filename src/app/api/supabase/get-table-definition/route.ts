import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { table_name, schema } = await request.json()
    
    if (!table_name) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      )
    }
    
    if (!schema) {
      return NextResponse.json(
        { error: 'Schema is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    try {
      // Create a client that's specifically set to use the requested schema
      const cookieStore = await cookies()
      const schemaClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => 
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
          db: {
            schema: schema
          }
        }
      )
      
      // First attempt: Try to query the table directly to get structure
      const { data, error } = await schemaClient
        .from(table_name)
        .select()
        .limit(1)
      
      if (error) {
        console.error('Error fetching table data with schema client:', error)
        
        // Second attempt: Try direct SQL query with schema
        try {
          // Since we can't use RPC, we'll use the REST API directly with our schema client
          const { data: metadataResponse, error: metadataError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_schema', schema)
            .eq('table_name', table_name)
            .order('ordinal_position')
          
          if (metadataError) {
            console.error('Error with metadata query:', metadataError)
          } else if (metadataResponse && metadataResponse.length > 0) {
            return NextResponse.json(metadataResponse)
          }
          
          return NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        } catch (sqlError) {
          console.error('Error with SQL approach:', sqlError)
          return NextResponse.json(
            { error: 'Could not retrieve table columns: ' + error.message },
            { status: 500 }
          )
        }
      }
      
      if (data && data.length > 0) {
        const extractedColumns = Object.keys(data[0]).map((column_name: string) => ({
          column_name,
          data_type: typeof data[0][column_name],
          is_nullable: data[0][column_name] === null ? 'YES' : 'NO',
          column_default: null
        }))
        
        return NextResponse.json(extractedColumns)
      } else {
        // No rows found - try to get column names from CSV
        const { data: csvData, error: csvError } = await schemaClient
          .from(table_name)
          .select()
          .limit(0)
          .csv()
        
        if (csvError) {
          console.error('Error fetching CSV headers:', csvError)
          return NextResponse.json(
            { error: csvError.message },
            { status: 500 }
          )
        }
        
        if (csvData) {
          const headerLine = csvData.split('\n')[0]
          const columnNames = headerLine.split(',')
          
          const extractedColumns = columnNames.map((column_name: string) => ({
            column_name,
            data_type: 'unknown',
            is_nullable: 'unknown',
            column_default: null
          }))
          
          return NextResponse.json(extractedColumns)
        }
        
        return NextResponse.json(
          { error: 'Empty table, cannot determine schema' },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Error in table definition API:', error)
      return NextResponse.json(
        { error: 'Could not retrieve table columns' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in get-table-definition API:', error)
    return NextResponse.json(
      { error: 'Failed to get table definition' },
      { status: 500 }
    )
  }
} 
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface QueryOptions {
  schema: string
  table: string
  columns: string[]
  where?: string
  orderBy?: string
  limit?: number
}

export async function POST(request: Request) {
  try {
    const data: QueryOptions = await request.json()
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Validate required fields
    if (!data.schema || !data.table || !data.columns || data.columns.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Build the query
    let query = supabase
      .schema(data.schema)
      .from(data.table)
      .select(data.columns.join(','))
    
    // Add where clause if provided
    if (data.where) {
      query = query.or(data.where)
    }
    
    // Add order by if provided
    if (data.orderBy) {
      const [column, direction] = data.orderBy.split(' ')
      query = query.order(column, { ascending: direction === 'asc' })
    }
    
    // Add limit if provided
    if (data.limit) {
      query = query.limit(data.limit)
    }
    
    // Execute the query
    const { data: results, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Error downloading data:', error)
    return NextResponse.json(
      { error: 'Failed to download data' },
      { status: 500 }
    )
  }
} 
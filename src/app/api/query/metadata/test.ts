/**
 * This is a simple test script to verify the metadata API.
 * You can run it with:
 * npx ts-node src/app/api/query/metadata/test.ts
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { PostgrestError } from '@supabase/supabase-js'

interface TableMetadata {
  schema: string
  name: string
  columns: Array<{
    name: string
    type: string
    isNumeric: boolean
  }>
  foreignKeys: Array<{
    columnName: string
    foreignSchema: string
    foreignTable: string
    foreignColumn: string
  }>
}

export async function getMetadata(): Promise<TableMetadata[]> {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data, error } = await supabase.rpc('get_schema_metadata', {
      target_schema: ['phi']
    })
    
    if (error) {
      throw error
    }
    
    return data as TableMetadata[]
  } catch (error: unknown) {
    if (error instanceof PostgrestError) {
      console.error('Error fetching metadata:', error.message)
    } else {
      console.error('Error fetching metadata:', error)
    }
    throw error
  }
}

async function testMetadataQuery(): Promise<void> {
  try {
    console.log('Testing metadata query...');
    const result = await getMetadata();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error: unknown) {
    if (error instanceof PostgrestError) {
      console.error('Error testing metadata query:', error.message)
    } else {
      console.error('Error testing metadata query:', error)
    }
  }
}

// Run the test
testMetadataQuery(); 
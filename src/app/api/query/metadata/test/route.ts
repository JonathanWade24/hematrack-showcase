import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get Supabase client
    const supabase = await createClient();
    
    // Execute a simplified version of the metadata query
    const { data, error } = await supabase.rpc('get_schema_metadata', {
      target_schemas: ['phi']  // Just test with phi schema for brevity
    });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metadata';
    console.error('Error fetching metadata:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 
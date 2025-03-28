import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get Supabase client
    const supabase = await createClient();
    
    // Get table metadata using Supabase's RPC function
    const { data: tables, error } = await supabase.rpc('get_table_metadata');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching table metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table metadata' },
      { status: 500 }
    );
  }
}
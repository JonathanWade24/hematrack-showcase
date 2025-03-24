import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
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
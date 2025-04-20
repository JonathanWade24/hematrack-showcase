import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Get Supabase client
    const supabase = await createClient()
    
    // Handle missing client
    if (!supabase) {
        console.warn('[GET /api/lab-components] Supabase client not available. Returning empty placeholder.');
        return NextResponse.json([]); // Return empty array as placeholder
    }
    
    const { data: components, error } = await supabase
      .from('labs')
      .select('lab_component_description')
      .order('lab_component_description')
    
    if (error) {
      throw error
    }
    
    // Get unique component descriptions
    const uniqueComponents = [...new Set(components.map((c: any) => c.lab_component_description))]
    
    return NextResponse.json(uniqueComponents)
  } catch (error) {
    console.error('Error fetching lab components:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lab components' },
      { status: 500 }
    )
  }
} 
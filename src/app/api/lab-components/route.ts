import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Get Supabase client
    const supabase = await createClient()
    
    const { data: components, error } = await supabase
      .from('labs')
      .select('lab_component_description')
      .order('lab_component_description')
    
    if (error) {
      throw error
    }
    
    // Get unique component descriptions
    const uniqueComponents = [...new Set(components.map(c => c.lab_component_description))]
    
    return NextResponse.json(uniqueComponents)
  } catch (error) {
    console.error('Error fetching lab components:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lab components' },
      { status: 500 }
    )
  }
} 
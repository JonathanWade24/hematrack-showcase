import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Get Supabase client
    const supabase = await createClient()
    
    const { data: medications, error } = await supabase
      .from('op_medications')
      .select('generic_description')
      .order('generic_description')
    
    if (error) {
      throw error
    }
    
    // Get unique medication descriptions
    const uniqueMedications = [...new Set(medications.map(m => m.generic_description))]
      .filter((desc): desc is string => desc !== null)
    
    return NextResponse.json(uniqueMedications)
  } catch (error) {
    console.error('Error fetching medications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    )
  }
} 
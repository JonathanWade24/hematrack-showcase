import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
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
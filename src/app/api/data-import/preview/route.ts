import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/db'
import { convertToNumber } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!type) {
      return NextResponse.json(
        { error: 'Data type is required' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()
    let data

    switch (type) {
      case 'demographics':
        const { data: patients, error: patientsError } = await supabase
          .schema('phi')
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
        
        if (patientsError) throw patientsError
        data = patients
        break

      case 'bonemarrow':
        const { data: boneMarrow, error: boneMarrowError } = await supabase
          .schema('clinical')
          .from('bone_marrow')
          .select('*')
          .order('result_time', { ascending: false })
          .limit(limit)
        
        if (boneMarrowError) throw boneMarrowError
        data = boneMarrow
        break

      case 'ipadmissions':
        const { data: ipAdmissions, error: ipAdmissionsError } = await supabase
          .schema('clinical')
          .from('ip_admissions')
          .select('*')
          .order('adm_date_time', { ascending: false })
          .limit(limit)
        
        if (ipAdmissionsError) throw ipAdmissionsError
        data = ipAdmissions
        break

      case 'opavsmeds':
        const { data: opMeds, error: opMedsError } = await supabase
          .schema('clinical')
          .from('op_medications')
          .select('*')
          .order('visit_date', { ascending: false })
          .limit(limit)
        
        if (opMedsError) throw opMedsError
        data = opMeds
        break

      case 'opvisits':
        const { data: opVisits, error: opVisitsError } = await supabase
          .schema('clinical')
          .from('op_visits')
          .select('*')
          .order('visit_date', { ascending: false })
          .limit(limit)
        
        if (opVisitsError) throw opVisitsError
        data = opVisits
        break

      case 'ipmeds':
        const { data: ipMeds, error: ipMedsError } = await supabase
          .schema('clinical')
          .from('ip_medications')
          .select('*')
          .order('adm_date_time', { ascending: false })
          .limit(limit)
        
        if (ipMedsError) throw ipMedsError
        data = ipMeds
        break

      case 'labs':
        const { data: labs, error: labsError } = await supabase
          .schema('clinical')
          .from('Labs')
          .select('*')
          .order('result_time', { ascending: false })
          .limit(limit)
        
        if (labsError) throw labsError
        data = labs
        break

      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ data: convertToNumber(data) })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch preview data' },
      { status: 500 }
    )
  }
} 
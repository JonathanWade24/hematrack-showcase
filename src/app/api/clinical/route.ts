import { NextResponse } from 'next/server'
import { getSupabaseClient, getSupabaseAdminClient } from '@/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mrn = searchParams.get('mrn')
    const dataType = searchParams.get('type') || 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!mrn) {
      return NextResponse.json({ error: 'MRN is required' }, { status: 400 })
    }

    // Get supabase clients
    const phiClient = await getSupabaseAdminClient()

    // Get patient info
    const { data: patient, error: patientError } = await phiClient
      .from('patients')
      .select(`
        patient_mrn, 
        first_name, 
        last_name, 
        birth_date, 
        sex, 
        race, 
        ethnicity
      `)
      .eq('patient_mrn', mrn)
      .single()

    if (patientError) {
      console.error('Error fetching patient:', patientError)
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Fetch clinical data based on type
    const clinicalData = []
    const clinicalClient = await getSupabaseClient()

    if (dataType === 'all' || dataType === 'admissions') {
      let query = clinicalClient
        .from('ip_admissions')
        .select('*')
        .eq('patient_mrn', mrn)
        .order('adm_date_time', { ascending: false })
      
      if (startDate) {
        query = query.gte('adm_date_time', startDate)
      }
      
      if (endDate) {
        query = query.lte('adm_date_time', endDate)
      }
      
      const { data: admissions, error: admissionsError } = await query
      
      if (!admissionsError && admissions) {
        clinicalData.push(...admissions.map(admission => ({
          ...admission,
          type: 'admission'
        })))
      }
    }

    if (dataType === 'all' || dataType === 'visits') {
      let query = clinicalClient
        .from('op_visits')
        .select('*')
        .eq('patient_mrn', mrn)
        .order('visit_date', { ascending: false })
      
      if (startDate) {
        query = query.gte('visit_date', startDate)
      }
      
      if (endDate) {
        query = query.lte('visit_date', endDate)
      }
      
      const { data: visits, error: visitsError } = await query
      
      if (!visitsError && visits) {
        clinicalData.push(...visits.map(visit => ({
          ...visit,
          type: 'visit'
        })))
      }
    }

    if (dataType === 'all' || dataType === 'medications') {
      // IP medications
      let ipQuery = clinicalClient
        .from('ip_medications')
        .select('*')
        .eq('patient_mrn', mrn)
        .order('taken_time', { ascending: false })
      
      if (startDate) {
        ipQuery = ipQuery.gte('taken_time', startDate)
      }
      
      if (endDate) {
        ipQuery = ipQuery.lte('taken_time', endDate)
      }
      
      const { data: ipMeds, error: ipMedsError } = await ipQuery
      
      // OP medications
      let opQuery = clinicalClient
        .from('op_medications')
        .select('*')
        .eq('patient_mrn', mrn)
        .order('visit_date', { ascending: false })
      
      if (startDate) {
        opQuery = opQuery.gte('visit_date', startDate)
      }
      
      if (endDate) {
        opQuery = opQuery.lte('visit_date', endDate)
      }
      
      const { data: opMeds, error: opMedsError } = await opQuery
      
      if (!ipMedsError && ipMeds) {
        clinicalData.push(...ipMeds.map(med => ({ ...med, type: 'ip_medication' })))
      }
      
      if (!opMedsError && opMeds) {
        clinicalData.push(...opMeds.map(med => ({ ...med, type: 'op_medication' })))
      }
    }

    if (dataType === 'all' || dataType === 'labs' || dataType === 'bonemarrow') {
      let query = clinicalClient
        .from('bone_marrow')
        .select('*')
        .eq('patient_mrn', mrn)
        .order('result_time', { ascending: false })
      
      if (startDate) {
        query = query.gte('result_time', startDate)
      }
      
      if (endDate) {
        query = query.lte('result_time', endDate)
      }
      
      const { data: labs, error: labsError } = await query
      
      if (!labsError && labs) {
        clinicalData.push(...labs.map(lab => ({
          ...lab,
          type: 'lab'
        })))
      }
    }

    // Sort all data by date
    clinicalData.sort((a, b) => {
      const dateA = new Date(a.result_time || a.visit_date || a.taken_time || a.adm_date_time)
      const dateB = new Date(b.result_time || b.visit_date || b.taken_time || b.adm_date_time)
      return dateB.getTime() - dateA.getTime()
    })

    return NextResponse.json({
      patient,
      clinicalData
    })
  } catch (error) {
    console.error('Error fetching clinical data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clinical data' },
      { status: 500 }
    )
  }
} 
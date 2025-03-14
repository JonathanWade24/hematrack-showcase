import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { VisitsViewer } from '@/components/visits/VisitsViewer'
import type { Visit } from '@/components/visits/VisitsViewer'
import { convertToNumber } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/db'

async function getVisitData(patientMrn: string) {
  const supabase = await getSupabaseServerClient()
  
  // Get patient information
  const { data: patient, error: patientError } = await supabase
    .schema('phi')
    .from('patients')
    .select('first_name, last_name, birth_date, sex, race, ethnicity')
    .eq('patient_mrn', patientMrn)
    .single()

  if (patientError || !patient) {
    console.error('Error fetching patient:', patientError)
    return null
  }

  // Get visits
  const { data: visits, error: visitsError } = await supabase
    .schema('clinical')
    .from('unified_visits')
    .select('id, visit_id, visit_type, start_date, end_date, department, icu_admission_yn')
    .eq('patient_mrn', patientMrn)
    .order('start_date', { ascending: false })

  if (visitsError) {
    console.error('Error fetching visits:', visitsError)
    return null
  }

  // Get associated data for each visit
  const visitsWithDetails = await Promise.all(
    visits.map(async (visit) => {
      // Get vitals
      const { data: vitalsResult, error: vitalsError } = await supabase
        .schema('clinical')
        .from('visit_vitals_view')
        .select('*')
        .eq('visit_id', visit.id)
        .single()
      
      if (vitalsError && vitalsError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        console.error(`Error fetching vitals for visit ${visit.id}:`, vitalsError)
      }
      
      const vitals = vitalsResult || {
        bp_systolic: null,
        bp_diastolic: null,
        weight_kg: null,
        weight_lbs: null
      }

      // Get diagnoses
      const { data: diagnosesResult, error: diagnosesError } = await supabase
        .schema('clinical')
        .from('visit_diagnoses_view')
        .select('diagnoses')
        .eq('visit_id', visit.id)
      
      if (diagnosesError) {
        console.error(`Error fetching diagnoses for visit ${visit.id}:`, diagnosesError)
      }
      
      const diagnoses = (diagnosesResult || []).map(d => [
        { code: d.diagnoses.admit_dx, description: d.diagnoses.admit_desc },
        { code: d.diagnoses.final_dx, description: d.diagnoses.final_desc }
      ]).flat().filter((d, i, arr) => 
        // Remove duplicates and null values
        d.code && d.description && arr.findIndex(x => x.code === d.code) === i
      )

      // Get medications
      const { data: medicationsResult, error: medicationsError } = await supabase
        .schema('clinical')
        .from('visit_associated_medications')
        .select('medication_data')
        .eq('visit_id', visit.id)
      
      if (medicationsError) {
        console.error(`Error fetching medications for visit ${visit.id}:`, medicationsError)
      }
      
      const medications = (medicationsResult || []).map(m => ({
        name: m.medication_data.medication,
        dosage: m.medication_data.dosage,
        unit: m.medication_data.unit,
        frequency: m.medication_data.frequency,
        status: m.medication_data.source === 'op' ? m.medication_data.status : undefined,
        taken_time: m.medication_data.source === 'ip' ? m.medication_data.taken_time : undefined
      }))

      // Get labs
      const { data: labsResult, error: labsError } = await supabase
        .schema('clinical')
        .from('visit_associated_labs')
        .select('lab_component_description, lab_result_value, result_time, proc_name')
        .eq('visit_id', visit.id)
      
      if (labsError) {
        console.error(`Error fetching labs for visit ${visit.id}:`, labsError)
      }
      
      const labs = (labsResult || []).map(lab => ({
        name: lab.lab_component_description,
        value: lab.lab_result_value,
        unit: '',  // We'll extract this from the description if needed later
        reference_range: undefined,
        date: lab.result_time
      }))

      // Get OMICs samples collected during the visit
      console.log(`Fetching omics samples for visit ${visit.id} (${visit.start_date} to ${visit.end_date || visit.start_date})`);
      const { data: omicsSamplesResult, error: omicsSamplesError } = await supabase
        .schema('laboratory')
        .from('omics_results')
        .select(`
          sample_id, 
          date_of_collection, 
          genotype, 
          steady_state, 
          transfusion_status, 
          hb_advia, 
          hct_advia, 
          wbc_advia, 
          plt_advia, 
          percent_f_cells,
          omics_subjects!inner(patient_mrn)
        `)
        .eq('omics_subjects.patient_mrn', patientMrn)
        .gte('date_of_collection', visit.start_date)
        .lte('date_of_collection', visit.end_date || visit.start_date)
      
      if (omicsSamplesError) {
        console.error(`Error fetching omics samples for visit ${visit.id}:`, omicsSamplesError)
      }
      
      console.log(`Found ${omicsSamplesResult?.length || 0} omics samples for visit ${visit.id}`);
      if (omicsSamplesResult?.length) {
        console.log('Sample dates:', omicsSamplesResult.map(s => s.date_of_collection));
      }

      const omics_samples = (omicsSamplesResult || []).map(sample => ({
        sample_id: sample.sample_id,
        date_of_collection: sample.date_of_collection!,
        sample_type: 'Blood', // Default to blood for now, can be expanded later
        genotype: sample.genotype,
        steady_state: sample.steady_state,
        transfusion_status: sample.transfusion_status,
        lab_values: {
          hb: sample.hb_advia ? Number(sample.hb_advia) : null,
          hct: sample.hct_advia ? Number(sample.hct_advia) : null,
          wbc: sample.wbc_advia ? Number(sample.wbc_advia) : null,
          plt: sample.plt_advia ? Number(sample.plt_advia) : null,
          f_cells: sample.percent_f_cells ? Number(sample.percent_f_cells) : null
        }
      }))

      const visitData: Visit = {
        id: visit.id,
        visit_id: visit.visit_id,
        visit_type: visit.visit_type,
        start_date: visit.start_date,
        end_date: visit.end_date,
        department: visit.department,
        icu_admission_yn: visit.icu_admission_yn?.toUpperCase() === 'YES',
        vitals,
        diagnoses,
        medications,
        labs,
        omics_samples
      }

      return visitData
    })
  )

  return {
    patientInfo: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      birth_date: patient.birth_date,
      sex: patient.sex,
      race: patient.race,
      ethnicity: patient.ethnicity
    },
    visits: convertToNumber(visitsWithDetails)
  }
}

interface PageProps {
  params: {
    id: string
  }
}

export default async function VisitsPage({ params }: PageProps) {
  const data = await getVisitData(params.id)

  if (!data) {
    notFound()
  }

  return (
    <DashboardLayout>
      <VisitsViewer
        visits={data.visits}
        patientInfo={data.patientInfo}
      />
    </DashboardLayout>
  )
} 
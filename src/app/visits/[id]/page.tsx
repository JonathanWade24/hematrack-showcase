import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { VisitsViewer } from '@/components/visits/VisitsViewer'
import { convertToNumber } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { createClient, createPhiClient, createClinicalClient } from '@/lib/supabase/server'

// Note: Role checking is now handled in middleware

async function getVisitData(patientMrn: string) {
  try {
    const phiClient = await createPhiClient()
    const clinicalClient = await createClinicalClient()
    const labClient = await createClient() // default is laboratory
    
    // Get patient information
    const { data: patient, error: patientError } = await phiClient
      .from('patients')
      .select('first_name, last_name, birth_date, sex, race, ethnicity')
      .eq('patient_mrn', patientMrn)
      .maybeSingle()

    if (patientError) {
      console.error('Error fetching patient:', patientError)
      return null
    }

    // Get visits
    const { data: visits, error: visitsError } = await clinicalClient
      .from('unified_visits')
      .select('id, visit_id, visit_type, start_date, end_date, department, icu_admission_yn')
      .eq('patient_mrn', patientMrn)
      .order('start_date', { ascending: false })

    if (visitsError) {
      console.error('Error fetching visits:', visitsError)
      return null
    }

    // If no visits were found, return early
    if (!visits || visits.length === 0) {
      return { patient, visits: [] }
    }

    // Get associated data for each visit
    const visitsWithDetails = await Promise.all(
      visits.map(async (visit) => {
        try {
          // Get vitals
          const { data: vitalsResult, error: vitalsError } = await clinicalClient
            .from('visit_vitals_view')
            .select('*')
            .eq('visit_id', visit.id)
            .maybeSingle()
          
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
          const { data: diagnosesResult, error: diagnosesError } = await clinicalClient
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
          const { data: medicationsResult, error: medicationsError } = await clinicalClient
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
          const { data: labsResult, error: labsError } = await clinicalClient
            .from('visit_associated_labs')
            .select('lab_component_description, lab_result_value, result_time, proc_name')
            .eq('visit_id', visit.id)
          
          if (labsError) {
            console.error(`Error fetching labs for visit ${visit.id}:`, labsError)
          }
          
          const labs = (labsResult || []).map(lab => ({
            name: lab.lab_component_description,
            value: lab.lab_result_value,
            time: lab.result_time,
            test: lab.proc_name
          }))

          // Get omics results that may be relevant to this visit
          const visitStartDate = new Date(visit.start_date)
          const visitEndDate = new Date(visit.end_date || visitStartDate)
          
          // Expand time range by a few days on either side to catch samples related to the visit
          visitStartDate.setDate(visitStartDate.getDate() - 3)
          visitEndDate.setDate(visitEndDate.getDate() + 3)
          
          const { data: omicsSamples, error: omicsError } = await labClient
            .from('omics_results')
            .select(`
              sample_id,
              subject_id,
              date_of_collection,
              rbc_advia,
              hb_advia,
              hct_advia,
              mcv_advia,
              rdw_advia,
              plt_advia,
              wbc_advia,
              omics_subjects:subject_id (subject_id, patient_mrn)
            `)
            .gte('date_of_collection', visitStartDate.toISOString().split('T')[0])
            .lte('date_of_collection', visitEndDate.toISOString().split('T')[0])
          
          if (omicsError) {
            console.error(`Error fetching omics samples for visit ${visit.id}:`, omicsError)
          }
          
          // Filter samples by patient_mrn - only keep those related to this patient
          const samples = (omicsSamples || []).filter(sample => {
            // Type-safe check for omics_subjects and its structure
            if (!sample.omics_subjects || typeof sample.omics_subjects !== 'object') {
              return false;
            }
            
            // Access patient_mrn using type assertion or optional chaining
            const subjectData = sample.omics_subjects as { patient_mrn?: string };
            return subjectData.patient_mrn === patientMrn;
          }).map(sample => ({
            sample_id: sample.sample_id,
            subject_id: sample.subject_id,
            collection_date: sample.date_of_collection,
            rbc: sample.rbc_advia,
            hb: sample.hb_advia,
            hct: sample.hct_advia,
            mcv: sample.mcv_advia,
            rdw: sample.rdw_advia,
            plt: sample.plt_advia,
            wbc: sample.wbc_advia
          }))

          return {
            ...visit,
            vitals,
            diagnoses,
            medications,
            labs,
            samples
          }
        } catch (err) {
          console.error(`Error processing visit ${visit.id}:`, err)
          return {
            ...visit,
            vitals: {},
            diagnoses: [],
            medications: [],
            labs: [],
            samples: []
          }
        }
      })
    )

    return {
      patient,
      visits: convertToNumber(visitsWithDetails)
    }
  } catch (error) {
    console.error('Error in getVisitData:', error)
    return null
  }
}

export default async function VisitsPage({ params }: { params: { id: string } }) {
  // Get the visit data
  const data = await getVisitData(params.id)

  // If no data was found, return 404
  if (!data) {
    return notFound()
  }

  return (
    <DashboardLayout>
      <VisitsViewer patientMrn={params.id} data={data} />
    </DashboardLayout>
  )
} 
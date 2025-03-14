import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SampleViewer } from '@/components/samples/SampleViewer'
import { convertToNumber } from '@/lib/utils'
import { getSupabaseServerClient } from '@/lib/supabase/db'

interface SamplePageProps {
  params: {
    id: string
  }
}

async function getSampleData(sampleId: string) {
  const supabase = await getSupabaseServerClient()
  
  try {
    // First get the sample data
    const { data: sample, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*')
      .eq('sample_id', sampleId)
      .single()
    
    if (error || !sample) {
      console.error('Error fetching sample:', error)
      return null
    }
    
    // Then get the subject data
    const { data: subject, error: subjectError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select('*')
      .eq('subject_id', sample.subject_id)
      .single()
    
    if (subjectError) {
      console.error('Error fetching subject:', subjectError)
    }
    
    // If we have a subject with a patient_mrn, get the patient data
    let patient = null
    if (subject && subject.patient_mrn) {
      const { data: patientData, error: patientError } = await supabase
        .schema('phi')
        .from('patients')
        .select('first_name, last_name, birth_date, sex, race, ethnicity')
        .eq('patient_mrn', subject.patient_mrn)
        .single()
      
      if (patientError) {
        console.error('Error fetching patient:', patientError)
      } else {
        patient = patientData
      }
    }
    
    // Combine the data
    const combinedData = {
      ...sample,
      omics_subjects: subject ? {
        ...subject,
        patients: patient
      } : null
    }

    // Convert all numeric values to numbers
    return convertToNumber(combinedData)
  } catch (error) {
    console.error('Error in getSampleData:', error)
    return null
  }
}

export default async function SamplePage({ params }: SamplePageProps) {
  // Convert params to a regular object to avoid the async property access error
  const id = params.id;
  
  const sample = await getSampleData(id)
  
  if (!sample) {
    notFound()
  }

  return (
    <DashboardLayout>
      <SampleViewer sample={sample} />
    </DashboardLayout>
  )
} 
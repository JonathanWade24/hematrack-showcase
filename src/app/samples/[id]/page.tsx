import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SampleViewer } from '@/components/samples/SampleViewer'
import { convertToNumber } from '@/lib/utils'
import { createClient, createPhiClient } from '@/lib/supabase/server'

// Updated page props for Next.js 15
type PageParams = {
  id: string;
};

type SamplePageProps = {
  params: Promise<PageParams> | undefined;
};

async function getSampleData(sampleId: string) {
  const laboratoryClient = await createClient() // Default is laboratory schema
  const phiClient = await createPhiClient()
  
  try {
    // First get the sample data
    const { data: sample, error } = await laboratoryClient
      .from('omics_results')
      .select('*')
      .eq('sample_id', sampleId)
      .single()
    
    if (error) {
      console.error('Error fetching sample:', error)
      return null
    }
    
    if (!sample) {
      console.log('No sample found with ID:', sampleId)
      return null
    }
    
    // Then get the subject data
    const { data: subject, error: subjectError } = await laboratoryClient
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
      const { data: patientData, error: patientError } = await phiClient
        .from('patients')
        .select('first_name, last_name, birth_date, sex, race, ethnicity')
        .eq('patient_mrn', subject.patient_mrn)
        .maybeSingle() // Use maybeSingle instead of single to prevent errors when no record is found
      
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
  // Handle params correctly, checking for undefined
  if (!params) {
    throw new Error('Missing page parameters');
  }
  
  // Resolve params if it's a Promise
  const parameters = await params;
  const id = parameters.id;
  
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
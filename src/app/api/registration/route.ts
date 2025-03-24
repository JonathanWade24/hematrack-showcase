import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RegistrationData {
  first_name: string
  last_name: string
  middle_name?: string
  birth_date: string
  date_of_birth: string
  sex: string
  race: string
  ethnicity: string
  patient_mrn: string
  subject_id: string
  project: string
  registration_date: string
  consent_date: string
  corporate_id?: string
}

export async function POST(request: Request) {
  try {
    const data: RegistrationData = await request.json()
    console.log("Registration data received:", data)
    
    const supabase = await createClient()
    
    // Start with patient registration in PHI schema
    console.log("Attempting to create patient in PHI schema")
    const { data: patient, error: patientError } = await supabase
      .schema('phi')
      .from('patients')
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name,
        birth_date: data.birth_date,
        sex: data.sex,
        race: data.race,
        ethnicity: data.ethnicity,
        patient_mrn: data.patient_mrn
      })
      .select()
      .single()
    
    if (patientError) {
      console.error("Patient creation error:", patientError)
      if (patientError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Patient with this MRN already exists', details: patientError },
          { status: 409 }
        )
      }
      throw patientError
    }
    
    console.log("Patient created successfully:", patient)
    
    // Switch to laboratory schema for omics data
    console.log("Attempting to create omics subject in laboratory schema")
    const { data: omicsSubject, error: omicsError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .insert({
        subject_id: data.subject_id,
        patient_mrn: data.patient_mrn,
        project: data.project
      })
      .select()
      .single()
    
    if (omicsError) {
      console.error("Omics subject creation error:", omicsError)
      if (omicsError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Subject ID already exists', details: omicsError },
          { status: 409 }
        )
      }
      throw omicsError
    }
    
    console.log("Omics subject created successfully:", omicsSubject)
    
    // Create subject registration in PHI schema (corrected from laboratory schema)
    console.log("Attempting to create subject registration in PHI schema")
    const { data: registration, error: registrationError } = await supabase
      .schema('phi')
      .from('subject_registration')
      .insert({
        subject_id: data.subject_id,
        patient_mrn: data.patient_mrn,
        project: data.project,
        registration_date: data.registration_date,
        consent_date: data.consent_date,
        corporate_id: data.corporate_id || null,
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth
      })
      .select()
      .single()
    
    if (registrationError) {
      console.error("Subject registration error:", registrationError)
      throw registrationError
    }
    
    console.log("Subject registration created successfully")
    
    return NextResponse.json({
      patient,
      omicsSubject,
      registration
    })
  } catch (error) {
    console.error('Error in registration:', error)
    // Enhanced error logging
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name } 
      : { error }
    
    return NextResponse.json(
      { error: 'Failed to register subject', details: errorDetails },
      { status: 500 }
    )
  }
} 
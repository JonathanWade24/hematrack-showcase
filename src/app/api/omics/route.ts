import { NextRequest, NextResponse } from 'next/server'
import { 
  createOmicsResult, 
  createOmicsSubject, 
  getOmicsResultBySampleId, 
  getOmicsSubjectById, 
  updateOmicsResult,
  getOmicsSubjectBySubjectId,
  createPatient
} from '@/lib/supabase/operations'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sampleId = searchParams.get('sampleId')
  const subjectId = searchParams.get('subjectId')
  
  try {
    if (sampleId) {
      const sample = await getOmicsResultBySampleId(sampleId)
      return NextResponse.json(sample)
    }
    
    if (subjectId) {
      const subject = await getOmicsSubjectById(subjectId)
      return NextResponse.json(subject)
    }
    
    return NextResponse.json({ error: 'Missing sampleId or subjectId parameter' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching omics data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle sample entry form submission
    if (body.subject_id) {
      const { subject_id, sample_number, force_create_subject, ...sampleData } = body
      
      // Check if subject exists
      const existingSubject = await getOmicsSubjectBySubjectId(subject_id)
      
      if (!existingSubject && !force_create_subject) {
        return NextResponse.json({
          status: 'new_subject',
          message: `Subject ID ${subject_id} does not exist. Confirm to create a new subject.`
        }, { status: 409 })
      }
      
      // Create subject if it doesn't exist
      if (!existingSubject && force_create_subject) {
        try {
          // Create a temporary MRN for the subject
          const tempMRN = `TEMP-${subject_id}-${Date.now()}`
          
          // First create a temporary patient record
          await createPatient({
            patient_mrn: tempMRN,
            first_name: 'Temporary',
            last_name: `Subject ${subject_id}`
          })
          
          // Then create the omics subject with the temporary MRN
          await createOmicsSubject({ 
            subject_id,
            patient_mrn: tempMRN
          })
        } catch (subjectError) {
          console.error('Error creating subject:', subjectError)
          return NextResponse.json({ 
            error: 'Failed to create subject. Please try again.' 
          }, { status: 500 })
        }
      }
      
      // Create sample ID
      const sample_id = `${subject_id}-${sample_number || 1}`
      
      // Create the sample
      const result = await createOmicsResult({
        subject_id,
        sample_number: sample_number || 1,
        sample_id,
        ...sampleData
      })
      
      return NextResponse.json({
        status: 'success',
        message: 'Sample data saved successfully',
        data: result
      })
    }
    
    // Handle legacy API format
    const { type, data } = body
    
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
    }
    
    let result
    
    switch (type) {
      case 'subject':
        // Ensure patient_mrn is provided for subject creation
        if (!data.patient_mrn) {
          const tempMRN = `TEMP-${data.subject_id}-${Date.now()}`
          
          // Create a temporary patient first
          await createPatient({
            patient_mrn: tempMRN,
            first_name: 'Temporary',
            last_name: `Subject ${data.subject_id}`
          })
          
          data.patient_mrn = tempMRN
        }
        result = await createOmicsSubject(data)
        break
      case 'sample':
        result = await createOmicsResult(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating omics data:', error)
    return NextResponse.json({ error: 'Failed to create data' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const requestData = await request.json()
    
    if (!requestData.subject_id || !requestData.sample_number) {
      return NextResponse.json({ error: 'Missing subject_id or sample_number' }, { status: 400 })
    }
    
    const { subject_id, sample_number } = requestData
    const sample_id = `${subject_id}-${sample_number}`
    
    // Create a clean copy omitting known non-database fields
    const sampleData = { ...requestData }
    // Delete the non-database fields
    delete sampleData.force_create_subject
    
    // Update the sample with cleaned data
    const result = await updateOmicsResult(sample_id, sampleData)
    
    return NextResponse.json({
      status: 'success',
      message: 'Sample data updated successfully',
      data: result
    })
  } catch (error) {
    console.error('Error updating omics data:', error)
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to update data', 
        message: error.message 
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 })
  }
} 
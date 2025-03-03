import { NextResponse } from 'next/server'
import { createOmicsResult, getOmicsResultBySampleId } from '@/lib/operations'
import { prisma } from '@/db'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Check if subject exists
    const existingSubject = await prisma.omics_subjects.findUnique({
      where: { subject_id: data.subject_id }
    })

    // If subject doesn't exist and force_create_subject flag is not set, return info response
    if (!existingSubject && !data.force_create_subject) {
      return NextResponse.json(
        {
          status: 'new_subject',
          message: `Subject ${data.subject_id} does not exist in the database.`,
          action_required: true,
          details: {
            subject_id: data.subject_id,
            warning: 'This subject will be flagged as pending until a matching MRN is provided through clinical data integration.',
            confirmation_needed: true
          }
        },
        { status: 409 }
      )
    }

    // If force_create_subject is true and subject doesn't exist, create a provisional subject
    if (!existingSubject && data.force_create_subject) {
      try {
        // First create a provisional patient record
        const provisionalMRN = `PROV-${data.subject_id}`
        await prisma.patients.create({
          data: {
            patient_mrn: provisionalMRN,
            created_at: new Date(),
            updated_at: new Date()
          }
        })

        // Then create the omics subject with the provisional MRN
        await prisma.omics_subjects.create({
          data: {
            subject_id: data.subject_id,
            patient_mrn: provisionalMRN,
            project: 'OMI',
            created_at: new Date(),
            updated_at: new Date()
          }
        })
      } catch (subjectError) {
        console.error('Error creating provisional subject:', subjectError)
        return NextResponse.json(
          { error: 'Failed to create new subject' },
          { status: 500 }
        )
      }
    }

    // Generate sample_id from subject_id and sample_number
    const sample_id = `${data.subject_id}-${data.sample_number}`

    // Check if sample already exists
    const existingSample = await prisma.omics_results.findUnique({
      where: { sample_id }
    })

    if (existingSample) {
      return NextResponse.json(
        { error: `Sample ${sample_id} already exists.` },
        { status: 400 }
      )
    }
    
    // Format date_of_collection as ISO DateTime if it exists
    const { force_create_subject, ...omicsData } = data
    const formattedData = {
      ...omicsData,
      date_of_collection: data.date_of_collection ? new Date(data.date_of_collection).toISOString() : null,
      sample_id,
      created_at: new Date(),
      updated_at: new Date()
    }

    // Create the omics result
    await createOmicsResult(formattedData)

    // Verify the submission by fetching the created record
    const verifiedResult = await getOmicsResultBySampleId(sample_id)
    
    if (!verifiedResult) {
      return NextResponse.json(
        { error: 'Data was submitted but could not be verified' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...verifiedResult,
      message: data.force_create_subject ? 
        'Sample created successfully. Note: A new subject was created with a provisional MRN.' :
        'Sample created successfully.'
    })

  } catch (error) {
    console.error('Error creating omics result:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create omics result' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sample_id = searchParams.get('sample_id')

    if (!sample_id) {
      return NextResponse.json(
        { error: 'Sample ID is required' },
        { status: 400 }
      )
    }

    const result = await getOmicsResultBySampleId(sample_id)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Sample not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching omics result:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch omics result' },
      { status: 500 }
    )
  }
} 
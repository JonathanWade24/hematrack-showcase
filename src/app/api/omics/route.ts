import { NextRequest, NextResponse } from 'next/server'
import { 
  createOmicsResult, 
  createOmicsSubject, 
  getOmicsResultBySampleId, 
  getOmicsSubjectById, 
  updateOmicsResult,
  createPatient
} from '@/lib/prisma/operations'
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sampleId = searchParams.get('sampleId')
  const subjectId = searchParams.get('subjectId')
  
  try {
    let data = null;
    if (sampleId) {
      data = await getOmicsResultBySampleId(sampleId)
    }
    
    if (subjectId) {
      data = await getOmicsSubjectById(subjectId)
    }
    
    if (!data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json(data)
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
      
      // Check if subject exists using Prisma
      const existingSubject = await getOmicsSubjectById(subject_id)
      
      if (!existingSubject && !force_create_subject) {
        return NextResponse.json({
          status: 'new_subject',
          message: `Subject ID ${subject_id} does not exist. Confirm to create a new subject.`
        }, { status: 409 })
      }
      
      // Create subject if it doesn't exist using Prisma
      if (!existingSubject && force_create_subject) {
        try {
          // Create a temporary MRN for the subject
          const tempMRN = `TEMP-${subject_id}-${Date.now()}`
          
          // First create a temporary patient record using Prisma
          await createPatient({ 
            patient_mrn: tempMRN,
            first_name: 'Temporary',
            last_name: `Subject ${subject_id}`
          })
          
          // Then create the omics subject using Prisma
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
      
      // --- Convert date strings to Date objects --- 
      const convertedSampleData = { ...sampleData };
      const dateFields: (keyof typeof sampleData)[] = [
        'date_of_collection', 'date_advia', 'date_dna', 'date_pmbc', 
        'date_plasma', 'date_lorrca', 'date_visc', 'date_hvr', 
        'date_f_cells', 'date_adhesion', 'date_hplc' 
        // Add any other date fields from your schema/form here
      ];

      dateFields.forEach(field => {
        if (convertedSampleData[field] && typeof convertedSampleData[field] === 'string') {
          // Important: Directly creating a Date from 'YYYY-MM-DD' might use local timezone.
          // Appending 'T00:00:00Z' ensures it's parsed as UTC midnight.
          convertedSampleData[field] = new Date(`${convertedSampleData[field]}T00:00:00Z`);
        } else if (convertedSampleData[field] === '') { 
          // Handle empty strings explicitly if they should be null
          convertedSampleData[field] = null;
        }
      });
      // --- End Date Conversion ---

      // Create the sample using Prisma
      let result = null;
      try {
        const dataToCreate = {
          subject_id,
          sample_number: Number(sample_number) || 1,
          sample_id,
          ...convertedSampleData // Use the data with converted dates
        };
        console.log('\n*** Data passed to createOmicsResult: ***\n', dataToCreate); // Log input data
        result = await createOmicsResult(dataToCreate);
      } catch (creationError: any) {
        console.error('*** DETAILED Error creating omics result ***');
        if (creationError instanceof Prisma.PrismaClientKnownRequestError) {
          console.error('Prisma Error Code:', creationError.code);
          console.error('Prisma Error Meta:', creationError.meta);
          return NextResponse.json({ 
            error: 'Failed to save sample data (Prisma Error)', 
            code: creationError.code,
            meta: creationError.meta 
          }, { status: 500 });
        } else {
           console.error('Non-Prisma Error during creation:', creationError);
           return NextResponse.json({ error: 'Failed to save sample data (Unknown Error)' }, { status: 500 });
        }
      }

      // If we reach here, the inner try succeeded and result is not null
      console.log('\n*** Result returned by createOmicsResult: ***\n', result);
      return NextResponse.json({
        status: 'success',
        message: 'Sample data saved successfully',
        data: result
      })
    }
    
    // Handle legacy API format (Update to Prisma)
    const { type, data } = body
    
    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 })
    }
    
    let legacyResult
    
    switch (type) {
      case 'subject':
        // Ensure patient_mrn logic using Prisma
        if (!data.patient_mrn) {
          const tempMRN = `TEMP-${data.subject_id}-${Date.now()}`
          await createPatient({ patient_mrn: tempMRN, first_name: 'Temporary', last_name: `Subject ${data.subject_id}` })
          data.patient_mrn = tempMRN
        }
        legacyResult = await createOmicsSubject(data)
        break
      case 'sample':
        legacyResult = await createOmicsResult(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
    
    return NextResponse.json(legacyResult)
  } catch (error) {
    console.error('Error creating omics data (Outer Catch):', error)
    return NextResponse.json({ error: 'Failed to create data' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const requestData = await request.json()
    
    if (!requestData.sample_id) {
      return NextResponse.json({ error: 'Missing sample_id' }, { status: 400 })
    }
    
    const { sample_id, ...sampleData } = requestData
    
    // Update the sample using Prisma
    const result = await updateOmicsResult(sample_id, sampleData)
    
    if (!result) {
        return NextResponse.json({ error: `Sample with ID ${sample_id} not found or update failed` }, { status: 404 })
    }

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
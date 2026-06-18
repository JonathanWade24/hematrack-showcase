import { NextRequest, NextResponse } from 'next/server'
// Remove Prisma imports
// import { 
//   createOmicsResult, 
//   createOmicsSubject, 
//   getOmicsResultBySampleId, 
//   getOmicsSubjectById, 
//   updateOmicsResult,
//   createPatient
// } from '@/lib/prisma/operations'
// import { Prisma } from '@prisma/client';

// Import Drizzle operations and types
import { 
  checkOmicsSubjectExists, 
  createDrizzleOmicsSubject, 
  createDrizzlePatient,
  // Placeholders for sample operations - we'll need these later
  // createSampleWithResults, 
  // updateSampleWithResults, 
  // getDrizzleSampleBySampleId, 
  // getDrizzleOmicsSubjectById // If needed for GET
} from '@/lib/db/queries';
// Import auth function for authentication
import { auth } from '@/app/api/auth/[...nextauth]/route';

// Define roles allowed for data entry/modification
const DATA_ENTRY_ROLES = ['admin', 'editor']; // Adjust as needed

// --- GET Handler (Needs Refactoring Later) --- 
export async function GET(request: NextRequest) {
  // TODO: Refactor GET using Drizzle operations (e.g., getDrizzleSampleBySampleId)
  const searchParams = request.nextUrl.searchParams
  const sampleId = searchParams.get('sampleId')
  const subjectId = searchParams.get('subjectId')
  return NextResponse.json({ error: 'GET endpoint needs refactoring to Drizzle' }, { status: 501 }); // Placeholder
}

// --- POST Handler --- 
export async function POST(request: NextRequest) {
  // 1. Authentication Check
  const session = await auth();
  if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Handle sample entry form submission
    if (body.subject_id) {
      const { subject_id, sample_number, force_create_subject, ...sampleData } = body;
      
      // 2. Check if subject exists using Drizzle
      const existingSubject = await checkOmicsSubjectExists(subject_id);
      
      if (!existingSubject && !force_create_subject) {
        // Subject doesn't exist, ask for confirmation
        return NextResponse.json({
          status: 'new_subject',
          message: `Subject ID ${subject_id} does not exist. Confirm to create a new subject.`
        }, { status: 409 });
      }
      
      // 3. Create subject and patient if needed, using Drizzle
      if (!existingSubject && force_create_subject) {
        try {
          // Create a temporary MRN for the patient
          const tempMRN = `TEMP-${subject_id}-${Date.now()}`;
          
          // First create a temporary patient record using Drizzle
          await createDrizzlePatient({ 
            patient_mrn: tempMRN,
            first_name: 'Temporary',
            last_name: `Subject ${subject_id}`
            // Add other required fields if any, with default values or null
          });
          
          // Then create the omics subject using Drizzle
          await createDrizzleOmicsSubject({ 
            subject_id,
            patient_mrn: tempMRN
            // Add project or other fields if needed
          });
          console.log(`[API /omics POST] Created temporary patient (${tempMRN}) and subject (${subject_id})`);
        } catch (subjectError) {
          console.error('[API /omics POST] Error creating subject/patient:', subjectError);
          // It's often better to let the outer catch handle the 500 response
          throw new Error('Failed to create subject/patient during sample submission.');
        }
      }
      
      // Create sample ID
      const sample_id = `${subject_id}-${sample_number || 1}`;
      
      // --- Date Conversion Logic (Keep as is for now) --- 
      const convertedSampleData = { ...sampleData };
      const dateFields: (keyof typeof sampleData)[] = [
        'date_of_collection', 'date_advia', 'date_dna', 'date_pmbc', 
        'date_plasma', 'date_lorrca', 'date_visc', 'date_hvr', 
        'date_f_cells', 'date_adhesion', 'date_hplc'
      ];
      dateFields.forEach(field => {
        if (convertedSampleData[field] && typeof convertedSampleData[field] === 'string') {
          convertedSampleData[field] = new Date(`${convertedSampleData[field]}T00:00:00Z`);
        } else if (convertedSampleData[field] === '') {
          convertedSampleData[field] = null;
        }
      });
      // --- End Date Conversion ---

      // 4. Create the sample using Prisma (TO BE REPLACED)
      // TODO: Replace this section with call to Drizzle `createSampleWithResults`
      let result = null;
      try {
        // --- TEMPORARY PRISMA CALL - REMOVE LATER ---
        const { createOmicsResult } = await import('@/lib/prisma/operations'); // Lazy import old function
        const { Prisma } = await import('@prisma/client'); // Lazy import Prisma types
        // --- END TEMPORARY --- 
        
        const dataToCreate = {
          subject_id,
          sample_number: Number(sample_number) || 1,
          sample_id,
          ...convertedSampleData // Use the data with converted dates
        };
        console.log('[API /omics POST] Data passed to createOmicsResult (Prisma):', dataToCreate);
        result = await createOmicsResult(dataToCreate); // Call the old Prisma function for now
      } catch (creationError: any) {
        console.error('[API /omics POST] *** Error creating omics result ***');
        const { Prisma } = await import('@prisma/client'); // Lazy import Prisma types for error check
        if (creationError instanceof Prisma.PrismaClientKnownRequestError) {
          console.error('Prisma Error Code:', creationError.code);
          console.error('Prisma Error Meta:', creationError.meta);
          return NextResponse.json({ 
            error: 'Failed to save sample data (DB Error)', 
            code: creationError.code,
            meta: creationError.meta 
          }, { status: 500 });
        } else {
           console.error('Non-DB Error during creation:', creationError);
           return NextResponse.json({ error: 'Failed to save sample data (App Error)' }, { status: 500 });
        }
      }
      // END OF SECTION TO REPLACE

      console.log('[API /omics POST] Result returned by createOmicsResult (Prisma):', result);
      return NextResponse.json({
        status: 'success',
        message: 'Sample data saved successfully (using temporary Prisma backend)',
        data: result
      });
    } // End if (body.subject_id)
    
    // --- Handle legacy API format (Needs Refactoring) --- 
    console.warn("[API /omics POST] Received request in legacy format - needs refactoring.");
    return NextResponse.json({ error: 'Legacy POST format needs refactoring to Drizzle' }, { status: 501 }); // Placeholder

  } catch (error) {
    console.error('[API /omics POST] Error (Outer Catch):', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// --- PUT Handler (Needs Refactoring Later) --- 
export async function PUT(request: NextRequest) {
  // TODO: Refactor PUT using Drizzle operations (updateSampleWithResults) and add auth check
  const session = await auth();
  if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json({ error: 'PUT endpoint needs refactoring to Drizzle' }, { status: 501 }); // Placeholder
} 
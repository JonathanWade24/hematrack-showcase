import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma' // Commented out
import { auth } from '@/app/api/auth/[...nextauth]/route'
// import type { FilterCriteria } from '@/components/data/DataDownload' // Commented out if not used elsewhere
// import type { omics_results, omics_subjects, Labs, op_medications } from '@/generated/prisma' // Commented out
// import { Decimal } from '@prisma/client/runtime/library' // Commented out

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

// Define allowed roles for accessing this sensitive route
const ALLOWED_ROLES = ['admin', 'clinician', 'editor'] // Adjust roles as needed

// type OmicsResultWithSubject = omics_results & { omics_subjects: omics_subjects | null }; // Commented out

export async function POST(request: Request) {
  // --- Authentication & Authorization ---
  const session = await auth()
  if (!session || !session.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[API /data-preview] Unauthorized access attempt: ${reason}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // const filters = await request.json() as FilterCriteria; // Keep for logging if needed
    console.log("[API /data-preview] Request received. Functionality temporarily disabled pending Drizzle migration.");

    // --- Prisma logic temporarily commented out ---
    /*
    const sampleSize = 10

    const omicsResults: OmicsResultWithSubject[] = await prisma.omics_results.findMany({
      include: {
        omics_subjects: true, 
      },
      orderBy: {
        date_of_collection: 'desc',
      },
      take: sampleSize,
    })

    if (!omicsResults || omicsResults.length === 0) {
      return NextResponse.json({ headers: ['No Data'], rows: [['No matching data found for preview']] })
    }

    const processedResults: Record<string, unknown>[] = [];

    for (const result of omicsResults) {
      const processedRow: Record<string, unknown> = {
        sample_id: result.sample_id,
        subject_id: result.subject_id,
        date_of_collection: result.date_of_collection?.toISOString().split('T')[0] ?? null,
        genotype: result.genotype,
      }

      Object.entries(filters.variables.omics).forEach(([, variables]) => {
        variables.forEach(varName => {
          if (varName in result) {
            const value = result[varName as keyof omics_results];
            if (value instanceof Decimal) {
              processedRow[varName] = value.toString();
            } else if (value instanceof Date) {
              processedRow[varName] = value.toISOString();
            } else {
              processedRow[varName] = value;
            }
          }
        })
      })

      filters.variables.demographics.forEach(varName => {
         let value: unknown = null;
         if (varName in result) {
            value = result[varName as keyof omics_results];
         } else if (result.omics_subjects && varName in result.omics_subjects) {
            // @ts-ignore 
            value = result.omics_subjects[varName];
         }
         if (value instanceof Decimal) {
           processedRow[varName] = value.toString();
         } else if (value instanceof Date) {
           processedRow[varName] = value.toISOString();
         } else {
           processedRow[varName] = value;
         }
      })

      const patientMrn = result.omics_subjects?.patient_mrn;
      if (patientMrn) {
        if (filters.variables.clinical.labs.length > 0) {
          try {
            const labComponentIds = filters.variables.clinical.labs.map(lab => lab.component_id);
            const latestLabResult = await prisma.labs.findFirst({
              where: {
                patient_mrn: patientMrn,
                lab_component_description: {
                  in: labComponentIds,
                  mode: 'insensitive', 
                }
              },
              orderBy: {
                result_time: 'desc'
              },
              select: { 
                 lab_component_description: true,
                 lab_result_value: true
              }
            });
            filters.variables.clinical.labs.forEach(labFilter => {
              if (latestLabResult?.lab_component_description?.toLowerCase() === labFilter.component_id.toLowerCase()) {
                 processedRow[labFilter.name] = latestLabResult.lab_result_value ?? null;
              } else {
                 processedRow[labFilter.name] = null; 
              }
            });
          } catch (error) {
            console.error(`[API /data-preview] Error fetching lab data for MRN ${patientMrn}:`, error)
             filters.variables.clinical.labs.forEach(labFilter => {
                processedRow[labFilter.name] = null;
             });
          }
        }

        if (filters.variables.clinical.medications.length > 0) {
            try {
               const recentMedications: { generic_description: string | null }[] = await prisma.op_medications.findMany({
                 where: { patient_mrn: patientMrn },
                 orderBy: { visit_date: 'desc' },
                 take: 20,
                 select: { generic_description: true }
               });
               filters.variables.clinical.medications.forEach(medFilter => {
                 const hasMed = recentMedications.some((dbMed: { generic_description: string | null }) =>
                   dbMed.generic_description &&
                   medFilter.generic_description.some(term =>
                     dbMed.generic_description!.toLowerCase().includes(term.toLowerCase())
                   )
                 );
                 processedRow[medFilter.name] = hasMed ? 'Yes' : 'No';
               });
            } catch (error) {
                 console.error(`[API /data-preview] Error fetching medication data for MRN ${patientMrn}:`, error)
                 filters.variables.clinical.medications.forEach(medFilter => {
                    processedRow[medFilter.name] = 'Error';
                 });
            }
        }
      }
      processedResults.push(processedRow);
    }

    const allHeaders = Array.from(new Set(processedResults.flatMap(Object.keys)));
    const rowsAsArrays = processedResults.map(result =>
      allHeaders.map(header => result[header] ?? null) 
    );
    return NextResponse.json({ headers: allHeaders, rows: rowsAsArrays });
    */
    // --- End of commented out Prisma logic ---

    return NextResponse.json(
      { 
        headers: ['Status'], 
        rows: [['Data Preview POST functionality is temporarily disabled pending migration to Drizzle ORM.']] 
      },
      { status: 503 } // Service Unavailable
    );

  } catch (error) {
    console.error('[API /data-preview] Error (handler disabled):', error)
    // const errorMessage = error instanceof Error ? error.message : 'Unknown error' // Keep original error message structure if preferred
    return NextResponse.json(
        { headers: ['Error'], rows: [[`Failed to generate preview (handler disabled): ${error instanceof Error ? error.message : 'Unknown error'}`]] },
        { status: 500 }
    )
  }
} 
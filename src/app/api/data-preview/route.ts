import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import type { FilterCriteria } from '@/components/data/DataDownload'
import type { omics_results, omics_subjects, Labs, op_medications } from '@/generated/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export const dynamic = "force-dynamic"; // Ensure this route is handled dynamically

// Define allowed roles for accessing this sensitive route
const ALLOWED_ROLES = ['admin', 'clinician', 'editor'] // Adjust roles as needed

type OmicsResultWithSubject = omics_results & { omics_subjects: omics_subjects | null };

export async function POST(request: Request) {
  // --- Authentication & Authorization ---
  const session = await auth()
  if (!session || !session.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[API /data-preview] Unauthorized access attempt: ${reason}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const filters = await request.json() as FilterCriteria
    const sampleSize = 10 // Limit for preview

    // --- Fetch Initial Omics Data ---
    const omicsResults: OmicsResultWithSubject[] = await prisma.omics_results.findMany({
      include: {
        omics_subjects: true, // Include related subject data
      },
      orderBy: {
        date_of_collection: 'desc',
      },
      take: sampleSize,
    })

    if (!omicsResults || omicsResults.length === 0) {
      return NextResponse.json({ headers: ['No Data'], rows: [['No matching data found for preview']] })
    }

    // --- Process Results and Fetch Related Data ---
    const processedResults: Record<string, unknown>[] = [];

    for (const result of omicsResults) {
      const processedRow: Record<string, unknown> = {
        // Start with basic omics info
        sample_id: result.sample_id,
        subject_id: result.subject_id,
        date_of_collection: result.date_of_collection?.toISOString().split('T')[0] ?? null,
        genotype: result.genotype,
      }

      // Add requested omics variables
      Object.entries(filters.variables.omics).forEach(([, variables]) => {
        variables.forEach(varName => {
          if (varName in result) {
            const value = result[varName as keyof omics_results];
            // Convert Decimal to string, Date to ISO string, otherwise assign directly
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

      // Add requested demographics variables (assuming they are on omics_results or omics_subjects)
      filters.variables.demographics.forEach(varName => {
         let value: unknown = null;
         if (varName in result) {
            value = result[varName as keyof omics_results];
         } else if (result.omics_subjects && varName in result.omics_subjects) {
            // @ts-ignore - Accessing subject property dynamically
            value = result.omics_subjects[varName];
         }

         // Convert Decimal/Date from demographics as well
         if (value instanceof Decimal) {
           processedRow[varName] = value.toString();
         } else if (value instanceof Date) {
           processedRow[varName] = value.toISOString();
         } else {
           processedRow[varName] = value;
         }
      })

      // --- Fetch Related Clinical Data (if needed) ---
      const patientMrn = result.omics_subjects?.patient_mrn;
      if (patientMrn) {
        // Fetch Labs if requested
        if (filters.variables.clinical.labs.length > 0) {
          try {
            const labComponentIds = filters.variables.clinical.labs.map(lab => lab.component_id);
            // Find the latest lab result for *any* of the requested components for this patient
            // Note: This slightly differs from original, which fetched latest for *each* component separately.
            // Getting the absolute latest single result matching the filter criteria.
            const latestLabResult = await prisma.labs.findFirst({
              where: {
                patient_mrn: patientMrn,
                lab_component_description: {
                  in: labComponentIds,
                  mode: 'insensitive', // Match case-insensitively
                }
              },
              orderBy: {
                result_time: 'desc'
              },
              select: { // Select only needed fields
                 lab_component_description: true,
                 lab_result_value: true
              }
            });

            // Map results to the requested lab names
            filters.variables.clinical.labs.forEach(labFilter => {
               // Check if the *single* latest result we found matches this specific filter
              if (latestLabResult?.lab_component_description?.toLowerCase() === labFilter.component_id.toLowerCase()) {
                 processedRow[labFilter.name] = latestLabResult.lab_result_value ?? null;
              } else {
                 processedRow[labFilter.name] = null; // No matching latest result found for this specific component
              }
            });

          } catch (error) {
            console.error(`[API /data-preview] Error fetching lab data for MRN ${patientMrn}:`, error)
            // Assign null to all requested lab columns on error for this row
             filters.variables.clinical.labs.forEach(labFilter => {
                processedRow[labFilter.name] = null;
             });
          }
        }

        // Fetch Medications if requested
        if (filters.variables.clinical.medications.length > 0) {
            try {
               // Fetch recent medications for the patient
               const recentMedications: { generic_description: string | null }[] = await prisma.op_medications.findMany({
                 where: { patient_mrn: patientMrn },
                 orderBy: { visit_date: 'desc' },
                 take: 20,
                 select: { generic_description: true }
               });

               // Check presence for each requested medication filter
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
                 // Assign 'Error' or null to all requested med columns on error
                 filters.variables.clinical.medications.forEach(medFilter => {
                    processedRow[medFilter.name] = 'Error';
                 });
            }
        }
      }
      processedResults.push(processedRow);
    }

    // --- Format Output ---
    // Get all unique headers from the processed results
    const allHeaders = Array.from(new Set(processedResults.flatMap(Object.keys)));

    // Ensure consistent order (optional but good practice)
    // Define a preferred order or sort alphabetically if needed
    // Example: allHeaders.sort();

    // Convert objects to arrays based on header order
    const rowsAsArrays = processedResults.map(result =>
      allHeaders.map(header => result[header] ?? null) // Use null for missing values
    );

    return NextResponse.json({ headers: allHeaders, rows: rowsAsArrays });

  } catch (error) {
    console.error('[API /data-preview] Error generating preview:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
        { headers: ['Error'], rows: [[`Failed to generate preview: ${errorMessage}`]] },
        { status: 500 }
    )
  }
} 
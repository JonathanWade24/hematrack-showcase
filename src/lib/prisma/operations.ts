import { prisma } from '@/lib/prisma'; // Correct path to prisma client
import { omics_subjects, omics_results, patients, Prisma } from '@prisma/client'; // Use correct generated type names and import Prisma namespace for types
import { Decimal } from '@prisma/client/runtime/library'; // Keep for Decimal type
import { AssayType } from '@/lib/types'; // Import AssayType

/**
 * Fetches an OmicsSubject by its ID, including related OmicsResults and Patient data.
 * Mimics the structure returned by the previous Supabase function.
 * 
 * @param subject_id The ID of the subject to fetch.
 * @returns The subject data with related results and patient, or null if not found or on error.
 */
export async function getOmicsSubjectById(subject_id: string): Promise<(
  omics_subjects & { 
    omics_results: omics_results[];
    patient: patients | null; // Use 'patients' type here
  }
) | null> {
  try {
    const subject = await prisma.omics_subjects.findUnique({
      where: { 
        subject_id: subject_id 
      },
      include: {
        // Include related omics_results, order by date
        omics_results: {
          orderBy: {
            date_of_collection: 'desc'
          }
        },
        // Include related patient data via the patient_mrn foreign key
        patients: true // Relation name from schema
      }
    });

    if (!subject) {
      console.warn(`[Prisma] Subject with ID ${subject_id} not found.`);
      return null;
    }

    // The included 'patients' relation contains the single related patient record
    const patientData = subject.patients ?? null;

    // Adjust the return type to match the expected structure, removing the extra 'patients' field from the top level
    const { patients, ...subjectWithoutPatients } = subject; 

    return {
      ...subjectWithoutPatients,
      omics_results: subject.omics_results, // Keep included omics_results
      patient: patientData 
    };

  } catch (error) {
    console.error(`[Prisma] Error fetching subject by ID ${subject_id}:`, error);
    throw error; // Re-throw the error after logging
  }
}

/**
 * Fetches all OmicsSubjects.
 * 
 * @returns An array of all omics_subjects including sample count and latest sample date, or an empty array on error.
 */
export async function getAllOmicsSubjects(): Promise<(omics_subjects & { 
  _count: { omics_results: number },
  latest_sample_date: Date | null
})[]> { // Updated return type
  try {
    // Fetch subjects
    const subjectsData = await prisma.omics_subjects.findMany({
      orderBy: {
        created_at: 'desc' // Or sort by subject_id, etc.
      },
      include: {
        // Include the count of related omics_results
        _count: {
          select: { omics_results: true },
        },
      }
    });

    // Fetch the latest sample date for each subject separately for efficiency
    // (Avoids complex subquery within the main findMany if possible)
    const subjectIds = subjectsData.map(s => s.subject_id);
    const latestDates = await prisma.omics_results.groupBy({
      by: ['subject_id'],
      _max: {
        date_of_collection: true,
      },
      where: {
        subject_id: {
          in: subjectIds,
        },
      },
    });

    // Create a map for easy lookup
    const latestDateMap = new Map<string, Date | null>();
    latestDates.forEach(item => {
      latestDateMap.set(item.subject_id, item._max.date_of_collection);
    });

    // Combine the data
    const subjectsWithCountsAndDates = subjectsData.map(subject => ({
      ...subject,
      latest_sample_date: latestDateMap.get(subject.subject_id) ?? null,
    }));

    return subjectsWithCountsAndDates;
  } catch (error) {
    console.error('[Prisma] Error fetching all subjects with counts/dates:', error);
    return []; // Return empty array on error
  }
}

// --- NEW Prisma Operations ---

/**
 * Creates a new OmicsResult record.
 */
export async function createOmicsResult(data: Prisma.omics_resultsUncheckedCreateInput): Promise<omics_results | null> {
  try {
    // Ensure sample_id is present if not auto-generated based on subject/number
    if (!data.sample_id && data.subject_id && data.sample_number) {
      data.sample_id = `${data.subject_id}-${data.sample_number}`;
    }
    // Prisma handles Decimal conversion automatically if input is number/string
    const result = await prisma.omics_results.create({
      data: data,
    });
    return result;
  } catch (error) {
    console.error('[Prisma] Error creating omics result:', error);
    // Handle potential Prisma errors (e.g., unique constraint violation)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          console.error('Unique constraint violation creating omics result.');
          // Potentially throw a custom error or return specific null/error object
        }
    }
    throw error; // Re-throw the error after logging
  }
}

/**
 * Updates an existing OmicsResult record by its sample_id.
 */
export async function updateOmicsResult(sample_id: string, data: Prisma.omics_resultsUpdateInput): Promise<omics_results | null> {
  try {
    // Remove fields that should not be updated directly if present
    // delete data.sample_id; 
    // delete data.subject_id;
    // delete data.created_at;

    const result = await prisma.omics_results.update({
      where: { sample_id: sample_id },
      data: data,
    });
    return result;
  } catch (error) {
    console.error(`[Prisma] Error updating omics result ${sample_id}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Record to update not found
        if (error.code === 'P2025') {
          console.error(`Omics result with sample_id ${sample_id} not found for update.`);
          return null; // Or throw specific error
        }
    }
    return null;
  }
}

/**
 * Creates a new OmicsSubject record.
 */
export async function createOmicsSubject(data: Prisma.omics_subjectsUncheckedCreateInput): Promise<omics_subjects | null> {
  try {
    const result = await prisma.omics_subjects.create({
      data: data,
    });
    return result;
  } catch (error) {
    console.error('[Prisma] Error creating omics subject:', error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          console.error('Unique constraint violation creating omics subject.');
        }
    }
    return null;
  }
}

/**
 * Creates a new Patient record.
 */
export async function createPatient(data: Prisma.patientsUncheckedCreateInput): Promise<patients | null> {
  try {
    const result = await prisma.patients.create({
      data: data,
    });
    return result;
  } catch (error) {
    console.error('[Prisma] Error creating patient:', error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          console.error('Unique constraint violation creating patient.');
        }
    }
    return null;
  }
}

/**
 * Gets an OmicsResult by its sample_id (needed for GET handler).
 */
export async function getOmicsResultBySampleId(sample_id: string): Promise<(omics_results & { omics_subjects: omics_subjects | null }) | null> {
    try {
        const sample = await prisma.omics_results.findUnique({
            where: { sample_id: sample_id },
            // Include related subject data
            include: { omics_subjects: true } 
        });
        return sample;
    } catch (error) {
        console.error(`[Prisma] Error fetching omics result by sample ID ${sample_id}:`, error);
        return null;
    }
}

/**
 * Fetches all Patient records, potentially including related data.
 */
export async function getAllPatients(): Promise<patients[]> { // Consider adding related data if needed
  try {
    const patientsData = await prisma.patients.findMany({
      orderBy: {
        created_at: 'desc' // Or patient_mrn, etc.
      },
      // Include related data if needed by the patients page
      // include: {
      //   omics_subjects: true, // Example: Include related subjects
      //   // subject_registration: true // Example: Include registrations
      // }
    });
    return patientsData;
  } catch (error) {
    console.error('[Prisma] Error fetching all patients:', error);
    return []; // Return empty array on error
  }
}

/**
 * Updates an OmicsSubject record by its subject_id.
 */
export async function updateOmicsSubject(subject_id: string, data: Prisma.omics_subjectsUpdateInput): Promise<omics_subjects | null> {
  try {
    // Remove fields that should not typically be updated if present
    // delete data.subject_id; 
    // delete data.patient_mrn;
    // delete data.created_at;

    const result = await prisma.omics_subjects.update({
      where: { subject_id: subject_id },
      data: data,
    });
    return result;
  } catch (error) {
    console.error(`[Prisma] Error updating omics subject ${subject_id}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Record to update not found
        if (error.code === 'P2025') {
          console.error(`Omics subject with subject_id ${subject_id} not found for update.`);
          return null; 
        }
    }
    return null;
  }
}

/**
 * Updates a Patient record by its patient_mrn.
 */
export async function updatePatient(patient_mrn: string, data: Prisma.patientsUpdateInput): Promise<patients | null> {
  try {
    // Remove fields that should not typically be updated if present
    // delete data.patient_mrn;
    // delete data.created_at;

    const result = await prisma.patients.update({
      where: { patient_mrn: patient_mrn },
      data: data,
    });
    return result;
  } catch (error) {
    console.error(`[Prisma] Error updating patient ${patient_mrn}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Record to update not found
        if (error.code === 'P2025') {
          console.error(`Patient with MRN ${patient_mrn} not found for update.`);
          return null; 
        }
    }
    return null;
  }
}

/**
 * Fetches all OmicsResult records for a given subject_id.
 */
export async function getOmicsResultsBySubjectId(subject_id: string): Promise<omics_results[]> {
  try {
    const results = await prisma.omics_results.findMany({
      where: { 
        subject_id: subject_id 
      },
      orderBy: {
        date_of_collection: 'desc' // Or sample_number, etc.
      }
      // Do we need to include the related subject data here as well?
      // include: { omics_subjects: true }
    });
    return results;
  } catch (error) {
    console.error(`[Prisma] Error fetching omics results for subject ${subject_id}:`, error);
    return []; // Return empty array on error
  }
}

/**
 * Fetches OmicsResult records filtered by assay type and other optional criteria.
 */
export async function getOmicsResultsByAssayType(
  assay_type: AssayType,
  options?: {
    subject_id?: string;
    start_date?: Date;
    end_date?: Date;
    qc_pass?: boolean; 
  }
): Promise<omics_results[]> { 
  try {
    const dateField = `date_${assay_type.toLowerCase()}` as keyof omics_results;
    const qcField = `qc_pass_${assay_type.toLowerCase()}` as keyof omics_results;
    
    const whereClause: Prisma.omics_resultsWhereInput = {};

    // Apply filters
    if (options?.subject_id) {
      whereClause.subject_id = options.subject_id;
    }
    
    // Date filtering - Apply if field exists in the model's scalar fields
    if (dateField in Prisma.Omics_resultsScalarFieldEnum) {
        const dateFilter: Prisma.DateTimeNullableFilter = {};
        let applyDateFilter = false;
        if (options?.start_date) {
           dateFilter.gte = options.start_date;
           applyDateFilter = true;
        }
        if (options?.end_date) {
           dateFilter.lte = options.end_date;
           applyDateFilter = true;
        }
        if (applyDateFilter) {
            // Directly assign the filter assuming the field is DateTime?
            whereClause[dateField] = dateFilter as any; // Use 'as any' to bypass complex dynamic type check
        }
    }
    
    // QC filtering - Apply if field exists
    if (qcField in Prisma.Omics_resultsScalarFieldEnum) { 
        if (options?.qc_pass !== undefined) {
             whereClause[qcField] = options.qc_pass ? 'Yes' : 'No';
        }
    }
    
    // Order by date if field exists
    const orderByClause: Prisma.omics_resultsOrderByWithRelationInput[] = [];
    if (dateField in Prisma.Omics_resultsScalarFieldEnum) { 
        orderByClause.push({ [dateField]: 'desc' });
    }

    const results = await prisma.omics_results.findMany({
      where: whereClause,
      orderBy: orderByClause,
      // include: { omics_subjects: true }
    });
    
    return results;

  } catch (error) {
    console.error(`[Prisma] Error fetching omics results by assay type ${assay_type}:`, error);
    return []; 
  }
}

/**
 * Fetches a Patient record by their MRN, including related omics subjects and their results.
 */
export async function getPatientByMRN(patient_mrn: string): Promise<(patients & {
  omics_subjects: (omics_subjects & {
    omics_results: omics_results[];
  })[];
}) | null> {
  try {
    const patientData = await prisma.patients.findUnique({
      where: { patient_mrn: patient_mrn },
      include: {
        omics_subjects: { // Include related subjects
          include: {
            omics_results: { // Include results for each subject
              orderBy: {
                date_of_collection: 'desc' // Order results within each subject
              }
            }
          }
        }
      }
    });

    if (!patientData) {
      console.warn(`[Prisma] Patient with MRN ${patient_mrn} not found.`);
      return null;
    }
    
    return patientData;

  } catch (error) {
    console.error(`[Prisma] Error fetching patient by MRN ${patient_mrn}:`, error);
    return null;
  }
}

/**
 * Searches for OmicsSubjects based on a query matching subject_id or patient_mrn.
 */
export async function searchSubjects(query: string): Promise<omics_subjects[]> { // Consider including patient data if needed by caller
  if (!query || query.trim().length < 1) {
    return []; // Return empty if query is empty
  }
  
  const searchTerm = `%${query}%`; // Prepare for case-insensitive search if using raw SQL or ensure mode:'insensitive'

  try {
    const subjects = await prisma.omics_subjects.findMany({
      where: {
        OR: [
          {
            subject_id: {
              contains: query, 
              mode: 'insensitive' // Case-insensitive search for subject_id
            }
          },
          {
            patients: { // Search within the related patients record
              patient_mrn: {
                contains: query,
                mode: 'insensitive' // Case-insensitive search for patient_mrn
              }
            }
          }
        ]
      },
      // Include patient data if the caller needs it
      // include: {
      //   patients: true
      // }
    });
    return subjects;
  } catch (error) {
    console.error(`[Prisma] Error searching subjects with query "${query}":`, error);
    return [];
  }
}

/**
 * Logs an audit event to the audit_log table.
 */
export async function logAuditEvent(
  table_name: string,
  action: string, // e.g., 'INSERT', 'UPDATE', 'DELETE'
  old_data: Record<string, any> | null, // Use more general Record type
  new_data: Record<string, any> | null, // Use more general Record type
  changed_by: string // User ID or identifier
): Promise<boolean> { // Return true on success, false on error
  try {
    await prisma.audit_log.create({
      data: {
        table_name: table_name,
        action: action,
        // Prisma expects specific JSON types, direct assignment should work if DB field is JSON/JSONB
        old_data: old_data ?? Prisma.JsonNull, 
        new_data: new_data ?? Prisma.JsonNull,
        changed_by: changed_by,
        // timestamp is likely handled by DB default (DEFAULT now())
      },
    });
    return true;
  } catch (error) {
    console.error('[Prisma] Error logging audit event:', error);
    return false;
  }
}

/**
 * Gets the total count of OmicsResult records.
 */
export async function getOmicsResultsCount(): Promise<number> {
  try {
    const count = await prisma.omics_results.count();
    return count;
  } catch (error) {
    console.error('[Prisma] Error getting omics results count:', error);
    return 0; // Return 0 on error
  }
}

// You can add other Prisma-based data operations here... 
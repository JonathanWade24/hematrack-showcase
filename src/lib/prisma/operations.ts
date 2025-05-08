// Remove Prisma imports
// import { prisma } from '@/lib/prisma'; 
// import { omics_subjects, omics_results, patients, Prisma } from '@prisma/client';
// import { Decimal } from '@prisma/client/runtime/library';

// Add Drizzle imports
// import { db } from '@/lib/db'; // Attempting relative path due to error
import { db } from '../db/index'; // Try direct import

// Import directly from schema file first
import { 
    omics_subjectsInLaboratory, 
    samplesInLaboratory, 
    patientsInClinical, 
    subject_registrationInClinical, 
    // Import staging tables instead of missing clinical ones
    raw_ip_medsInStaging, 
    raw_op_avsInStaging, 
    raw_ip_admissionsInStaging,
    // Other required tables
    visitsInClinical,
    visit_diagnosesInClinical,
    lab_ordersInClinical,
    lab_resultsInClinical,
    medication_administrationsInClinical,
    // audit_log // Commented out - not found in schema.ts
} from '../db/schema/schema'; 

import { eq, desc, inArray, count, max, or, like, sql } from 'drizzle-orm'; // Import Drizzle operators
import { PgTable } from 'drizzle-orm/pg-core';

import { AssayType } from '@/lib/types'; // Import AssayType

// Define the expected return type using Drizzle schema types
// Note: Using generated types directly. Adjust if needed.
type OmicsSubjectSelect = typeof omics_subjectsInLaboratory.$inferSelect;
type SampleSelect = typeof samplesInLaboratory.$inferSelect;
type PatientSelect = typeof patientsInClinical.$inferSelect;

type OmicsSubjectWithDetails = OmicsSubjectSelect & {
  samples: SampleSelect[];
  patient: PatientSelect | null;
};

/**
 * Fetches an OmicsSubject by its ID, including related Samples (ordered) and Patient data.
 * Adapts the goal of the original function to the new database schema.
 * 
 * @param subject_id The ID of the subject to fetch.
 * @returns The subject data with related samples and patient, or null if not found or on error.
 */
export async function getOmicsSubjectById(subject_id: string): Promise<OmicsSubjectWithDetails | null> {
  try {
    const subjectData = await db.query.omics_subjectsInLaboratory.findFirst({
      where: eq(omics_subjectsInLaboratory.subject_id, subject_id),
      with: {
        // Include related samples, ordered by date
        samplesInLaboratories: {
          // orderBy: (samples: typeof samplesInLaboratory, { desc }: { desc: typeof desc }) => [desc(samples.date_of_collection)],
          orderBy: [desc(samplesInLaboratory.date_of_collection)], // Use array syntax
        },
        // Include related registrations to get the patient
        subject_registrationInClinicals: {
          with: {
            patientsInClinical: true, // Include the patient linked to the registration
          },
        },
      },
    });

    if (!subjectData) {
      console.warn(`[Drizzle] Subject with ID ${subject_id} not found.`);
      return null;
    }

    // Extract the patient data
    // Assuming one registration per subject; handle potential multiple registrations if needed
    const patientData = subjectData.subject_registrationInClinicals?.[0]?.patientsInClinical ?? null;

    // Manually construct to avoid spreading potentially unwanted relations fields
    const result: OmicsSubjectWithDetails = {
      subject_id: subjectData.subject_id,
      patient_mrn: subjectData.patient_mrn, 
      project: subjectData.project,
      created_at: subjectData.created_at,
      updated_at: subjectData.updated_at,
      samples: subjectData.samplesInLaboratories,
      patient: patientData,
    };

    return result;

  } catch (error) {
    console.error(`[Drizzle] Error fetching subject by ID ${subject_id}:`, error);
    // Consider more specific error handling if needed
    throw error; // Re-throw the error after logging
  }
}

// Define type alias for clarity
type OmicsSubjectWithCountAndDate = OmicsSubjectSelect & { 
  _count: { samplesInLaboratories: number };
  latest_sample_date: Date | null;
};

/**
 * Fetches all OmicsSubjects including sample count and latest sample date.
 * @returns An array of subjects or an empty array on error.
 */
export async function getAllOmicsSubjects(): Promise<OmicsSubjectWithCountAndDate[]> {
  try {
    // Fetch subjects and count of samples using Drizzle's relation counting
    // Need to fetch actual samples to count them correctly in the map phase
    const subjectsData = await db.query.omics_subjectsInLaboratory.findMany({
      // orderBy: (subjects, { desc }) => [desc(subjects.created_at)],
      orderBy: [desc(omics_subjectsInLaboratory.created_at)], // Use array syntax
      with: {
        samplesInLaboratories: { columns: { sample_id: true } } // Fetch sample IDs for counting
      }
    });

    // Fetch the latest sample date for each subject separately
    const subjectIds = subjectsData.map((s: OmicsSubjectSelect) => s.subject_id);
    if (subjectIds.length === 0) return []; // No subjects, return early

    const latestDatesQuery = await db
      .select({
        subject_id: samplesInLaboratory.subject_id,
        latest_date: max(samplesInLaboratory.date_of_collection),
      })
      .from(samplesInLaboratory)
      .where(inArray(samplesInLaboratory.subject_id, subjectIds))
      .groupBy(samplesInLaboratory.subject_id);

    // Create a map for easy lookup
    const latestDateMap = new Map<string, Date | null>();
    latestDatesQuery.forEach((item: { subject_id: string; latest_date: string | null }) => {
      // Drizzle returns dates as strings by default, convert them
      latestDateMap.set(item.subject_id, item.latest_date ? new Date(item.latest_date) : null);
    });

    // Combine the data
    // Add type annotation for subject in map
    const subjectsWithCountsAndDates = subjectsData.map((subject: OmicsSubjectSelect & { samplesInLaboratories: { sample_id: string }[] }): OmicsSubjectWithCountAndDate => ({
      ...subject,
      _count: { samplesInLaboratories: subject.samplesInLaboratories.length }, // Count the fetched sample IDs
      latest_sample_date: latestDateMap.get(subject.subject_id) ?? null,
    }));

    return subjectsWithCountsAndDates;
  } catch (error) {
    console.error('[Drizzle] Error fetching all subjects with counts/dates:', error);
    return []; // Return empty array on error
  }
}

// --- NEW Drizzle Operations ---

type SampleInsert = typeof samplesInLaboratory.$inferInsert;
type SampleUpdate = Partial<SampleInsert>; // Use Partial for updates

/**
 * Creates a new Sample record (formerly OmicsResult).
 */
export async function createOmicsResult(data: SampleInsert): Promise<SampleSelect | null> {
  try {
    // Ensure sample_id is present if not auto-generated based on subject/number
    if (!data.sample_id && data.subject_id && data.sample_number) {
      data.sample_id = `${data.subject_id}-${data.sample_number}`;
    }
    // Drizzle expects numbers/strings for numeric/decimal types
    const result = await db.insert(samplesInLaboratory).values(data).returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('[Drizzle] Error creating sample:', error);
    // Basic error check for unique constraint (adapt based on actual error messages)
    if (error instanceof Error && /unique constraint/i.test(error.message)) {
        console.error('Unique constraint violation creating sample.');
        // Potentially throw a custom error or return specific null/error object
    }
    // Throw the original error or a custom one
    throw error; 
  }
}

/**
 * Updates an existing Sample record by its sample_id.
 */
export async function updateOmicsResult(sample_id: string, data: SampleUpdate): Promise<SampleSelect | null> {
  try {
    // Remove fields that should not be updated directly if present in data
    const { sample_id: _, subject_id: __, created_at: ___, ...updateData } = data;

    if (Object.keys(updateData).length === 0) {
       console.warn('[Drizzle] No valid fields provided for update.');
       // Fetch and return the existing record if needed, or return null/error
       return await getOmicsResultBySampleId(sample_id);
    }

    const result = await db
        .update(samplesInLaboratory)
        .set(updateData)
        .where(eq(samplesInLaboratory.sample_id, sample_id))
        .returning();
        
    if (result.length === 0) {
        console.error(`Sample with sample_id ${sample_id} not found for update.`);
        return null; // Record not found
    }
    return result[0];
  } catch (error) {
    console.error(`[Drizzle] Error updating sample ${sample_id}:`, error);
     // Basic error check (adapt based on actual error messages if needed)
     // Drizzle/pg might not have specific error codes like Prisma's P2025
     // Check if the update returned an empty array (handled above)
    return null;
  }
}

type OmicsSubjectInsert = typeof omics_subjectsInLaboratory.$inferInsert;
type OmicsSubjectUpdate = Partial<OmicsSubjectInsert>; // Use Partial

/**
 * Creates a new OmicsSubject record.
 */
export async function createOmicsSubject(data: OmicsSubjectInsert): Promise<OmicsSubjectSelect | null> {
  try {
    const result = await db.insert(omics_subjectsInLaboratory).values(data).returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('[Drizzle] Error creating omics subject:', error);
     if (error instanceof Error && /unique constraint/i.test(error.message)) {
        console.error('Unique constraint violation creating omics subject.');
     }
    // Decide whether to return null or re-throw
    // return null;
    throw error;
  }
}

type PatientInsert = typeof patientsInClinical.$inferInsert;
type PatientUpdate = Partial<PatientInsert>; // Use Partial

/**
 * Creates a new Patient record.
 */
export async function createPatient(data: PatientInsert): Promise<PatientSelect | null> {
  try {
    const result = await db.insert(patientsInClinical).values(data).returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('[Drizzle] Error creating patient:', error);
     if (error instanceof Error && /unique constraint/i.test(error.message)) {
        console.error('Unique constraint violation creating patient.');
     }
    // return null;
    throw error;
  }
}

/**
 * Gets a Sample by its sample_id (formerly OmicsResult).
 */
export async function getOmicsResultBySampleId(sample_id: string): Promise<SampleSelect | null> {
    try {
        // Note: Original function included omics_subjects. 
        // Decide if this is still needed. If so, use db.query...findFirst with `with`
        const sample = await db.select().from(samplesInLaboratory).where(eq(samplesInLaboratory.sample_id, sample_id)).limit(1);
        return sample[0] ?? null;
    } catch (error) {
        console.error(`[Drizzle] Error fetching sample by sample ID ${sample_id}:`, error);
        return null;
    }
}

/**
 * Fetches all Patient records.
 */
export async function getAllPatients(): Promise<PatientSelect[]> {
  try {
    // Original included related data optionally. Add `with` clause if needed.
    const patientsData = await db.query.patientsInClinical.findMany({
      // orderBy: (patients, {desc}) => [desc(patients.created_at)] 
      orderBy: [desc(patientsInClinical.created_at)] // Use array syntax
    });
    return patientsData;
  } catch (error) {
    console.error('[Drizzle] Error fetching all patients:', error);
    return []; // Return empty array on error
  }
}

/**
 * Updates an OmicsSubject record by its subject_id.
 */
export async function updateOmicsSubject(subject_id: string, data: OmicsSubjectUpdate): Promise<OmicsSubjectSelect | null> {
  try {
    // Remove fields that should not typically be updated if present
    const { subject_id: _, created_at: __, patient_mrn: ___, ...updateData } = data; 

    if (Object.keys(updateData).length === 0) {
       console.warn('[Drizzle] No valid fields provided for omics subject update.');
       // Fetch and return existing or handle as error
       return await db.query.omics_subjectsInLaboratory.findFirst({ where: eq(omics_subjectsInLaboratory.subject_id, subject_id)}) ?? null;
    }

    const result = await db
        .update(omics_subjectsInLaboratory)
        .set(updateData)
        .where(eq(omics_subjectsInLaboratory.subject_id, subject_id))
        .returning();

    if (result.length === 0) {
        console.error(`Omics subject with subject_id ${subject_id} not found for update.`);
        return null;
    }
    return result[0];
  } catch (error) {
    console.error(`[Drizzle] Error updating omics subject ${subject_id}:`, error);
    // Add specific checks if needed, e.g., constraint violations
    return null;
  }
}

/**
 * Updates a Patient record by its patient_mrn.
 */
export async function updatePatient(patient_mrn: string, data: PatientUpdate): Promise<PatientSelect | null> {
  try {
    // Remove fields that should not typically be updated
    const { patient_mrn: _, created_at: __, ...updateData } = data;

    if (Object.keys(updateData).length === 0) {
       console.warn('[Drizzle] No valid fields provided for patient update.');
       return await db.query.patientsInClinical.findFirst({ where: eq(patientsInClinical.patient_mrn, patient_mrn)}) ?? null;
    }

    const result = await db
        .update(patientsInClinical)
        .set(updateData)
        .where(eq(patientsInClinical.patient_mrn, patient_mrn))
        .returning();

    if (result.length === 0) {
        console.error(`Patient with MRN ${patient_mrn} not found for update.`);
        return null;
    }
    return result[0];
  } catch (error) {
    console.error(`[Drizzle] Error updating patient ${patient_mrn}:`, error);
     // Add specific checks if needed
    return null;
  }
}

/**
 * Fetches all Sample records for a given subject_id.
 */
export async function getOmicsResultsBySubjectId(subject_id: string): Promise<SampleSelect[]> {
  try {
    const results = await db.query.samplesInLaboratory.findMany({
      where: eq(samplesInLaboratory.subject_id, subject_id),
      // orderBy: (samples, { desc }) => [desc(samples.date_of_collection)],
      orderBy: [desc(samplesInLaboratory.date_of_collection)], // Use array syntax
    });
    return results;
  } catch (error) {
    console.error(`[Drizzle] Error fetching samples for subject ${subject_id}:`, error);
    return []; // Return empty array on error
  }
}

// NOTE: getOmicsResultsByAssayType is complex due to dynamic field names.
// This function assumed omics_results had columns like date_advia, qc_pass_advia, etc.
// With the new structure (samples -> results_advia), this needs a complete rethink.
// Option 1: Fetch samples and then filter/join specific results tables based on assay_type.
// Option 2: If possible, create a DB view that unnests/joins the assay results back to samples.
// Option 3: Perform separate queries for each assay type and combine.
// For now, this function will be commented out as it requires significant changes.
/*
export async function getOmicsResultsByAssayType(
  assay_type: AssayType,
  options?: {
    subject_id?: string;
    start_date?: Date;
    end_date?: Date;
    qc_pass?: boolean; 
  }
): Promise<SampleSelect[]> { 
  console.warn("getOmicsResultsByAssayType needs refactoring for the new schema structure.");
  return [];
  // ... implementation needs significant changes ...
}
*/

// Type for the complex nested patient data structure
type PatientWithNestedSubjectsAndSamples = PatientSelect & {
  subject_registrations: (SubjectRegistrationSelect & { // Using registration as the link
      omics_subject: (OmicsSubjectSelect & {
          samples: SampleSelect[];
      }) | null; // Subject might be nullable depending on FK constraints
  })[];
};

// Type alias for SubjectRegistration
type SubjectRegistrationSelect = typeof subject_registrationInClinical.$inferSelect;

/**
 * Fetches a Patient record by their MRN, including related subjects and their samples.
 * Adapts to the new schema: Patient -> SubjectRegistration -> OmicsSubject -> Samples
 */
export async function getPatientByMRN(patient_mrn: string): Promise<PatientWithNestedSubjectsAndSamples | null> {
  try {
    const patientData = await db.query.patientsInClinical.findFirst({
      where: eq(patientsInClinical.patient_mrn, patient_mrn),
      with: {
        // Follow the link: Patient -> SubjectRegistration
        subject_registrationInClinicals: {
          with: {
            // Follow the link: SubjectRegistration -> OmicsSubject
            omics_subjectsInLaboratory: {
              with: {
                // Follow the link: OmicsSubject -> Samples
                samplesInLaboratories: {
                  // orderBy: (samples, { desc }) => [desc(samples.date_of_collection)],
                   orderBy: [desc(samplesInLaboratory.date_of_collection)], // Use array syntax
                },
              },
            },
          },
        },
      },
    });

    if (!patientData) {
      console.warn(`[Drizzle] Patient with MRN ${patient_mrn} not found.`);
      return null;
    }

    // Add type annotation for reg parameter
    const result: PatientWithNestedSubjectsAndSamples = {
        ...patientData,
        subject_registrations: patientData.subject_registrationInClinicals.map((reg: SubjectRegistrationSelect & { omics_subjectsInLaboratory?: OmicsSubjectSelect & { samplesInLaboratories: SampleSelect[] } }) => ({
            ...reg,
            omics_subject: reg.omics_subjectsInLaboratory ? { 
                ...reg.omics_subjectsInLaboratory,
                samples: reg.omics_subjectsInLaboratory.samplesInLaboratories
            } : null
        }))
    };

    return result;

  } catch (error) {
    console.error(`[Drizzle] Error fetching patient by MRN ${patient_mrn}:`, error);
    return null;
  }
}

/**
 * Searches for OmicsSubjects based on a query matching subject_id or patient_mrn.
 */
export async function searchSubjects(query: string): Promise<OmicsSubjectSelect[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const lowerQuery = query.toLowerCase(); // Prepare for case-insensitive-like search

  try {
    // Simplified search: Use simple like, case sensitivity depends on DB collation
    // TODO: Implement robust search across related patient MRN via registration if needed
    const subjects = await db.query.omics_subjectsInLaboratory.findMany({
        where: or(
            like(omics_subjectsInLaboratory.subject_id, `%${query}%`), 
            like(omics_subjectsInLaboratory.patient_mrn, `%${query}%`) // Assumes patient_mrn is directly on subject 
        ),
         orderBy: [sql`subject_id`] // Use sql helper for column name sorting
    });
    
    console.warn("searchSubjects currently uses simplified search logic (case-sensitivity may vary).");
    return subjects; 

  } catch (error) {
    console.error(`[Drizzle] Error searching subjects with query "${query}":`, error);
    return [];
  }
}

// If audit_log is in a specific schema (e.g., 'app'), use that schema object.
// import { audit_log } from '../db/schema/schema'; // Import confirmed above

/**
 * Logs an audit event to the audit_log table.
 */
export async function logAuditEvent(
  table_name: string,
  action: string, // e.g., 'INSERT', 'UPDATE', 'DELETE'
  old_data: Record<string, any> | null, 
  new_data: Record<string, any> | null,
  changed_by: string // User ID or identifier
): Promise<boolean> { 
  try {
    // await db.insert(audit_log).values({ // This line uses audit_log
    //   table_name: table_name,
    //   action: action,
    //   old_data: old_data,
    //   new_data: new_data,
    //   changed_by: changed_by,
    // });
    console.warn("logAuditEvent is disabled as audit_log table was not found in schema.");
    return false; // Return false as the operation cannot be performed
  } catch (error) {
    console.error('[Drizzle] Error logging audit event:', error);
    return false;
  }
}

/**
 * Gets the total count of Sample records.
 */
export async function getOmicsResultsCount(): Promise<number> {
  try {
    const result = await db.select({ value: count() }).from(samplesInLaboratory);
    return result[0]?.value ?? 0;
  } catch (error) {
    console.error('[Drizzle] Error getting samples count:', error);
    return 0; // Return 0 on error
  }
}

// NOTE: getAllVisits and getVisitDetailsByMrn operated on a 'unified_visits' table/view.
// This likely needs significant adaptation based on the NEW schema.
// Does a unified_visits view/table exist? If not, these functions need to be 
// rewritten to query the base tables (e.g., clinical.visits, staging tables?) 
// and potentially combine the data in the application layer or a new DB view.

// Placeholder types assuming a similar structure might be derived
// These need verification against the actual schema/replacement logic
// import { visitsInClinical } from '../db/schema'; // Imported above
type VisitSelect = typeof visitsInClinical.$inferSelect;

/**
 * Fetches all Visit records (NEEDS REWRITING BASED ON NEW SCHEMA).
 * Original used 'unified_visits'. How is visit data now represented?
 */
export async function getAllVisits(): Promise<(VisitSelect & { patient: PatientSelect | null })[]> { 
  console.warn("getAllVisits likely needs further adaptation based on actual schema relations.");
  try {
      const visitsData = await db.query.visitsInClinical.findMany({
          orderBy: [desc(visitsInClinical.visit_start_datetime)], // Use correct date field
          with: {
              patientsInClinical: true // Assuming relation name is patientsInClinical
          }
      });
      
      return visitsData.map((v: typeof visitsInClinical.$inferSelect & { patientsInClinical: PatientSelect | null}) => ({
          ...v,
          patient: v.patientsInClinical 
      }));

  } catch (error) {
      console.error('[Drizzle] Error fetching visits (refactored):', error);
      return [];
  }
}

// --- Types for getVisitDetailsByMrn (Marked for full refactor) ---

interface CombinedMedication {
  name: string | null; 
  dosage?: string | null;
  unit?: string | null;
  frequency?: string | null;
  source: 'IP_RAW' | 'OP_RAW'; // Reflect staging source
  taken_time?: Date | string | null; 
  order_dttm?: Date | string | null;
  rx_status?: string | null;
}

interface DetailedDiagnosis {
  code: string;
  description: string | null;
  type: string; 
  sequence: number | null;
}

interface LabResultForViewer {
  name: string | null;
  value: string | null;
  time?: Date | string | null; 
  units?: string | null; 
}

type VisitWithDetails = VisitSelect & { 
    medications: CombinedMedication[];
    detailed_diagnoses: DetailedDiagnosis[];
    labs: LabResultForViewer[];
    // Add relations used inside the mapping function if not part of VisitSelect
    visit_diagnosesInClinicals?: (typeof visit_diagnosesInClinical.$inferSelect)[];
    lab_ordersInClinicals?: (typeof lab_ordersInClinical.$inferSelect & {
        lab_resultsInClinicals?: (typeof lab_resultsInClinical.$inferSelect)[];
    })[];
    medication_administrationsInClinicals?: (typeof medication_administrationsInClinical.$inferSelect)[];
};
type PatientWithVisitDetails = PatientSelect & { visits: VisitWithDetails[] };

/**
 * Fetches detailed visit information for a patient (NEEDS COMPLETE REFACTORING).
 * Original relied on 'unified_visits' and specific related tables from clinical schema.
 * New implementation must query clinical.visits and join/map data from staging tables
 * (raw_ip_meds, raw_op_avs, raw_ip_admissions) and clinical tables 
 * (visit_diagnoses, lab_results via lab_orders).
 * This requires a complex query or multiple queries + application-level merging.
 */
export async function getVisitDetailsByMrn(patientMrn: string): Promise<PatientWithVisitDetails | null> {
  console.error("getVisitDetailsByMrn function requires a complete rewrite for the new schema using staging tables. Returning null.");
  if (!patientMrn) {
    console.warn('[Drizzle getVisitDetailsByMrn] No MRN provided.');
    return null;
  }
  
  // TODO: Rewrite this function entirely.
  // 1. Fetch patient and their clinical.visits (ordered).
  // 2. Fetch relevant staging data for the patient (raw_ip_meds, raw_op_avs, raw_ip_admissions).
  // 3. Fetch relevant clinical data for the patient (visit_diagnoses, lab_results).
  // 4. Iterate through visits, correlating staging/clinical data to each visit based on timeframe/IDs.
  // 5. Structure the combined data into the PatientWithVisitDetails format.
  
  return null; // Returning null until properly refactored.

  /* --- Commenting out old attempt --- 
  try {
    // Step 1: Fetch patient and their clinical visits
    const patientData = await db.query.patientsInClinical.findFirst({
      where: eq(patientsInClinical.patient_mrn, patientMrn),
      with: {
        visitsInClinicals: {
          orderBy: [desc(visitsInClinical.visit_start_datetime)], // Use correct field
          with: {
              medication_administrationsInClinicals: true, 
              visit_diagnosesInClinicals: true, 
              lab_ordersInClinicals: { with: { lab_resultsInClinicals: true } } 
          }
        }
      }
    });

    if (!patientData) {
      console.warn(`[Drizzle getVisitDetailsByMrn] Patient not found for MRN: ${patientMrn}`);
      return null;
    }
    
    // Step 2: Fetch other potentially related data IF NOT linked via visits
     const [allIpMeds, allOpMeds] = await Promise.all([
         db.query.raw_ip_medsInStaging.findMany({ where: eq(raw_ip_medsInStaging.PATIENT_MRN, patientMrn), orderBy: [sql`taken_time`] }), // Use raw table
         db.query.raw_op_avsInStaging.findMany({ where: eq(raw_op_avsInStaging.PATIENT_MRN, patientMrn), orderBy: [sql`order_dttm`] }) // Use raw table
      ]);

    // Step 3: Map details to each visit (Complex logic dependent on schema links)
    const visitsWithDetails = patientData.visitsInClinicals.map((visit: VisitWithDetails) => { 
      const visitStart = visit.visit_start_datetime; // Use correct field
      const visitEnd = visit.visit_end_datetime ?? new Date(visitStart?.getTime() ?? 0 + 24 * 60 * 60 * 1000); 

      // --- Medication Mapping (Needs adaptation for raw staging data structures) --- 
      const relevantIpMeds: CombinedMedication[] = allIpMeds
        .filter((med: typeof raw_ip_medsInStaging.$inferSelect) => med.TAKEN_TIME && visitStart && new Date(med.TAKEN_TIME) >= visitStart && new Date(med.TAKEN_TIME) <= visitEnd)
        .map((med: typeof raw_ip_medsInStaging.$inferSelect) => ({ source: 'IP_RAW', name: med.MEDICATION, taken_time: med.TAKEN_TIME, dosage: med.DOSAGE, unit: med.UNIT, frequency: med.FREQUENCY }));
      
      const relevantOpMeds: CombinedMedication[] = allOpMeds
         .filter((med: typeof raw_op_avsInStaging.$inferSelect) => med.ORDER_DTTM && visitStart && new Date(med.ORDER_DTTM) >= visitStart && new Date(med.ORDER_DTTM) <= visitEnd) 
         .map((med: typeof raw_op_avsInStaging.$inferSelect) => ({ source: 'OP_RAW', name: med.GENERIC_DESCRIPTION, order_dttm: med.ORDER_DTTM, rx_status: med.RX_STATUS }));
         
      const combinedMeds = [...relevantIpMeds, ...relevantOpMeds].sort((a, b) => {
          const dateA = a.taken_time || a.order_dttm;
          const dateB = b.taken_time || b.order_dttm;
          if (!dateA) return 1; if (!dateB) return -1;
          return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

      // --- Diagnosis Mapping --- 
      const detailedDiagnoses: DetailedDiagnosis[] = visit.visit_diagnosesInClinicals?.map((diag: typeof visit_diagnosesInClinical.$inferSelect) => ({
          code: diag.icd10_code ?? 'N/A',
          description: diag.diagnosis_name,
          type: diag.diagnosis_type ?? 'Unknown',
          sequence: diag.sequence_num
      })) ?? [];

      // --- Lab Mapping --- 
      const relevantLabs: LabResultForViewer[] = visit.lab_ordersInClinicals?.flatMap((order: typeof lab_ordersInClinical.$inferSelect & { lab_resultsInClinicals?: (typeof lab_resultsInClinical.$inferSelect)[] }) => 
          order.lab_resultsInClinicals?.map((lab: typeof lab_resultsInClinical.$inferSelect) => ({
              name: lab.component_name,
              value: lab.result_value,
              time: lab.result_time, 
              units: lab.units
          })) ?? []
      ) ?? [];

      const detailedVisit: VisitWithDetails = {
        ...visit,
        medications: combinedMeds,
        detailed_diagnoses: detailedDiagnoses,
        labs: relevantLabs
      };
      return detailedVisit;
    });

    const result: PatientWithVisitDetails = {
      ...patientData,
      visits: visitsWithDetails,
    };
    return result;

  } catch (error) {
    console.error(`[Drizzle getVisitDetailsByMrn] Error fetching data for MRN ${patientMrn}:`, error);
    return null;
  }
  */
}

// You can add other Drizzle-based data operations here... 
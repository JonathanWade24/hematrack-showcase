// Drizzle query functions will be implemented here

import { db } from './index'; // Import Drizzle instance
// Import schema table objects needed
import { 
  omics_subjectsInLaboratory as omics_subjects_table, 
  // Import ALL relevant results tables
  results_dnaInLaboratory as results_dna_table, 
  results_plasmaInLaboratory as results_plasma_table,
  results_pbmcInLaboratory as results_pbmc_table,
  results_adhesionInLaboratory as results_adhesion_table,
  results_adviaInLaboratory as results_advia_table,
  results_fcellsInLaboratory as results_fcells_table,
  results_lorrcaInLaboratory as results_lorrca_table,
  results_viscosityInLaboratory as results_viscosity_table,
  // Other tables
  patientsInClinical as patients_table,
  subject_registrationInClinical as subject_registration_table,
  samplesInLaboratory as samples_table, // Needed for linking results
  visitsInClinical,
  lab_ordersInClinical, // Corrected: Assuming this is the table for lab results linked to visits
  medication_ordersInClinical, 
  visit_diagnosesInClinical, // Corrected: from diagnosesInClinical
  lab_resultsInClinical, // Assuming this is the correct table name
} from './schema'; 
// Import Drizzle utility functions
import { eq, desc, inArray, sql, asc, count, max, SQL, isNotNull, AnyColumn } from 'drizzle-orm'; 
import * as schema from './schema'; // Import all schema objects
import { SampleData, FormSectionProps } from '@/components/data-entry/form-sections/types'; // Import the form data type

// Helper function to parse numeric strings to number | null
const parseNumericStringToNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value); // Use Number() as it handles numeric inputs directly too
  return isNaN(num) ? null : num;
};

// Define the type for QC status in the form
type QcStatusForm = 'Yes' | 'No' | 'Review' | null;

// Helper function to map database QC string to form QC status type
const mapDbQcToFormQc = (dbValue: string | null | undefined): QcStatusForm => {
  if (dbValue === 'Yes' || dbValue === 'No' || dbValue === 'Review') {
    return dbValue;
  }
  // Consider logging an unexpected dbValue if it's not null/undefined and not one of the expected strings
  // console.warn(`Unexpected QC value from DB: ${dbValue}`);
  return null; // Default to null if an unexpected string is encountered
};

// --- Reusable Types --- 
export type Patient = typeof patients_table.$inferSelect;
export type OmicsSubject = typeof omics_subjects_table.$inferSelect;
// Define specific result types
export type ResultDna = typeof results_dna_table.$inferSelect;
export type ResultPlasma = typeof results_plasma_table.$inferSelect;
export type ResultPbmc = typeof results_pbmc_table.$inferSelect;
export type ResultAdhesion = typeof results_adhesion_table.$inferSelect;
export type ResultAdvia = typeof results_advia_table.$inferSelect;
export type ResultFcells = typeof results_fcells_table.$inferSelect;
export type ResultLorca = typeof results_lorrca_table.$inferSelect;
export type ResultViscosity = typeof results_viscosity_table.$inferSelect;
// Sample type might be useful if intermediate data is needed
export type Sample = typeof samples_table.$inferSelect;

// Type for Subject ONLY - relations removed for debugging
export type SubjectBase = OmicsSubject;

// Type for Subject with Patient relation
export type SubjectWithPatient = OmicsSubject & {
    patient: Patient | null;
    // Add results fields later
};

// Updated type for Subject with Patient and nested results via Samples
export type SubjectWithDetails = OmicsSubject & {
    patient: Patient | null;
    samplesInLaboratories?: (Sample & { // Use relation name from relations.ts
        // Use relation names from relations.ts for nested results
        results_dnaInLaboratories?: ResultDna[]; 
        results_plasmaInLaboratories?: ResultPlasma[];
        results_pbmcInLaboratories?: ResultPbmc[];
        results_adhesionInLaboratories?: ResultAdhesion[];
        results_adviaInLaboratories?: ResultAdvia[];
        results_fcellsInLaboratories?: ResultFcells[];
        results_lorrcaInLaboratories?: ResultLorca[];
        results_viscosityInLaboratories?: ResultViscosity[];
    })[];
};

// Type for Subject with Patient relation, without samples/results
export type SubjectWithPatientBasic = OmicsSubject & {
    patient: Patient | null;
};

// Updated type for Subject list, including patient, sample count, and latest date
export type SubjectListItem = OmicsSubject & {
    patient: Patient | null;
    sample_count: number;
    latest_sample_date: string | null; // Use string for final serialized date passed out
};

// Type for getAllSamplesWithStatusFields return
// Combines Sample fields with fields from relevant results tables
export type SampleWithStatusFields = Sample & {
    // From results_advia (numeric fields become string | null)
    rbc_advia?: string | null;
    hb_advia?: string | null;
    hct_advia?: string | null;
    mcv_advia?: string | null;
    mch_advia?: string | null;
    mchc_advia?: string | null;
    rdw_advia?: string | null;
    plt_advia?: string | null;
    wbc_advia?: string | null;
    qc_pass_advia?: string | null;
    // From results_dna (numeric fields become string | null)
    concentration_1_dna?: string | null;
    qc_pass_dna?: string | null;
    // From results_pbmc (numeric fields become string | null)
    cell_number_1_pbmc?: string | null;
    // From results_plasma (numeric fields become string | null)
    vol_plasma_1?: string | null;
    // From results_lorrca (numeric fields become string | null)
    ei_min_lorrca?: string | null;
    ei_max_lorrca?: string | null;
    qc_pass_lorrca?: string | null;
};

// Type for getSampleByIdWithResults return
// Includes Sample, all Results fields, and optionally Subject/Patient
export type SampleWithAllResults = Sample & {
    omics_subjectsInLaboratory?: OmicsSubject & { // Optional subject
        patientsInClinical?: Patient | null; // Optional patient
    } | null;
    results_dnaInLaboratories?: ResultDna[]; // Use relation names
    results_plasmaInLaboratories?: ResultPlasma[];
    results_pbmcInLaboratories?: ResultPbmc[];
    results_adhesionInLaboratories?: ResultAdhesion[];
    results_adviaInLaboratories?: ResultAdvia[];
    results_fcellsInLaboratories?: ResultFcells[];
    results_lorrcaInLaboratories?: ResultLorca[];
    results_viscosityInLaboratories?: ResultViscosity[];
};

// --- Type for Patient Creation ---
export type NewPatient = typeof patients_table.$inferInsert;

// --- Type for Omics Subject Creation ---
export type NewOmicsSubject = typeof omics_subjects_table.$inferInsert;

// --- Type for Sample Data from Form ---
// This should match the structure received from the SampleEntryForm
// We might need to refine this based on the exact form data keys
export type SampleFormData = Record<string, any>; // Use a more specific type if available

// Type for the query result including optional subject_id
export type PatientWithSubjectId = typeof patients_table.$inferSelect & { 
    subject_id: string | null 
};

// Updated type for nested lab results within lab orders
export type LabOrderWithResults = typeof lab_ordersInClinical.$inferSelect & {
  lab_results?: Array<typeof lab_resultsInClinical.$inferSelect>; // Assuming relation name is lab_results
};

// Updated type for PatientTimelineData with nested lab results
export type PatientTimelineData = {
  patient: (typeof patients_table.$inferSelect) | null;
  visits: Array<typeof visitsInClinical.$inferSelect & {
    lab_ordersInClinicals?: Array<typeof lab_ordersInClinical.$inferSelect>; // Keep relation name
    medication_ordersInClinicals?: Array<typeof medication_ordersInClinical.$inferSelect>; 
    visit_diagnosesInClinicals?: Array<typeof visit_diagnosesInClinical.$inferSelect>; 
  }>;
  samples: Array<typeof samples_table.$inferSelect>; 
};

// Type for the result of getAllVisitsForListView
// Explicitly list necessary fields from visitsInClinical plus joined patient fields
export type VisitForListView = {
  visit_id: string;
  patient_mrn: string;
  visit_type: string | null;
  start_date: Date | null; // Drizzle might return string, ensure conversion on client
  end_date: Date | null;   // Drizzle might return string, ensure conversion on client
  department_name: string | null;
  // Patient fields
  patient_first_name: string | null;
  patient_last_name: string | null;
  // Add other fields from visitsInClinical if needed for the list view
  // e.g., icu_admission, etc.
};

export type PaginatedVisitsResponse = {
  visits: VisitForListView[];
  totalVisits: number;
};

// --- Type for Subject Detail Page ---
export type SubjectSampleListItem = typeof samples_table.$inferSelect & {
  // Add any specific fields from sample if needed beyond the base, but base should be fine.
};

export type SubjectDetailsPageData = OmicsSubject & {
  patient: Patient | null; // From patientsInClinical relation
  samples: SubjectSampleListItem[]; // From samplesInLaboratories relation, ordered by date
};

// --- Query Functions Implementation --- 

/**
 * Fetches an OmicsSubject by its ID, including related Patient data directly
 * and all related laboratory results (via samples).
 * 
 * @param subject_id The ID of the subject to fetch.
 * @returns The subject data with patient and results, or null if not found.
 */
export async function getOmicsSubjectById(subject_id: string): Promise<SubjectWithDetails | null> {
  console.log(`[Queries] getOmicsSubjectById called with ID: ${subject_id}`);
  try {
    console.log(`[Queries] Executing findFirst query for ${subject_id} with ALL relations...`); // Updated log
    const subjectData = await db.query.omics_subjectsInLaboratory.findFirst({
      where: eq(omics_subjects_table.subject_id, subject_id),
      with: {
          patientsInClinical: true, // Direct patient relation
          // Fetch all results via the samples relation
          samplesInLaboratories: { 
              orderBy: [asc(samples_table.sample_number)], // Order samples
              with: {
                  // Use correct pluralized relation names from relations.ts
                  results_dnaInLaboratories: true, 
                  results_plasmaInLaboratories: true,
                  results_pbmcInLaboratories: true,
                  results_adhesionInLaboratories: true,
                  results_adviaInLaboratories: true,
                  results_fcellsInLaboratories: true,
                  results_lorrcaInLaboratories: true,
                  results_viscosityInLaboratories: true,
              }
          }
      }
    });
    console.log(`[Queries] Query executed. Result for ${subject_id}: ${subjectData ? 'Found' : 'Not Found'}`);

    if (!subjectData) {
      console.warn(`[Queries] Subject with ID ${subject_id} explicitly not found in DB result.`);
      return null;
    }

    // Extract patient data directly from the relation
    const patient = subjectData.patientsInClinical ?? null;

    // Construct the final return object
    // Drizzle query builder nests relations automatically
    const result: SubjectWithDetails = {
        ...subjectData,
        patient: patient, 
    };

    return result as SubjectWithDetails; // Use final type

  } catch (error: any) { 
    console.error(`[Queries] Error during DB query for subject ID ${subject_id}:`, error); 
    throw error;
  }
}

/**
 * Fetches all OmicsSubjects, including related Patient data,
 * sample count, and the latest sample date.
 * Orders results by subject_id.
 * 
 * @returns An array of subjects formatted for list display.
 */
export async function getAllOmicsSubjects(): Promise<SubjectListItem[]> {
    console.log(`[Queries] getAllOmicsSubjects called (with counts/dates).`);
    try {
      const subjectsData = await db
        .select({
          // Explicitly select omics_subjects fields
          subject_id: omics_subjects_table.subject_id,
          subject_patient_mrn: omics_subjects_table.patient_mrn, // Alias to avoid clash
          project: omics_subjects_table.project,
          subject_created_at: omics_subjects_table.created_at,
          subject_updated_at: omics_subjects_table.updated_at,
          // Explicitly select patient fields
          patient_mrn: patients_table.patient_mrn,
          first_name: patients_table.first_name,
          last_name: patients_table.last_name,
          middle_name: patients_table.middle_name,
          birth_date: patients_table.birth_date,
          sex: patients_table.sex,
          race: patients_table.race,
          ethnicity: patients_table.ethnicity,
          is_tobacco_user: patients_table.is_tobacco_user,
          alcohol_user: patients_table.alcohol_user,
          ill_drug_user: patients_table.ill_drug_user,
          patient_created_at: patients_table.created_at,
          patient_updated_at: patients_table.updated_at,
          // Aggregates with aliases
          sample_count: sql<number>`count(${samples_table.sample_id})`.as('sample_count'),
          // Cast max date to timestamp to ensure it's treated as a date by the driver
          latest_sample_date: sql<Date | null>`max(${samples_table.date_of_collection}::timestamp)`.as('latest_sample_date'), 
        })
        .from(omics_subjects_table)
        .leftJoin(samples_table, eq(omics_subjects_table.subject_id, samples_table.subject_id))
        .leftJoin(patients_table, eq(omics_subjects_table.patient_mrn, patients_table.patient_mrn))
        .groupBy(
            // Group by ALL selected non-aggregate columns
            omics_subjects_table.subject_id, 
            omics_subjects_table.patient_mrn, 
            omics_subjects_table.project,
            omics_subjects_table.created_at,
            omics_subjects_table.updated_at,
            patients_table.patient_mrn,
            patients_table.first_name,
            patients_table.last_name,
            patients_table.middle_name,
            patients_table.birth_date,
            patients_table.sex,
            patients_table.race,
            patients_table.ethnicity,
            patients_table.is_tobacco_user,
            patients_table.alcohol_user,
            patients_table.ill_drug_user,
            patients_table.created_at,
            patients_table.updated_at
            ) 
        .orderBy(asc(omics_subjects_table.subject_id));

      console.log(`[Queries] Found ${subjectsData.length} subjects with aggregated data.`);
  
      // Map the data, construct patient object, format the date
      const results: SubjectListItem[] = subjectsData.map(row => {
        // Construct patient object from selected fields
        // Check if patient_mrn exists to determine if a patient was joined
        const patient: Patient | null = row.patient_mrn 
          ? {
              patient_mrn: row.patient_mrn,
              first_name: row.first_name,
              last_name: row.last_name,
              middle_name: row.middle_name,
              birth_date: row.birth_date,
              sex: row.sex,
              race: row.race,
              ethnicity: row.ethnicity,
              is_tobacco_user: row.is_tobacco_user,
              alcohol_user: row.alcohol_user,
              ill_drug_user: row.ill_drug_user,
              created_at: row.patient_created_at, // Use aliased patient date
              updated_at: row.patient_updated_at, // Use aliased patient date
            }
          : null;

        return {
          // Subject fields
          subject_id: row.subject_id,
          patient_mrn: row.subject_patient_mrn, // Use the subject's MRN field
          project: row.project,
          created_at: row.subject_created_at, // Use aliased subject date
          updated_at: row.subject_updated_at, // Use aliased subject date
          // Include the constructed patient object
          patient: patient,
          // Aggregates (use || 0 for count in case of NULL)
          sample_count: Number(row.sample_count ?? 0), // Ensure it's a number
          // Format the date (latest_sample_date should be Date | null now)
          latest_sample_date: formatDate(row.latest_sample_date), 
        };
      });
  
      return results;
  
    } catch (error: any) { 
      console.error(`[Queries] Error during DB query for all subjects with aggregation:`, error); 
      throw error;
    }
  }

// Helper to format Date or null to 'YYYY-MM-DD' or null (add if not present)
// Export this helper for use in components
export const formatDate = (date: Date | string | null): string | null => {
    if (!date) return null;
    try {
        // Handle both Date objects and potential string representations
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        // Check if the date is valid after parsing
        if (isNaN(dateObj.getTime())) return null; 
        return dateObj.toISOString().split('T')[0];
    } catch (e) {
        console.error("Error formatting date:", date, e);
        return null; // Return null if formatting fails
    }
};

// --- Implement Query Functions Below --- 

/**
 * Gets the total number of subjects.
 */
export async function getTotalSubjectCount(): Promise<number> {
    console.log(`[Queries] getTotalSubjectCount called.`);
    try {
        const result = await db.select({ count: count() }).from(omics_subjects_table);
        // Drizzle returns an array with one object: [{ count: <number> }]
        const totalCount = result?.[0]?.count ?? 0;
        console.log(`[Queries] Total subject count: ${totalCount}`);
        return totalCount;
    } catch (error: any) {
        console.error(`[Queries] Error getting total subject count:`, error);
        throw error;
    }
}

/**
 * Gets the total number of samples.
 */
export async function getTotalSampleCount(): Promise<number> {
    console.log(`[Queries] getTotalSampleCount called.`);
    try {
        const result = await db.select({ count: count() }).from(samples_table);
        // Drizzle returns an array with one object: [{ count: <number> }]
        const totalCount = result?.[0]?.count ?? 0;
        console.log(`[Queries] Total sample count: ${totalCount}`);
        return totalCount;
    } catch (error: any) {
        console.error(`[Queries] Error getting total sample count:`, error);
        throw error;
    }
}

/**
 * Fetches all samples with the fields required for calculating processing 
 * and QC status, joining necessary results tables.
 */
export async function getAllSamplesWithStatusFields(): Promise<SampleWithStatusFields[]> {
    console.log(`[Queries] getAllSamplesWithStatusFields called.`);
    try {
        const results = await db
            .select({
                // Select all fields from samples explicitly
                sample_id: samples_table.sample_id,
                subject_id: samples_table.subject_id,
                sample_number: samples_table.sample_number,
                date_of_collection: samples_table.date_of_collection,
                age_at_collection: samples_table.age_at_collection,
                genotype: samples_table.genotype,
                therapies: samples_table.therapies,
                days_to_processing: samples_table.days_to_processing,
                steady_state: samples_table.steady_state,
                transfusion_status: samples_table.transfusion_status,
                transfusion_confirmed: samples_table.transfusion_confirmed,
                created_at: samples_table.created_at, // Alias needed if clashes?
                updated_at: samples_table.updated_at, // Alias needed if clashes?
                // Select relevant fields from results tables
                // Advia
                rbc_advia: results_advia_table.rbc_advia,
                hb_advia: results_advia_table.hb_advia,
                hct_advia: results_advia_table.hct_advia,
                mcv_advia: results_advia_table.mcv_advia,
                mch_advia: results_advia_table.mch_advia,
                mchc_advia: results_advia_table.mchc_advia,
                rdw_advia: results_advia_table.rdw_advia,
                plt_advia: results_advia_table.plt_advia,
                wbc_advia: results_advia_table.wbc_advia,
                qc_pass_advia: results_advia_table.qc_pass_advia,
                // DNA
                concentration_1_dna: results_dna_table.concentration_1_dna,
                qc_pass_dna: results_dna_table.qc_pass_dna,
                // PBMC
                cell_number_1_pbmc: results_pbmc_table.cell_number_1_pbmc,
                // Plasma
                vol_plasma_1: results_plasma_table.vol_plasma_1,
                // Lorrca
                ei_min_lorrca: results_lorrca_table.ei_min_lorrca,
                ei_max_lorrca: results_lorrca_table.ei_max_lorrca,
                qc_pass_lorrca: results_lorrca_table.qc_pass_lorrca,
            })
            .from(samples_table)
            .leftJoin(results_advia_table, eq(samples_table.sample_id, results_advia_table.sample_id))
            .leftJoin(results_dna_table, eq(samples_table.sample_id, results_dna_table.sample_id))
            .leftJoin(results_pbmc_table, eq(samples_table.sample_id, results_pbmc_table.sample_id))
            .leftJoin(results_plasma_table, eq(samples_table.sample_id, results_plasma_table.sample_id))
            .leftJoin(results_lorrca_table, eq(samples_table.sample_id, results_lorrca_table.sample_id));

        console.log(`[Queries] Found ${results.length} samples with status fields.`);
        
        // Drizzle returns Decimal/Numeric types as strings, need to handle if necessary downstream
        // For status calculation, treating them as potentially null strings or numbers should work
        // The type `SampleWithStatusFields` now reflects this using `string | null`.
        return results as SampleWithStatusFields[];

    } catch (error: any) {
        console.error(`[Queries] Error fetching all samples with status fields:`, error);
        throw error;
    }
}

/**
 * Fetches the most recent N samples with the fields required for calculating 
 * processing and QC status, joining necessary results tables.
 * 
 * @param limit The maximum number of recent samples to fetch.
 */
export async function getRecentSamplesWithStatusFields(limit: number): Promise<SampleWithStatusFields[]> {
    console.log(`[Queries] getRecentSamplesWithStatusFields called with limit: ${limit}.`);
    if (limit <= 0) {
        return [];
    }
    try {
        const results = await db
            .select({
                // Select all fields from samples explicitly
                sample_id: samples_table.sample_id,
                subject_id: samples_table.subject_id,
                sample_number: samples_table.sample_number,
                date_of_collection: samples_table.date_of_collection,
                age_at_collection: samples_table.age_at_collection,
                genotype: samples_table.genotype,
                therapies: samples_table.therapies,
                days_to_processing: samples_table.days_to_processing,
                steady_state: samples_table.steady_state,
                transfusion_status: samples_table.transfusion_status,
                transfusion_confirmed: samples_table.transfusion_confirmed,
                created_at: samples_table.created_at, 
                updated_at: samples_table.updated_at,
                // Select relevant fields from results tables
                // Advia
                rbc_advia: results_advia_table.rbc_advia,
                hb_advia: results_advia_table.hb_advia,
                hct_advia: results_advia_table.hct_advia,
                mcv_advia: results_advia_table.mcv_advia,
                mch_advia: results_advia_table.mch_advia,
                mchc_advia: results_advia_table.mchc_advia,
                rdw_advia: results_advia_table.rdw_advia,
                plt_advia: results_advia_table.plt_advia,
                wbc_advia: results_advia_table.wbc_advia,
                qc_pass_advia: results_advia_table.qc_pass_advia,
                // DNA
                concentration_1_dna: results_dna_table.concentration_1_dna,
                qc_pass_dna: results_dna_table.qc_pass_dna,
                // PBMC
                cell_number_1_pbmc: results_pbmc_table.cell_number_1_pbmc,
                // Plasma
                vol_plasma_1: results_plasma_table.vol_plasma_1,
                // Lorrca
                ei_min_lorrca: results_lorrca_table.ei_min_lorrca,
                ei_max_lorrca: results_lorrca_table.ei_max_lorrca,
                qc_pass_lorrca: results_lorrca_table.qc_pass_lorrca,
            })
            .from(samples_table)
            .leftJoin(results_advia_table, eq(samples_table.sample_id, results_advia_table.sample_id))
            .leftJoin(results_dna_table, eq(samples_table.sample_id, results_dna_table.sample_id))
            .leftJoin(results_pbmc_table, eq(samples_table.sample_id, results_pbmc_table.sample_id))
            .leftJoin(results_plasma_table, eq(samples_table.sample_id, results_plasma_table.sample_id))
            .leftJoin(results_lorrca_table, eq(samples_table.sample_id, results_lorrca_table.sample_id))
            // Order by date descending (reverting nullsLast for now)
            .orderBy(desc(samples_table.date_of_collection)) 
            .limit(limit);

        console.log(`[Queries] Found ${results.length} recent samples with status fields.`);
        
        return results as SampleWithStatusFields[];

    } catch (error: any) {
        console.error(`[Queries] Error fetching recent samples with status fields:`, error);
        throw error;
    }
}

/**
 * Fetches a single sample by its ID, including all related results tables
 * and the parent subject/patient.
 * 
 * @param sample_id The ID of the sample to fetch.
 * @returns The sample data with all nested results and parent info, or null if not found.
 */
export async function getSampleByIdWithResults(sample_id: string): Promise<SampleWithAllResults | null> {
    console.log(`[Queries] getSampleByIdWithResults called for ID: ${sample_id}`);
    try {
        const sampleData = await db.query.samplesInLaboratory.findFirst({
            where: eq(samples_table.sample_id, sample_id),
            with: {
                // Include parent subject and patient
                omics_subjectsInLaboratory: {
                    with: {
                        patientsInClinical: true,
                    }
                },
                // Include all results tables via relations
                results_dnaInLaboratories: true,
                results_plasmaInLaboratories: true,
                results_pbmcInLaboratories: true,
                results_adhesionInLaboratories: true,
                results_adviaInLaboratories: true,
                results_fcellsInLaboratories: true,
                results_lorrcaInLaboratories: true,
                results_viscosityInLaboratories: true,
            }
        });

        if (!sampleData) {
            console.warn(`[Queries] Sample with ID ${sample_id} explicitly not found.`);
            return null;
        }

        console.log(`[Queries] Found sample ${sample_id}.`);
        // The structure returned by db.query matches SampleWithAllResults
        return sampleData as SampleWithAllResults;

    } catch (error: any) {
        console.error(`[Queries] Error fetching sample ${sample_id} with results:`, error);
        throw error;
    }
}

// --- NEW Drizzle Operations for Data Entry ---

/**
 * Creates a new patient record in the clinical.patients table.
 * 
 * @param data Patient data matching the insert schema.
 * @returns The newly created patient record.
 */
export async function createDrizzlePatient(data: NewPatient): Promise<Patient | null> {
  console.log("[Queries] createDrizzlePatient called with data:", data);
  try {
    const result = await db.insert(patients_table)
      .values(data)
      .returning(); // Return the inserted row
      
    console.log("[Queries] createDrizzlePatient result:", result);
    return result[0] ?? null; // Return the first (and only) inserted row or null
  } catch (error) {
    console.error("[Queries] Error creating patient:", error);
    // Re-throw or handle as appropriate for the API layer
    throw new Error(`Failed to create patient: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Creates a new omics subject record in the laboratory.omics_subjects table.
 * 
 * @param data Omics subject data matching the insert schema.
 * @returns The newly created omics subject record.
 */
export async function createDrizzleOmicsSubject(data: NewOmicsSubject): Promise<OmicsSubject | null> {
  console.log("[Queries] createDrizzleOmicsSubject called with data:", data);
  try {
    const result = await db.insert(omics_subjects_table)
      .values(data)
      .returning(); // Return the inserted row
      
    console.log("[Queries] createDrizzleOmicsSubject result:", result);
    return result[0] ?? null; // Return the first inserted row or null
  } catch (error) {
    console.error("[Queries] Error creating omics subject:", error);
    throw new Error(`Failed to create omics subject: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Fetches a single OmicsSubject by ID (minimal implementation for existence check).
 * Note: A more comprehensive getOmicsSubjectById with relations already exists.
 * This version is specifically for quickly checking if a subject ID exists.
 * 
 * @param subject_id The ID of the subject to check.
 * @returns The subject data if found, otherwise null.
 */
export async function checkOmicsSubjectExists(subject_id: string): Promise<Pick<OmicsSubject, 'subject_id'> | null> {
  console.log(`[Queries] checkOmicsSubjectExists called for ID: ${subject_id}`);
  try {
    const subject = await db.select({ subject_id: omics_subjects_table.subject_id })
      .from(omics_subjects_table)
      .where(eq(omics_subjects_table.subject_id, subject_id))
      .limit(1);
      
    return subject[0] ?? null;
  } catch (error) {
    console.error(`[Queries] Error checking subject existence for ID ${subject_id}:`, error);
    throw error;
  }
}

// --- Drizzle Operation for Creating Sample and Results ---

/**
 * Creates a new sample and its associated results across multiple tables within a transaction.
 * 
 * @param formData The raw data received from the sample entry form.
 * @returns The newly created sample record from the 'samples' table.
 */
export async function createSampleWithResults(formData: SampleFormData): Promise<Sample | null> {
  console.log("[Queries] createSampleWithResults called with formData:", formData);
  
  const { 
    subject_id, 
    sample_number, 
    sample_id, // Ensure sample_id is correctly generated/passed in formData
    date_of_collection,
    age_at_collection,
    genotype,
    therapies,
    days_to_processing,
    steady_state,
    transfusion_status,
    transfusion_confirmed,
    // ... other base sample fields ...
    
    // Separate out fields for each results table
    date_dna, concentration_1_dna, purity_1_dna, concentration_2_dna, purity_2_dna, qc_pass_dna, qc_notes_dna,
    date_plasma, vol_plasma_1, vol_plasma_2, vol_plasma_3, qc_notes_plasma,
    date_pbmc, sent_to_gt_pbmc, qc_notes_pbmc, cell_number_1_pbmc, cell_number_2_pbmc,
    date_adhesion, cells_adhered_adhesion, qc_pass_adhesion, qc_notes_adhesion,
    date_advia, rbc_advia, hb_advia, hct_advia, mcv_advia, mch_advia, mchc_advia, rdw_advia, hdw_advia, plt_advia, mpv_advia, wbc_advia, neut_advia, retic_advia, chr_advia, hc41_v120_advia, hc41_v60_120_advia, hc41_v60_advia, drbc_advia, hyper_advia, nrbc_advia, qc_pass_advia, qc_notes_advia,
    date_f_cells, percent_f_cells, stain_f_cells, cytometer_f_cells, qc_pass_f_cells, qc_notes_f_cells,
    date_lorrca, ei_min_lorrca, ei_max_lorrca, ei_delta_lorrca, pos_lorrca, instrument_lorrca, qc_pass_lorrca, qc_notes_lorrca,
    date_analysis, visc_45, visc_225, hvr_45, hvr_225, qc_pass, qc_notes,
    // Note: HVR fields are part of viscosity table; qc_pass/qc_notes are generic for viscosity
    // Note: HPLC fields are currently ignored as there's no table
    
    ...rest // Capture any unexpected fields, though ideally formData is clean
  } = formData;

  // Ensure required fields for the main sample are present
  if (!subject_id || !sample_id) {
      throw new Error('Missing required subject_id or sample_id for sample creation.');
  }

  try {
    const createdSample = await db.transaction(async (tx) => {
      // 1. Insert into samples table
      const samplesInsertData = {
          sample_id,
          subject_id,
          sample_number: Number(sample_number) || 1,
          date_of_collection,
          age_at_collection,
          genotype,
          therapies,
          days_to_processing,
          steady_state,
          transfusion_status,
          transfusion_confirmed,
      };
      // Remove undefined fields safely
      Object.keys(samplesInsertData).forEach(key => {
        const typedKey = key as keyof typeof samplesInsertData;
        if (samplesInsertData[typedKey] === undefined) {
          delete samplesInsertData[typedKey];
        }
      });
      
      const sampleResult = await tx.insert(samples_table)
        .values(samplesInsertData)
        .returning();

      const mainSample = sampleResult[0];
      if (!mainSample) {
        throw new Error('Failed to insert main sample record.');
      }

      // 2. Insert into results_dna table
      if (date_dna || concentration_1_dna || purity_1_dna || qc_pass_dna) {
          const dnaInsertData = {
              sample_id: mainSample.sample_id,
              date_dna, concentration_1_dna, purity_1_dna, concentration_2_dna, purity_2_dna, qc_pass_dna, qc_notes_dna
          };
          Object.keys(dnaInsertData).forEach(key => {
            const typedKey = key as keyof typeof dnaInsertData;
            if (dnaInsertData[typedKey] === undefined) {
              delete dnaInsertData[typedKey];
            }
          });
          await tx.insert(results_dna_table).values(dnaInsertData);
      }
      
      // 3. Insert into results_plasma table
      if (date_plasma || vol_plasma_1 || vol_plasma_2 || vol_plasma_3) {
          const plasmaInsertData = {
              sample_id: mainSample.sample_id,
              date_plasma, vol_plasma_1, vol_plasma_2, vol_plasma_3, qc_notes_plasma
          };
          Object.keys(plasmaInsertData).forEach(key => {
            const typedKey = key as keyof typeof plasmaInsertData;
            if (plasmaInsertData[typedKey] === undefined) {
              delete plasmaInsertData[typedKey];
            }
          });
          await tx.insert(results_plasma_table).values(plasmaInsertData);
      }
      
      // 4. Insert into results_pbmc table
      if (date_pbmc || cell_number_1_pbmc || cell_number_2_pbmc || sent_to_gt_pbmc) {
          const pbmcInsertData = {
              sample_id: mainSample.sample_id,
              date_pbmc, sent_to_gt_pbmc, qc_notes_pbmc, cell_number_1_pbmc, cell_number_2_pbmc
          };
          Object.keys(pbmcInsertData).forEach(key => {
            const typedKey = key as keyof typeof pbmcInsertData;
            if (pbmcInsertData[typedKey] === undefined) {
              delete pbmcInsertData[typedKey];
            }
          });
          await tx.insert(results_pbmc_table).values(pbmcInsertData);
      }

      // 5. Insert into results_adhesion table
       if (date_adhesion || cells_adhered_adhesion || qc_pass_adhesion) {
           const adhesionInsertData = {
               sample_id: mainSample.sample_id,
               date_adhesion, cells_adhered_adhesion, qc_pass_adhesion, qc_notes_adhesion
           };
           Object.keys(adhesionInsertData).forEach(key => {
             const typedKey = key as keyof typeof adhesionInsertData;
             if (adhesionInsertData[typedKey] === undefined) {
               delete adhesionInsertData[typedKey];
             }
           });
           await tx.insert(results_adhesion_table).values(adhesionInsertData);
       }
       
      // 6. Insert into results_advia table
      if (date_advia || rbc_advia || hb_advia || qc_pass_advia) {
          const adviaInsertData = {
              sample_id: mainSample.sample_id,
              date_advia, rbc_advia, hb_advia, hct_advia, mcv_advia, mch_advia, mchc_advia, rdw_advia, hdw_advia, plt_advia, mpv_advia, wbc_advia, neut_advia, retic_advia, chr_advia, hc41_v120_advia, hc41_v60_120_advia, hc41_v60_advia, drbc_advia, hyper_advia, nrbc_advia, qc_pass_advia, qc_notes_advia
          };
          Object.keys(adviaInsertData).forEach(key => {
            const typedKey = key as keyof typeof adviaInsertData;
            if (adviaInsertData[typedKey] === undefined) {
              delete adviaInsertData[typedKey];
            }
          });
          await tx.insert(results_advia_table).values(adviaInsertData);
      }
      
      // 7. Insert into results_fcells table
      if (date_f_cells || percent_f_cells || qc_pass_f_cells) {
          const fcellsInsertData = {
              sample_id: mainSample.sample_id,
              date_f_cells, percent_f_cells, stain_f_cells, cytometer_f_cells, qc_pass_f_cells, qc_notes_f_cells
          };
          Object.keys(fcellsInsertData).forEach(key => {
            const typedKey = key as keyof typeof fcellsInsertData;
            if (fcellsInsertData[typedKey] === undefined) {
              delete fcellsInsertData[typedKey];
            }
          });
          await tx.insert(results_fcells_table).values(fcellsInsertData);
      }

      // 8. Insert into results_lorrca table
      if (date_lorrca || ei_min_lorrca || ei_max_lorrca || qc_pass_lorrca) {
          const lorrcaInsertData = {
              sample_id: mainSample.sample_id,
              date_lorrca, ei_min_lorrca, ei_max_lorrca, ei_delta_lorrca, pos_lorrca, instrument_lorrca, qc_pass_lorrca, qc_notes_lorrca
          };
          Object.keys(lorrcaInsertData).forEach(key => {
            const typedKey = key as keyof typeof lorrcaInsertData;
            if (lorrcaInsertData[typedKey] === undefined) {
              delete lorrcaInsertData[typedKey];
            }
          });
          await tx.insert(results_lorrca_table).values(lorrcaInsertData);
      }

      // 9. Insert into results_viscosity table
      if (date_analysis || visc_45 || visc_225 || qc_pass) {
          const viscosityInsertData = {
              sample_id: mainSample.sample_id,
              date_analysis, visc_45, visc_225, hvr_45, hvr_225, qc_pass, qc_notes
          };
          Object.keys(viscosityInsertData).forEach(key => {
            const typedKey = key as keyof typeof viscosityInsertData;
            if (viscosityInsertData[typedKey] === undefined) {
              delete viscosityInsertData[typedKey];
            }
          });
          await tx.insert(results_viscosity_table).values(viscosityInsertData);
      }

      return mainSample;
    });

    console.log("[Queries] createSampleWithResults transaction successful, returning sample:", createdSample);
    return createdSample ?? null;

  } catch (error) {
    console.error("[Queries] Error in createSampleWithResults transaction:", error);
    throw new Error(`Failed to create sample with results: ${error instanceof Error ? error.message : error}`);
  }
}

// --- Placeholder for updateSampleWithResults --- 
// export async function updateSampleWithResults(...) { ... }

// Type definition for the result of the complex relational query
// Use PLURAL names as defined in relations.ts for the 'many' (but effectively one-to-one/zero) relations
type SampleWithAllResultsFromDB = typeof schema.samplesInLaboratory.$inferSelect & {
    results_adviaInLaboratories?: (typeof schema.results_adviaInLaboratory.$inferSelect)[];
    results_dnaInLaboratories?: (typeof schema.results_dnaInLaboratory.$inferSelect)[];
    results_pbmcInLaboratories?: (typeof schema.results_pbmcInLaboratory.$inferSelect)[];
    results_plasmaInLaboratories?: (typeof schema.results_plasmaInLaboratory.$inferSelect)[];
    results_lorrcaInLaboratories?: (typeof schema.results_lorrcaInLaboratory.$inferSelect)[];
    results_viscosityInLaboratories?: (typeof schema.results_viscosityInLaboratory.$inferSelect)[];
    results_fcellsInLaboratories?: (typeof schema.results_fcellsInLaboratory.$inferSelect)[];
    results_adhesionInLaboratories?: (typeof schema.results_adhesionInLaboratory.$inferSelect)[];
    omics_subjectsInLaboratory?: typeof schema.omics_subjectsInLaboratory.$inferSelect & {
         patientsInClinical?: typeof schema.patientsInClinical.$inferSelect | null;
    } | null;
};

/**
 * Fetches a sample by its ID along with all its related assay results 
 * and formats it for use in the SampleEntryForm.
 * @param sampleId The unique sample ID (lab_id from form)
 * @returns A Promise resolving to SampleData or null if not found.
 */
export async function getSampleForEditing(sampleId: string): Promise<Partial<SampleData> | null> {
    console.log(`[Queries] getSampleForEditing called for sampleId: ${sampleId}`);
    try {
        const result = await db.query.samplesInLaboratory.findFirst({
            where: eq(schema.samplesInLaboratory.sample_id, sampleId),
            with: {
                results_adviaInLaboratories: true,
                results_dnaInLaboratories: true,
                results_pbmcInLaboratories: true,
                results_plasmaInLaboratories: true,
                results_lorrcaInLaboratories: true,
                results_viscosityInLaboratories: true, 
                results_fcellsInLaboratories: true,
                results_adhesionInLaboratories: true,
                omics_subjectsInLaboratory: { 
                    with: {
                        patientsInClinical: true,
                    }
                }
            }
        }) as SampleWithAllResultsFromDB | undefined;

        if (!result) {
            console.log(`[Queries] Sample not found for editing: ${sampleId}`);
            return null;
        }

        console.log(`[Queries] Found sample data for editing:`, result);

        // Helper to safely access the first element of the potentially plural relations
        const adviaResult = result.results_adviaInLaboratories?.[0];
        const dnaResult = result.results_dnaInLaboratories?.[0];
        const pbmcResult = result.results_pbmcInLaboratories?.[0];
        const plasmaResult = result.results_plasmaInLaboratories?.[0];
        const lorrcaResult = result.results_lorrcaInLaboratories?.[0];
        const viscosityResult = result.results_viscosityInLaboratories?.[0];
        const fcellsResult = result.results_fcellsInLaboratories?.[0];
        const adhesionResult = result.results_adhesionInLaboratories?.[0];
        const subjectResult = result.omics_subjectsInLaboratory;

        // Flatten the structure and map/convert types for the form
        const formData: Partial<SampleData> = {
            // Basic Info
            lab_id: result.sample_id,
            subject_id: result.subject_id,
            sample_number: result.sample_number,
            date_of_collection: formatDate(result.date_of_collection),
            age_at_collection: parseNumericStringToNullableNumber(result.age_at_collection),
            genotype: result.genotype,
            therapies: result.therapies,
            days_to_processing: parseNumericStringToNullableNumber(result.days_to_processing),
            steady_state: result.steady_state,
            transfusion_status: result.transfusion_status,
            transfusion_confirmed: result.transfusion_confirmed,
            patient_mrn: subjectResult?.patientsInClinical?.patient_mrn ?? null,
            sex: subjectResult?.patientsInClinical?.sex ?? null,
            
            // Flattened Assay Results (Use helper vars)
            // Advia
            ...(adviaResult ? {
                date_advia: formatDate(adviaResult.date_advia),
                rbc_advia: parseNumericStringToNullableNumber(adviaResult.rbc_advia),
                hb_advia: parseNumericStringToNullableNumber(adviaResult.hb_advia),
                hct_advia: parseNumericStringToNullableNumber(adviaResult.hct_advia),
                mcv_advia: parseNumericStringToNullableNumber(adviaResult.mcv_advia),
                mch_advia: parseNumericStringToNullableNumber(adviaResult.mch_advia),
                mchc_advia: parseNumericStringToNullableNumber(adviaResult.mchc_advia),
                rdw_advia: parseNumericStringToNullableNumber(adviaResult.rdw_advia),
                hdw_advia: parseNumericStringToNullableNumber(adviaResult.hdw_advia),
                plt_advia: parseNumericStringToNullableNumber(adviaResult.plt_advia),
                mpv_advia: parseNumericStringToNullableNumber(adviaResult.mpv_advia),
                wbc_advia: parseNumericStringToNullableNumber(adviaResult.wbc_advia),
                neut_advia: parseNumericStringToNullableNumber(adviaResult.neut_advia),
                retic_advia: parseNumericStringToNullableNumber(adviaResult.retic_advia),
                chr_advia: parseNumericStringToNullableNumber(adviaResult.chr_advia),
                hc41_v120_advia: parseNumericStringToNullableNumber(adviaResult.hc41_v120_advia),
                hc41_v60_120_advia: parseNumericStringToNullableNumber(adviaResult.hc41_v60_120_advia),
                hc41_v60_advia: parseNumericStringToNullableNumber(adviaResult.hc41_v60_advia),
                drbc_advia: parseNumericStringToNullableNumber(adviaResult.drbc_advia),
                hyper_advia: parseNumericStringToNullableNumber(adviaResult.hyper_advia),
                nrbc_advia: parseNumericStringToNullableNumber(adviaResult.nrbc_advia),
                qc_pass_advia: mapDbQcToFormQc(adviaResult.qc_pass_advia) as SampleData['qc_pass_advia'],
                qc_notes_advia: adviaResult.qc_notes_advia,
            } : {}),

            // DNA
            ...(dnaResult ? {
                date_dna: formatDate(dnaResult.date_dna),
                concentration_1_dna: parseNumericStringToNullableNumber(dnaResult.concentration_1_dna),
                purity_1_dna: parseNumericStringToNullableNumber(dnaResult.purity_1_dna),
                concentration_2_dna: parseNumericStringToNullableNumber(dnaResult.concentration_2_dna),
                purity_2_dna: parseNumericStringToNullableNumber(dnaResult.purity_2_dna),
                qc_pass_dna: mapDbQcToFormQc(dnaResult.qc_pass_dna) as SampleData['qc_pass_dna'],
                qc_notes_dna: dnaResult.qc_notes_dna,
            } : {}),
            
            // PBMC
            ...(pbmcResult ? {
                date_pmbc: formatDate(pbmcResult.date_pbmc), // date_pbmc in schema
                cell_number_1_pbmc: parseNumericStringToNullableNumber(pbmcResult.cell_number_1_pbmc),
                cell_number_2_pbmc: parseNumericStringToNullableNumber(pbmcResult.cell_number_2_pbmc),
                sent_to_gt_pbmc: pbmcResult.sent_to_gt_pbmc === '1' ? 'Yes' : (pbmcResult.sent_to_gt_pbmc === '0' ? 'No' : null),
                qc_notes_pbmc: pbmcResult.qc_notes_pbmc,
            } : {}),
            
             // Plasma
            ...(plasmaResult ? {
                date_plasma: formatDate(plasmaResult.date_plasma),
                vol_plasma_1: parseNumericStringToNullableNumber(plasmaResult.vol_plasma_1),
                vol_plasma_2: parseNumericStringToNullableNumber(plasmaResult.vol_plasma_2),
                vol_plasma_3: parseNumericStringToNullableNumber(plasmaResult.vol_plasma_3),
                qc_notes_plasma: plasmaResult.qc_notes_plasma,
            } : {}),

            // Lorrca
            ...(lorrcaResult ? {
                date_lorrca: formatDate(lorrcaResult.date_lorrca),
                ei_min_lorrca: parseNumericStringToNullableNumber(lorrcaResult.ei_min_lorrca),
                ei_max_lorrca: parseNumericStringToNullableNumber(lorrcaResult.ei_max_lorrca),
                ei_delta_lorrca: parseNumericStringToNullableNumber(lorrcaResult.ei_delta_lorrca),
                pos_lorrca: parseNumericStringToNullableNumber(lorrcaResult.pos_lorrca), // Convert varchar string to number
                instrument_lorrca: lorrcaResult.instrument_lorrca,
                qc_pass_lorrca: mapDbQcToFormQc(lorrcaResult.qc_pass_lorrca) as SampleData['qc_pass_lorrca'],
                qc_notes_lorrca: lorrcaResult.qc_notes_lorrca,
            } : {}),

             // Viscosity
            ...(viscosityResult ? {
                date_visc: formatDate(viscosityResult.date_analysis), // date_analysis in schema
                visc_45: parseNumericStringToNullableNumber(viscosityResult.visc_45),
                visc_225: parseNumericStringToNullableNumber(viscosityResult.visc_225),
                hvr_45: parseNumericStringToNullableNumber(viscosityResult.hvr_45),
                hvr_225: parseNumericStringToNullableNumber(viscosityResult.hvr_225),
                qc_pass_viscosity: mapDbQcToFormQc(viscosityResult.qc_pass) as SampleData['qc_pass_viscosity'],
                qc_notes_viscosity: viscosityResult.qc_notes,
                // Map HVR fields assuming they are in the same table
                date_hvr: formatDate(viscosityResult.date_analysis), 
                qc_pass_hvr: mapDbQcToFormQc(viscosityResult.qc_pass) as SampleData['qc_pass_hvr'],
                qc_notes_hvr: viscosityResult.qc_notes,
            } : {}),
            
            // FCells
             ...(fcellsResult ? {
                date_f_cells: formatDate(fcellsResult.date_f_cells),
                percent_f_cells: parseNumericStringToNullableNumber(fcellsResult.percent_f_cells),
                stain_f_cells: fcellsResult.stain_f_cells,
                cytometer_f_cells: fcellsResult.cytometer_f_cells,
                qc_pass_f_cells: mapDbQcToFormQc(fcellsResult.qc_pass_f_cells) as SampleData['qc_pass_f_cells'],
                qc_notes_f_cells: fcellsResult.qc_notes_f_cells,
            } : {}),

            // Adhesion
             ...(adhesionResult ? {
                date_adhesion: formatDate(adhesionResult.date_adhesion),
                cells_adhered_adhesion: parseNumericStringToNullableNumber(adhesionResult.cells_adhered_adhesion),
                qc_pass_adhesion: mapDbQcToFormQc(adhesionResult.qc_pass_adhesion) as SampleData['qc_pass_adhesion'],
                qc_notes_adhesion: adhesionResult.qc_notes_adhesion,
            } : {}),
            
            // HPLC (Removed)
        };

        return formData;

    } catch (error: any) {
        console.error(`[Queries] Error fetching sample ${sampleId} for editing:`, error);
        if (error.message) {
            console.error("Error message:", error.message);
        }
        if (error.stack) {
             console.error("Error stack:", error.stack);
        }
        return null; // Indicate failure
    }
}

/**
 * Fetches patients from the clinical schema, optionally filtering 
 * for those linked to an omics subject.
 * @param onlyWithSubject If true, only returns patients with a linked subject_id.
 */
export async function getAllPatientsData(onlyWithSubject?: boolean): Promise<PatientWithSubjectId[]> {
    console.log(`[Queries] getAllPatientsData called. Filter onlyWithSubject: ${onlyWithSubject}`);
    try {
        const query = db
            .select({
                // Explicitly list fields from patients_table
                patient_mrn: patients_table.patient_mrn,
                first_name: patients_table.first_name,
                last_name: patients_table.last_name,
                middle_name: patients_table.middle_name,
                birth_date: patients_table.birth_date,
                sex: patients_table.sex,
                race: patients_table.race,
                ethnicity: patients_table.ethnicity,
                is_tobacco_user: patients_table.is_tobacco_user,
                alcohol_user: patients_table.alcohol_user,
                ill_drug_user: patients_table.ill_drug_user,
                created_at: patients_table.created_at,
                updated_at: patients_table.updated_at,
                // Select subject_id from omics_subjects table
                subject_id: omics_subjects_table.subject_id
            })
            .from(patients_table)
            .leftJoin(omics_subjects_table, eq(patients_table.patient_mrn, omics_subjects_table.patient_mrn));

        if (onlyWithSubject) {
            query.where(isNotNull(omics_subjects_table.subject_id));
        }

        const results = await query;

        console.log(`[Queries] Found ${results.length} patients.`);
        // The result structure now includes subject_id which might be null
        return results;

    } catch (error: any) {
        console.error(`[Queries] Error fetching patients:`, error);
        throw error;
    }
}

/**
 * Fetches all visits for a specific patient MRN.
 * @param patient_mrn The patient's Medical Record Number.
 * @returns An array of visit records for the patient.
 */
export async function getVisitsByMrn(patient_mrn: string): Promise<Array<typeof visitsInClinical.$inferSelect>> {
    console.log(`[Queries] getVisitsByMrn called for MRN: ${patient_mrn}`);
    if (!patient_mrn) {
        console.warn("[Queries] getVisitsByMrn called with empty MRN.");
        return [];
    }
    try {
        const results = await db
            .select()
            .from(visitsInClinical)
            .where(eq(visitsInClinical.patient_mrn, patient_mrn))
            .orderBy(desc(visitsInClinical.visit_start_datetime)); // Order by start date descending
        
        console.log(`[Queries] Found ${results.length} visits for MRN ${patient_mrn}.`);
        return results;

    } catch (error: any) {
        console.error(`[Queries] Error fetching visits for MRN ${patient_mrn}:`, error);
        throw error;
    }
}

/**
 * Fetches patient details, their associated visits (with labs, meds, diagnoses),
 * and their lab samples for the timeline view.
 * @param patient_mrn The patient's Medical Record Number.
 * @returns An object containing patient details, a list of their visits with nested data,
 *          and a list of their samples, or null if patient not found.
 */
export async function getPatientTimelineData(patient_mrn: string): Promise<PatientTimelineData | null> {
    console.log(`[Queries] getPatientTimelineData (reverted) called for MRN: ${patient_mrn}`); // Reverted log msg slightly
    if (!patient_mrn) {
        console.warn("[Queries] getPatientTimelineData called with empty MRN.");
        return null;
    }
    try {
        const patientResult = await db.query.patientsInClinical.findFirst({
            where: eq(patients_table.patient_mrn, patient_mrn),
        });
        
        const patient = patientResult ?? null;

        if (!patient) {
            console.warn(`[Queries] Patient not found for MRN ${patient_mrn} in getPatientTimelineData.`);
            return null;
        }

        // Reverted: Fetch visits without nested lab results for now
        const visitsWithDetails = await db.query.visitsInClinical.findMany({
            where: eq(visitsInClinical.patient_mrn, patient_mrn),
            with: {
                lab_ordersInClinicals: true, // Fetch lab orders directly
                medication_ordersInClinicals: true, 
                visit_diagnosesInClinicals: true, 
            },
            orderBy: [desc(visitsInClinical.visit_start_datetime)]
        });
        
        console.log(`[Queries] Found ${visitsWithDetails.length} visits with details for MRN ${patient_mrn}.`);

        const omicsSubject = await db.query.omics_subjectsInLaboratory.findFirst({
            where: eq(omics_subjects_table.patient_mrn, patient_mrn),
            columns: { subject_id: true } 
        });

        let samples: Array<typeof samples_table.$inferSelect> = [];
        if (omicsSubject && omicsSubject.subject_id) {
            samples = await db.query.samplesInLaboratory.findMany({
                where: eq(samples_table.subject_id, omicsSubject.subject_id),
                orderBy: [desc(samples_table.date_of_collection)] 
            });
            console.log(`[Queries] Found ${samples.length} samples for subject ${omicsSubject.subject_id} (patient MRN ${patient_mrn}).`);
        } else {
            console.log(`[Queries] No omics subject found for MRN ${patient_mrn}, or subject has no ID. No samples fetched.`);
        }

        return {
            patient: patient,
            visits: visitsWithDetails, 
            samples: samples
        };

    } catch (error: any) {
        console.error(`[Queries] Error fetching enhanced patient timeline data for MRN ${patient_mrn}:`, error);
        throw error;
    }
}

/**
 * Fetches a paginated list of all visits, including basic patient information.
 * @param limit Number of visits per page.
 * @param offset Number of visits to skip.
 * @param visitType Optional filter by visit_type.
 * @returns An object containing the list of visits for the current page and the total number of visits.
 */
export async function getAllVisitsForListView(
    limit: number, 
    offset: number,
    visitType?: string
): Promise<PaginatedVisitsResponse> {
    console.log(`[Queries] getAllVisitsForListView called. Limit: ${limit}, Offset: ${offset}, Type: ${visitType}`);
    
    try {
        const selectFields = {
            visit_id: visitsInClinical.visit_id,
            patient_mrn: visitsInClinical.patient_mrn,
            visit_type: visitsInClinical.visit_type,
            start_date: visitsInClinical.visit_start_datetime,
            end_date: visitsInClinical.visit_end_datetime,
            department_name: visitsInClinical.department_name,
            patient_first_name: patients_table.first_name,
            patient_last_name: patients_table.last_name,
        };

        let visitsQuery = db
            .select(selectFields)
            .from(visitsInClinical)
            .leftJoin(patients_table, eq(visitsInClinical.patient_mrn, patients_table.patient_mrn))
            .orderBy(desc(visitsInClinical.visit_start_datetime))
            .limit(limit)
            .offset(offset);

        if (visitType) {
            visitsQuery = visitsQuery.where(eq(visitsInClinical.visit_type, visitType)) as typeof visitsQuery;
        }
        
        const resultRows = await visitsQuery;

        let countWhereCondition;
        if (visitType) {
            countWhereCondition = eq(visitsInClinical.visit_type, visitType);
        }

        const countResult = await db
            .select({ total: count(visitsInClinical.visit_id) })
            .from(visitsInClinical)
            .where(countWhereCondition);
            
        const totalVisits = countResult[0]?.total ?? 0;

        console.log(`[Queries] Found ${resultRows.length} visits for page, Total visits: ${totalVisits}`);
        
        const visits: VisitForListView[] = resultRows.map(row => ({
            ...row,
            start_date: row.start_date ? (typeof row.start_date === 'string' ? new Date(row.start_date) : row.start_date) : null,
            end_date: row.end_date ? (typeof row.end_date === 'string' ? new Date(row.end_date) : row.end_date) : null,
        }));

        return {
            visits: visits,
            totalVisits: totalVisits,
        };

    } catch (error: any) {
        console.error(`[Queries] Error fetching all visits for list view:`, error);
        throw error;
    }
}

/**
 * Fetches lab results for a given list of lab order IDs.
 * @param orderIds An array of lab order IDs (strings).
 * @returns A promise resolving to an array of lab result records.
 */
export async function getLabResultsForOrders(orderIds: string[]): Promise<Array<typeof lab_resultsInClinical.$inferSelect>> {
    console.log(`[Queries] getLabResultsForOrders called for ${orderIds.length} order IDs.`);
    if (!orderIds || orderIds.length === 0) {
        return []; // Return empty if no IDs are provided
    }

    try {
        const results = await db
            .select()
            .from(lab_resultsInClinical)
            .where(inArray(lab_resultsInClinical.order_id, orderIds));
            
        console.log(`[Queries] Found ${results.length} lab results for the provided order IDs.`);
        return results;
    } catch (error: any) {
        console.error(`[Queries] Error fetching lab results for orders:`, orderIds, error);
        throw error;
    }
}

/**
 * Fetches details for a specific OMICS subject, including linked patient information
 * and a list of all their collected samples.
 * 
 * @param subject_id The ID of the OMICS subject.
 * @returns Subject details with patient and samples, or null if not found.
 */
export async function getSubjectDetailsWithSamples(subject_id: string): Promise<SubjectDetailsPageData | null> {
  console.log(`[Queries] getSubjectDetailsWithSamples called for ID: ${subject_id}`);
  if (!subject_id) {
    console.warn('[Queries] getSubjectDetailsWithSamples: subject_id is null or undefined.');
    return null;
  }

  try {
    const subjectData = await db.query.omics_subjectsInLaboratory.findFirst({
      where: eq(omics_subjects_table.subject_id, subject_id),
      with: {
        patientsInClinical: true, // Get the linked patient
        samplesInLaboratories: { // Get all linked samples
          orderBy: [desc(samples_table.date_of_collection)], // Order samples, most recent first
          // Select specific columns if needed, otherwise all columns from samples_table are fetched
          // columns: {
          //   sample_id: true,
          //   date_of_collection: true,
          //   age_at_collection: true,
          //   genotype: true,
          //   steady_state: true,
          //   transfusion_status: true,
          // }
        }
      }
    });

    if (!subjectData) {
      console.warn(`[Queries] No subject found with ID ${subject_id} in getSubjectDetailsWithSamples.`);
      return null;
    }

    // Drizzle returns relations as properties on the main object.
    // The types are inferred correctly if relations are defined in schema.
    // Ensure that `subjectData.samplesInLaboratories` is an array, even if empty.
    const samples = subjectData.samplesInLaboratories || [];

    return {
      ...subjectData,
      patient: subjectData.patientsInClinical ?? null,
      samples: samples as SubjectSampleListItem[] // Cast as Drizzle might type it as the base table type array
    };

  } catch (error) {
    console.error(`[Queries] Error fetching subject details for ${subject_id}:`, error);
    return null;
  }
}
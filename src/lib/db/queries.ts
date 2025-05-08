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
} from './schema'; 
// Import Drizzle utility functions
import { eq, desc, inArray, sql, asc, count, max, SQL } from 'drizzle-orm'; 

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
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerClient, getSupabaseAdminClient, handleSupabaseError } from './db';
import { createPhiClient } from '@/lib/supabase/server';
import { AssayType } from '../types';
import { 
    getPlaceholderPatients, 
    getPlaceholderPatientById, 
    getPlaceholderOmicsResults, 
    getPlaceholderOmicsResultById,
    getPlaceholderData, 
    getPlaceholderCount 
} from '../placeholder-data';

// Type definitions for our database tables
export type OmicsResult = any;
export type OmicsSubject = any;
export type Patient = any;

// Omics Results Operations
export async function createOmicsResult(data: Partial<OmicsResult>) {
  try {
    // Use admin client to bypass RLS
    const supabase = getSupabaseAdminClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn('[createOmicsResult] Supabase client not available. Operation skipped.');
        return null; // Or return a mock success object if needed
    }
    
    // Generate a UUID for the id field if not provided
    const dataWithId = {
      ...data,
      id: data.id || crypto.randomUUID()
    };
    
    const { data: result, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .insert(dataWithId)
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

export async function updateOmicsResult(sample_id: string, data: Partial<OmicsResult>) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn(`[updateOmicsResult] Supabase client not available for sample_id: ${sample_id}. Operation skipped.`);
        return null; // Or return a mock success object
    }
    
    const { data: result, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .update(data)
      .eq('sample_id', sample_id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

export async function getOmicsResultBySampleId(sample_id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        return getPlaceholderOmicsResultById(sample_id);
    }
    
    // Get the sample data
    const { data: sample, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*')
      .eq('sample_id', sample_id)
      .single();
    
    if (error) {
      handleSupabaseError(error as any);
      return null;
    }
    
    if (!sample) {
      return null;
    }
    
    // Get the subject data
    const { data: subject, error: subjectError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select('*')
      .eq('subject_id', sample.subject_id)
      .single();
    
    if (subjectError) {
      console.error('Error fetching subject:', subjectError);
    }
    
    // Combine the data
    return {
      ...sample,
      omics_subjects: subject || null
    };
  } catch (error) {
    handleSupabaseError(error as any);
    return null;
  }
}

export async function getOmicsResultsBySubjectId(subject_id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        // Attempt to return specific placeholder if possible, otherwise generic
        // Note: This specific placeholder might need adjustment if it doesn't match the combined structure
        console.warn(`[getOmicsResultsBySubjectId] Supabase client not available for subject_id: ${subject_id}. Returning placeholder data.`);
        // Returning generic placeholder for now as the structure is combined
        return getPlaceholderData('getOmicsResultsBySubjectId'); 
    }
    
    // Get the subject data
    const { data: subject, error: subjectError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select('*')
      .eq('subject_id', subject_id)
      .single();
    
    if (subjectError) {
      console.error('Error fetching subject:', subjectError);
    }
    
    // Get the samples data
    const { data: samples, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*')
      .eq('subject_id', subject_id)
      .order('date_of_collection', { ascending: false });
    
    if (error) handleSupabaseError(error as any);
    
    // Combine the data
    const samplesWithSubject = samples?.map((sample: any) => ({
      ...sample,
      omics_subjects: subject || null
    })) || [];
    
    return samplesWithSubject;
  } catch (error) {
    handleSupabaseError(error as any);
    return [];
  }
}

export async function getOmicsResultsByAssayType(
  assay_type: AssayType,
  options?: {
    subject_id?: string;
    start_date?: Date;
    end_date?: Date;
    qc_pass?: boolean;
  }
) {
  try {
    const supabase = await getSupabaseServerClient();

    // Handle missing client
    if (!supabase) {
        console.warn(`[getOmicsResultsByAssayType] Supabase client not available for assay: ${assay_type}. Returning placeholder data.`);
        return getPlaceholderData('getOmicsResultsByAssayType');
    }

    const dateField = `date_${assay_type.toLowerCase()}`;
    const qcField = `qc_pass_${assay_type.toLowerCase()}`;
    
    let query = supabase
      .schema('laboratory')
      .from('omics_results')
      .select(`
        *,
        omics_subjects:subject_id (*)
      `);
    
    // Apply filters
    if (options?.subject_id) {
      query = query.eq('subject_id', options.subject_id);
    }
    
    if (options?.start_date) {
      query = query.gte(dateField, options.start_date.toISOString());
    }
    
    if (options?.end_date) {
      query = query.lte(dateField, options.end_date.toISOString());
    }
    
    if (options?.qc_pass !== undefined) {
      query = query.eq(qcField, options.qc_pass ? 'Yes' : 'No');
    }
    
    // Order by date
    query = query.order(dateField, { ascending: false });
    
    const { data: results, error } = await query;
    
    if (error) handleSupabaseError(error as any);
    return results;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

// Subject Operations
export async function createOmicsSubject(data: Partial<OmicsSubject>) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn('[createOmicsSubject] Supabase client not available. Operation skipped.');
        return null; 
    }
    
    // Generate a UUID for the id field if not provided
    const dataWithId = {
      ...data,
      id: data.id || crypto.randomUUID()
    };
    
    const { data: result, error } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .insert(dataWithId)
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

export async function getOmicsSubjectById(subject_id: string) {
  try {
    const supabase = await getSupabaseServerClient();

    // Handle missing lab client
    if (!supabase) {
        console.warn(`[getOmicsSubjectById] Lab Supabase client not available for subject_id: ${subject_id}. Returning placeholder data.`);
        return getPlaceholderData('getOmicsSubjectById'); 
    }

    // Get the subject data from the lab schema
    const { data: subject, error } = await supabase
      .from('omics_subjects')
      .select('*')
      .eq('subject_id', subject_id)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (No rows found)
      handleSupabaseError(error as any);
      // Potentially return null or empty object if subject not found
    }

    // Get the samples data for this subject from the lab schema
    const { data: samples, error: samplesError } = await supabase
      .from('omics_results')
      .select('*')
      .eq('subject_id', subject_id)
      .order('date_of_collection', { ascending: false });

    if (samplesError) {
      handleSupabaseError(samplesError as any);
      // Continue without samples if there's an error
    }

    // Fetch related patient data from the PHI schema if MRN exists
    let patientData = null;
    if (subject?.patient_mrn) {
      const phiClient = await createPhiClient(); // Await the PHI client
      if (!phiClient) {
          console.warn(`[getOmicsSubjectById] PHI Supabase client not available for MRN: ${subject.patient_mrn}. Skipping patient data fetch.`);
      } else {
          try {
            const { data: patientResult, error: patientError } = await phiClient // Use the awaited client
              .from('patients')
              .select('*')
              .eq('patient_mrn', subject.patient_mrn)
              .single();

            if (patientError && patientError.code !== 'PGRST116') {
              console.error(`Error fetching patient data for MRN ${subject.patient_mrn}:`, patientError);
              handleSupabaseError(patientError as any);
            } else {
              patientData = patientResult;
            }
          } catch (phiError) {
            console.error(`Error querying PHI schema for MRN ${subject.patient_mrn}:`, phiError);
            handleSupabaseError(phiError as any);
          }
      }
    }

    // Combine all data
    return {
      ...(subject || {}),
      omics_results: samples || [],
      patient: patientData, // Add patient data
    };

  } catch (error) {
    handleSupabaseError(error as any);
    return null; // Return null or appropriate error indicator
  }
}

// Alias for getOmicsSubjectById for clarity
export const getOmicsSubjectBySubjectId = getOmicsSubjectById;

export async function getAllOmicsSubjects() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn('[getAllOmicsSubjects] Supabase client not available. Returning placeholder data.');
        // Replace with specific placeholder if created e.g., getPlaceholderOmicsSubjects()
        return getPlaceholderData('getAllOmicsSubjects'); 
    }

    const { data: subjects, error } = await supabase
      .from('omics_subjects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError(error as any);
      return []; // Return empty array on error
    }
    
    // Potentially enrich subjects here if needed, similar to previous logic removed
    // For now, just returning the fetched subjects
    return subjects?.map((subject: any) => ({ ...subject })) || []; // Added explicit : any here

  } catch (error) {
    handleSupabaseError(error as any);
    return [];
  }
}

export async function updateOmicsSubject(subject_id: string, data: Partial<OmicsSubject>) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn(`[updateOmicsSubject] Supabase client not available for subject_id: ${subject_id}. Operation skipped.`);
        return null; // Or return a mock success object
    }
    
    const { data: result, error } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .update(data)
      .eq('subject_id', subject_id)
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

// Patient Operations
export async function createPatient(data: Partial<Patient>) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
      console.warn('[createPatient] Supabase client not available. Operation skipped.');
      return null;
    }

    // Generate a UUID for the id field if not provided
    const dataWithId = {
      ...data,
      id: data.id || crypto.randomUUID()
    };
    
    const { data: result, error } = await supabase
      .schema('phi')
      .from('patients')
      .insert(dataWithId)
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

export async function getAllPatients() {
  try {
    const supabase = await getSupabaseServerClient();

    // Handle missing client
    if (!supabase) {
      return getPlaceholderPatients();
    }

    // Fetch patients from the 'phi' schema
    const phiSupabase = await createPhiClient(); // Use the specific phi client helper
    
    // Handle missing phi client
    if (!phiSupabase) {
        console.warn('[getAllPatients] PHI Supabase client not available. Returning placeholder data.');
        return getPlaceholderPatients();
    }

    const { data: patients, error } = await phiSupabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching patients:', error);
      return [];
    }
    
    if (!patients || patients.length === 0) {
      console.log('No patients found');
      return [];
    }
    
    // For each patient, get their omics_subjects and registrations
    const patientsWithDetails = await Promise.all(
      patients.map(async (patient: any) => {
        // Get omics_subjects for this patient
        const { data: omicsSubjects, error: omicsError } = await supabase
          .from('omics_subjects')
          .select('*')
          .eq('patient_mrn', patient.patient_mrn);
        
        if (omicsError) {
          console.error(`Error fetching omics subjects for patient ${patient.patient_mrn}:`, omicsError);
        }
        
        // Get registrations for this patient
        const { data: registrations, error: regError } = await phiSupabase
          .from('subject_registration')
          .select('*')
          .eq('patient_mrn', patient.patient_mrn);
        
        if (regError) {
          console.error(`Error fetching registrations for patient ${patient.patient_mrn}:`, regError);
        }
        
        // For each omics subject, get their samples
        const omicsSubjectsWithSamples = await Promise.all(
          (omicsSubjects || []).map(async (subject: any) => {
            const { data: samples, error: samplesError } = await supabase
              .from('omics_results')
              .select('*')
              .eq('subject_id', subject.subject_id)
              .order('date_of_collection', { ascending: false });
            
            if (samplesError) {
              console.error(`Error fetching samples for subject ${subject.subject_id}:`, samplesError);
            }
            
            return {
              ...subject,
              omics_results: samples || []
            };
          })
        );
        
        return {
          ...patient,
          omics_subjects: omicsSubjectsWithSamples || [],
          registrations: registrations || []
        };
      })
    );
    
    return patientsWithDetails;
  } catch (error) {
    console.error('Error in getAllPatients:', error);
    handleSupabaseError(error as any);
    return [];
  }
}

export async function getPatientByMRN(patient_mrn: string) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn(`[getPatientByMRN] Supabase client not available for MRN: ${patient_mrn}. Returning placeholder data.`);
        // Assuming getPlaceholderPatientById can work with MRN or we use a generic one
        // For now, using generic data placeholder
        return getPlaceholderData('getPatientByMRN'); // Or potentially adapt getPlaceholderPatientById
    }
    
    const { data: result, error } = await supabase
      .schema('phi')
      .from('patients')
      .select(`
        *,
        omics_subjects:patient_mrn (
          *,
          omics_results:subject_id (*)
        )
      `)
      .eq('patient_mrn', patient_mrn)
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

export async function updatePatient(patient_mrn: string, data: Partial<Patient>) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Handle missing client
    if (!supabase) {
        console.warn(`[updatePatient] Supabase client not available for MRN: ${patient_mrn}. Operation skipped.`);
        return null; // Or return a mock success object
    }
    
    const { data: result, error } = await supabase
      .schema('phi')
      .from('patients')
      .update(data)
      .eq('patient_mrn', patient_mrn)
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

// Search Operations
export async function searchSubjects(query: string) {
  try {
    const supabase = await getSupabaseServerClient();

    if (!supabase) {
      console.warn('[searchSubjects] Supabase client not available. Returning empty array.');
      return [];
    }
    
    const { data: subjects, error } = await supabase
      .schema('laboratory') // Assuming search happens in laboratory schema
      .from('omics_subjects')
      .select(`
        *,
        patient:patients!subject_registration(patient_mrn)
      `)
      .or(`subject_id.ilike.%${query}%,patients.patient_mrn.ilike.%${query}%`);

    if (error) {
      handleSupabaseError(error as any);
      return [];
    }

    // Process results to match expected combined structure if necessary
    // This part depends on the original structure returned by searchSubjects
    // For now, returning the raw subjects found
    return subjects.map((subject: any) => ({ // Ensure explicit : any here
        // Map fields as needed, e.g., extract patient_mrn if joined correctly
        ...subject,
        patient_mrn: subject.patient?.patient_mrn || null 
    }));

  } catch (error) {
    handleSupabaseError(error as any);
    return [];
  }
}

// Audit Operations
export async function logAuditEvent(
  table_name: string,
  action: string,
  old_data: Record<string, unknown>,
  new_data: Record<string, unknown>,
  changed_by: string
) {
  try {
    const supabase = await getSupabaseAdminClient();

    // Handle missing client
    if (!supabase) {
        console.warn(`[logAuditEvent] Supabase admin client not available. Audit event skipped for action: ${action} on table: ${table_name}`);
        return null; // Cannot log audit event without client
    }

    const { data: result, error } = await supabase
      .from('audit_log')
      .insert({
        table_name,
        action,
        old_data,
        new_data,
        changed_by
      })
      .select()
      .single();
    
    if (error) handleSupabaseError(error as any);
    return result;
  } catch (error) {
    handleSupabaseError(error as any);
  }
}

// Example for a function returning count
export async function getOmicsResultsCount() {
  try {
    const supabase = await getSupabaseServerClient();

    // Handle missing client
    if (!supabase) {
        console.warn('[getOmicsResultsCount] Supabase client not available. Returning placeholder count.');
        return getPlaceholderCount('getOmicsResultsCount');
    }

    const { count, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*', { count: 'exact', head: true });

    if (error) handleSupabaseError(error as any);
    return count;
  } catch (error) {
    handleSupabaseError(error as any);
    return 0; // Return 0 in case of other errors
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerClient, getSupabaseAdminClient, handleSupabaseError } from './db';
import { createPhiClient, createClient } from './server';
import { AssayType } from '../types';

// Type definitions for our database tables
export type OmicsResult = {
  id: string;
  project?: string | null;
  subject_id: string;
  sample_number?: number | null;
  sample_id: string;
  date_of_collection?: string | null;
  genotype?: string | null;
  qc_pass_advia?: string | null;
  qc_pass_lorrca?: string | null;
  qc_notes_advia?: string | null;
  qc_notes_lorrca?: string | null;
  concentration_1_dna?: number | null;
  cell_number_1_pbmc?: number | null;
  vol_plasma_1?: number | null;
  rbc_advia?: number | null;
  hb_advia?: number | null;
  hct_advia?: number | null;
  mcv_advia?: number | null;
  mch_advia?: number | null;
  mchc_advia?: number | null;
  rdw_advia?: number | null;
  plt_advia?: number | null;
  wbc_advia?: number | null;
};

export type OmicsSubject = {
  id: string;
  subject_id: string;
  patient_mrn?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  genotype?: string | null;
};

export type Patient = {
  id: string;
  patient_mrn: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
};

// Omics Results Operations
export async function createOmicsResult(data: Partial<OmicsResult>) {
  try {
    const supabase = await getSupabaseServerClient();
    
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
    const samplesWithSubject = samples?.map(sample => ({
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
    const labClient = await createClient(); // laboratory schema
    const phiClient = await createPhiClient(); // phi schema
    
    // Get the subject data
    const { data: subject, error } = await labClient
      .from('omics_subjects')
      .select('*')
      .eq('subject_id', subject_id)
      .maybeSingle();
    
    if (error) {
      handleSupabaseError(error as any);
      return null;
    }
    
    if (!subject) {
      console.log(`Subject with ID ${subject_id} not found`);
      return null;
    }
    
    // Get the samples data for this subject
    const { data: samples, error: samplesError } = await labClient
      .from('omics_results')
      .select('*')
      .eq('subject_id', subject_id)
      .order('date_of_collection', { ascending: false });
    
    if (samplesError) {
      console.error('Error fetching samples:', samplesError);
    }
    
    // If subject has a patient_mrn, get the patient data
    let patient = null;
    if (subject?.patient_mrn) {
      try {
        const { data: patientData, error: patientError } = await phiClient
          .from('patients')
          .select('*')
          .eq('patient_mrn', subject.patient_mrn)
          .maybeSingle(); // Use maybeSingle to avoid errors if not found
        
        if (patientError) {
          console.error('Error fetching patient data:', patientError);
        } else if (patientData) {
          patient = patientData;
        } else {
          console.log(`Patient with MRN ${subject.patient_mrn} not found`);
        }
      } catch (phiError) {
        console.error('Error accessing PHI data:', phiError);
        // Continue without PHI data - the user might not have access
      }
    }
    
    // Return the combined object
    return {
      ...subject,
      omics_results: samples || [], // Add the samples to the subject data
      patients: patient // Renamed from patient to patients to match expected structure
    };
  } catch (error) {
    console.error('Error in getOmicsSubjectById:', error);
    handleSupabaseError(error as any);
    return null;
  }
}

// Alias for getOmicsSubjectById for clarity
export const getOmicsSubjectBySubjectId = getOmicsSubjectById;

export async function getAllOmicsSubjects() {
  try {
    // First try with server client (respects RLS)
    const supabase = await createClient('laboratory');
    
    // Get all subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('omics_subjects')
      .select('*')
      .order('subject_id');
    
    if (subjectsError && subjectsError.code !== 'PGRST116') {
      console.error('Error fetching subjects with server client:', subjectsError);
    }
    
    // If no subjects are found through RLS or there was an error, use admin client as fallback
    // but log this for security auditing
    if (!subjects || subjects.length === 0) {
      console.log('No subjects found with server client. Falling back to admin client.');
      
      try {
        // Use admin client as fallback
        const adminClient = getSupabaseAdminClient();
        const { data: adminSubjects, error: adminError } = await adminClient
          .schema('laboratory')
          .from('omics_subjects')
          .select('*')
          .order('subject_id');
        
        if (adminError) {
          console.error('Error fetching subjects with admin client:', adminError);
          return [];
        }
        
        // Get sample counts and latest sample dates for each subject
        const subjectsWithSampleInfo = await Promise.all(
          adminSubjects.map(async (subject) => {
            // Get sample count
            const { count: sampleCount, error: countError } = await adminClient
              .schema('laboratory')
              .from('omics_results')
              .select('*', { count: 'exact', head: true })
              .eq('subject_id', subject.subject_id);
            
            if (countError) {
              console.error(`Error counting samples for subject ${subject.subject_id}:`, countError);
            }
            
            // Get latest sample date
            const { data: latestSample, error: latestError } = await adminClient
              .schema('laboratory')
              .from('omics_results')
              .select('date_of_collection')
              .eq('subject_id', subject.subject_id)
              .order('date_of_collection', { ascending: false })
              .limit(1)
              .single();
            
            if (latestError && latestError.code !== 'PGRST116') {
              console.error(`Error getting latest sample for subject ${subject.subject_id}:`, latestError);
            }
            
            return {
              ...subject,
              sample_count: sampleCount || 0,
              latest_sample_date: latestSample?.date_of_collection || null
            };
          })
        );
        
        return subjectsWithSampleInfo;
      } catch (adminError) {
        console.error('Error in admin client fallback:', adminError);
        return [];
      }
    }
    
    // Continue with server client if subjects were found
    const subjectsWithSampleInfo = await Promise.all(
      subjects.map(async (subject) => {
        // Get sample count
        const { count: sampleCount, error: countError } = await supabase
          .from('omics_results')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subject.subject_id);
        
        if (countError) {
          console.error(`Error counting samples for subject ${subject.subject_id}:`, countError);
        }
        
        // Get latest sample date
        const { data: latestSample, error: latestError } = await supabase
          .from('omics_results')
          .select('date_of_collection')
          .eq('subject_id', subject.subject_id)
          .order('date_of_collection', { ascending: false })
          .limit(1)
          .single();
        
        if (latestError && latestError.code !== 'PGRST116') {
          console.error(`Error getting latest sample for subject ${subject.subject_id}:`, latestError);
        }
        
        return {
          ...subject,
          sample_count: sampleCount || 0,
          latest_sample_date: latestSample?.date_of_collection || null
        };
      })
    );
    
    return subjectsWithSampleInfo;
  } catch (error) {
    console.error('Error in getAllOmicsSubjects:', error);
    handleSupabaseError(error as any);
    return [];
  }
}

export async function updateOmicsSubject(subject_id: string, data: Partial<OmicsSubject>) {
  try {
    const supabase = await getSupabaseServerClient();
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
    const phiClient = await createPhiClient();
    const labClient = await createClient(); // laboratory schema by default
    
    // Get all patients
    const { data: patients, error: patientsError } = await phiClient
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return [];
    }
    
    if (!patients || patients.length === 0) {
      console.log('No patients found');
      return [];
    }
    
    // For each patient, get their omics_subjects and registrations
    const patientsWithRelations = await Promise.all(
      patients.map(async (patient) => {
        // Get omics_subjects for this patient
        const { data: omicsSubjects, error: omicsError } = await labClient
          .from('omics_subjects')
          .select('*')
          .eq('patient_mrn', patient.patient_mrn);
        
        if (omicsError) {
          console.error(`Error fetching omics subjects for patient ${patient.patient_mrn}:`, omicsError);
        }
        
        // Get registrations for this patient
        const { data: registrations, error: regError } = await phiClient
          .from('subject_registration')
          .select('*')
          .eq('patient_mrn', patient.patient_mrn);
        
        if (regError) {
          console.error(`Error fetching registrations for patient ${patient.patient_mrn}:`, regError);
        }
        
        // For each omics subject, get their samples
        const omicsSubjectsWithSamples = await Promise.all(
          (omicsSubjects || []).map(async (subject) => {
            const { data: samples, error: samplesError } = await labClient
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
    
    return patientsWithRelations;
  } catch (error) {
    console.error('Error in getAllPatients:', error);
    handleSupabaseError(error as any);
    return [];
  }
}

export async function getPatientByMRN(patient_mrn: string) {
  try {
    const supabase = await getSupabaseServerClient();
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
    const { data: results, error } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select(`
        *,
        patients:patient_mrn (*),
        omics_results:subject_id (*)
      `)
      .or(`subject_id.ilike.%${query}%,patient_mrn.ilike.%${query}%`);
    
    if (error) handleSupabaseError(error as any);
    
    // Sort results by date_of_collection in descending order
    if (results) {
      results.forEach(subject => {
        if (subject.omics_results) {
          subject.omics_results.sort((a: any, b: any) => {
            const dateA = a.date_of_collection ? new Date(a.date_of_collection) : new Date(0);
            const dateB = b.date_of_collection ? new Date(b.date_of_collection) : new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
        }
      });
    }
    
    return results;
  } catch (error) {
    handleSupabaseError(error as any);
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
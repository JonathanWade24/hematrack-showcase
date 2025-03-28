import { createClient } from '@/lib/supabase/client'
import { AssayType } from './types'

// Define the types as interfaces instead of using a namespace
export interface OmicsResultsUpdateInput {
  sample_id?: string
  subject_id?: string
  date_of_collection?: Date | string | null
  genotype?: string | null
  age_at_collection?: number | null
  [key: string]: unknown
}

export interface OmicsResultsWhereInput {
  subject_id?: string
  [key: string]: unknown
}

export interface DateTimeFilter {
  gte?: Date
  lte?: Date
  [key: string]: unknown
}

export interface PatientsUpdateInput {
  patient_mrn?: string
  first_name?: string
  last_name?: string
  date_of_birth?: Date | string | null
  [key: string]: unknown
}

// Define types for the data parameters
interface OmicsResultData {
  sample_id: string
  subject_id: string
  date_of_collection?: string | null
  genotype?: string | null
  [key: string]: unknown
}

interface OmicsSubjectData {
  subject_id: string
  patient_mrn: string
  project?: string
  [key: string]: unknown
}

interface PatientData {
  patient_mrn: string
  first_name?: string
  last_name?: string
  date_of_birth?: string | null
  [key: string]: unknown
}

// Omics Results Operations
export async function createOmicsResult(data: OmicsResultData) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_results')
    .insert(data)
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function updateOmicsResult(
  sample_id: string, 
  data: Partial<OmicsResultsUpdateInput>
) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_results')
    .update(data)
    .match({ sample_id })
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function getOmicsResultBySampleId(sample_id: string) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_results')
    .select('*')
    .match({ sample_id })
    .single()
    
  if (error) throw error
  return result
}

export async function getOmicsResultsBySubjectId(subject_id: string) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_results')
    .select('*')
    .match({ subject_id })
    .order('date_of_collection', { ascending: false })
    
  if (error) throw error
  return result
}

export async function getOmicsResultsByAssayType(
  assay_type: AssayType,
  options?: {
    subject_id?: string
    start_date?: Date
    end_date?: Date
    qc_pass?: boolean
  }
) {
  const supabase = createClient()
  const dateField = `date_${assay_type.toLowerCase()}`
  const qcField = `qc_pass_${assay_type.toLowerCase()}`
  
  let query = supabase
    .from('omics_results')
    .select('*')
  
  if (options?.subject_id) {
    query = query.match({ subject_id: options.subject_id })
  }
  
  if (options?.start_date) {
    query = query.gte(dateField, options.start_date.toISOString())
  }
  
  if (options?.end_date) {
    query = query.lte(dateField, options.end_date.toISOString())
  }
  
  if (options?.qc_pass !== undefined) {
    query = query.match({ [qcField]: options.qc_pass ? 'Yes' : 'No' })
  }
  
  query = query.order(dateField, { ascending: false })
  
  const { data: result, error } = await query
  
  if (error) throw error
  return result
}

// Subject Operations
export async function createOmicsSubject(data: OmicsSubjectData) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_subjects')
    .insert(data)
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function getOmicsSubjectById(subject_id: string) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_subjects')
    .select('*')
    .match({ subject_id })
    .single()
    
  if (error) throw error
  return result
}

export async function updateOmicsSubject(subject_id: string, data: Partial<OmicsSubjectData>) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_subjects')
    .update(data)
    .match({ subject_id })
    .select()
    .single()
    
  if (error) throw error
  return result
}

// Patient Operations
export async function createPatient(data: PatientData) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('patients')
    .insert(data)
    .select()
    .single()
    
  if (error) throw error
  return result
}

export async function getPatientByMRN(patient_mrn: string) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('patients')
    .select('*')
    .match({ patient_mrn })
    .single()
    
  if (error) throw error
  return result
}

export async function updatePatient(
  patient_mrn: string,
  data: PatientsUpdateInput
) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('patients')
    .update(data)
    .match({ patient_mrn })
    .select()
    .single()
    
  if (error) throw error
  return result
}

// Search Operations
export async function searchSubjects(query: string) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_subjects')
    .select('*')
    .or(`subject_id.ilike.%${query}%,patient_mrn.ilike.%${query}%`)
    
  if (error) throw error
  return result
}

// Audit Operations
export async function logAuditEvent(
  table_name: string,
  action: string,
  old_data: Record<string, unknown>,
  new_data: Record<string, unknown>,
  changed_by: string
) {
  const supabase = createClient()
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
    .single()
    
  if (error) throw error
  return result
} 
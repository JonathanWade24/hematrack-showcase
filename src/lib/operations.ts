import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { AssayType } from './types'

// Omics Results Operations
export async function createOmicsResult(data: any) {
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
  data: Partial<Prisma.omics_resultsUncheckedUpdateInput>
) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_results')
    .update(data)
    .eq('sample_id', sample_id)
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
    .eq('sample_id', sample_id)
    .single()
    
  if (error) throw error
  return result
}

export async function getOmicsResultsBySubjectId(subject_id: string) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_results')
    .select('*')
    .eq('subject_id', subject_id)
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
  
  const where: Prisma.omics_resultsWhereInput = {
    subject_id: options?.subject_id
  }

  // Handle date field conditions
  if (options?.start_date || options?.end_date) {
    const dateConditions: Prisma.DateTimeFilter = {}
    if (options.start_date) dateConditions.gte = options.start_date
    if (options.end_date) dateConditions.lte = options.end_date
    where[dateField as keyof Prisma.omics_resultsWhereInput] = dateConditions
  }

  // Handle QC pass condition
  if (options?.qc_pass !== undefined) {
    where[qcField as keyof Prisma.omics_resultsWhereInput] = {
      equals: options.qc_pass ? 'Yes' : 'No'
    }
  }
  
  const { data: result, error } = await supabase
    .from('omics_results')
    .select('*')
    .eq(where)
    .order(dateField, { ascending: false })
    
  if (error) throw error
  return result
}

// Subject Operations
export async function createOmicsSubject(data: any) {
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
    .eq('subject_id', subject_id)
    .single()
    
  if (error) throw error
  return result
}

export async function updateOmicsSubject(subject_id: string, data: any) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('omics_subjects')
    .update(data)
    .eq('subject_id', subject_id)
    .select()
    .single()
    
  if (error) throw error
  return result
}

// Patient Operations
export async function createPatient(data: any) {
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
    .eq('patient_mrn', patient_mrn)
    .single()
    
  if (error) throw error
  return result
}

export async function updatePatient(
  patient_mrn: string,
  data: Prisma.patientsUpdateInput
) {
  const supabase = createClient()
  const { data: result, error } = await supabase
    .from('patients')
    .update(data)
    .eq('patient_mrn', patient_mrn)
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
    .or(`subject_id.ilike.%${query}%`, `patient_mrn.ilike.%${query}%`)
    
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
import { prisma } from './db'
import { Prisma } from '@prisma/client'
import { AssayType } from './types'

// Omics Results Operations
export async function createOmicsResult(data: Partial<Prisma.omics_resultsUncheckedCreateInput>) {
  return prisma.omics_results.create({
    data: data as Prisma.omics_resultsUncheckedCreateInput
  })
}

export async function updateOmicsResult(
  sample_id: string, 
  data: Partial<Prisma.omics_resultsUncheckedUpdateInput>
) {
  return prisma.omics_results.update({
    where: { sample_id },
    data
  })
}

export async function getOmicsResultBySampleId(sample_id: string) {
  return prisma.omics_results.findUnique({
    where: { sample_id },
    include: { omics_subjects: true }
  })
}

export async function getOmicsResultsBySubjectId(subject_id: string) {
  return prisma.omics_results.findMany({
    where: { subject_id },
    include: { omics_subjects: true },
    orderBy: { date_of_collection: 'desc' }
  })
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
  
  return prisma.omics_results.findMany({
    where,
    include: { omics_subjects: true },
    orderBy: { [dateField]: 'desc' }
  })
}

// Subject Operations
export async function createOmicsSubject(data: Prisma.omics_subjectsUncheckedCreateInput) {
  return prisma.omics_subjects.create({
    data
  })
}

export async function getOmicsSubjectById(subject_id: string) {
  return prisma.omics_subjects.findUnique({
    where: { subject_id },
    include: { patients: true }
  })
}

export async function updateOmicsSubject(
  subject_id: string, 
  data: Partial<Prisma.omics_subjectsUncheckedUpdateInput>
) {
  return prisma.omics_subjects.update({
    where: { subject_id },
    data
  })
}

// Patient Operations
export async function createPatient(data: Prisma.patientsCreateInput) {
  return prisma.patients.create({
    data
  })
}

export async function getPatientByMRN(patient_mrn: string) {
  return prisma.patients.findUnique({
    where: { patient_mrn },
    include: {
      omics_subjects: {
        include: {
          omics_results: true
        }
      }
    }
  })
}

export async function updatePatient(
  patient_mrn: string,
  data: Prisma.patientsUpdateInput
) {
  return prisma.patients.update({
    where: { patient_mrn },
    data
  })
}

// Search Operations
export async function searchSubjects(query: string) {
  return prisma.omics_subjects.findMany({
    where: {
      OR: [
        { subject_id: { contains: query, mode: 'insensitive' } },
        { patient_mrn: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      patients: true,
      omics_results: {
        orderBy: { date_of_collection: 'desc' }
      }
    }
  })
}

// Audit Operations
export async function logAuditEvent(
  table_name: string,
  action: string,
  old_data: Record<string, unknown>,
  new_data: Record<string, unknown>,
  changed_by: string
) {
  return prisma.audit_log.create({
    data: {
      table_name,
      action,
      old_data: old_data as Prisma.JsonObject,
      new_data: new_data as Prisma.JsonObject,
      changed_by
    }
  })
} 
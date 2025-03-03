import { prisma } from '@/db'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Decimal } from '@prisma/client/runtime/library'

// Utility function to convert Decimal values to numbers
function convertToNumber<T>(data: T): T {
  if (data === null || data === undefined) return data
  if (data instanceof Decimal) return Number(data.toString()) as T
  if (Array.isArray(data)) return data.map(convertToNumber) as T
  if (typeof data === 'object') {
    const result = {} as T
    for (const [key, value] of Object.entries(data)) {
      result[key as keyof T] = convertToNumber(value)
    }
    return result
  }
  return data
}

interface ProcessingStatus {
  hasDNA: boolean
  hasPBMC: boolean
  hasPlasma: boolean
}

interface SampleBase {
  sample_id: string
  subject_id: string
  date_of_collection: Date | null
  genotype: string | null
  qc_pass_advia: string | null
  qc_pass_lorrca: string | null
  qc_notes_advia: string | null
  qc_notes_lorrca: string | null
  concentration_1_dna: Decimal | null
  cell_number_1_pbmc: Decimal | null
  vol_plasma_1: Decimal | null
  rbc_advia: Decimal | null
  hb_advia: Decimal | null
  hct_advia: Decimal | null
  mcv_advia: Decimal | null
  mch_advia: Decimal | null
  mchc_advia: Decimal | null
  rdw_advia: Decimal | null
  plt_advia: Decimal | null
  wbc_advia: Decimal | null
  omics_subjects?: {
    subject_id: string
    patient_mrn: string
    project: string
  }
}

interface OmicsResult {
  id: string
  project: string | null
  subject_id: string
  sample_number: number
  sample_id: string
  date_of_collection: Date | null
  concentration_1_dna: Decimal | null
  cell_number_1_pbmc: Decimal | null
  vol_plasma_1: Decimal | null
  qc_pass_advia: string | null
  qc_pass_lorrca: string | null
  qc_notes_advia: string | null
  qc_notes_lorrca: string | null
  rbc_advia: Decimal | null
  hb_advia: Decimal | null
  hct_advia: Decimal | null
  mcv_advia: Decimal | null
  mch_advia: Decimal | null
  mchc_advia: Decimal | null
  rdw_advia: Decimal | null
  plt_advia: Decimal | null
  wbc_advia: Decimal | null
  processing_status?: 'Complete' | 'Partial' | 'Pending'
  qc_status?: 'Passed' | 'Failed' | 'Review'
  qc_notes?: string | null
}

async function getDashboardData() {
  try {
    // Get all samples with their DNA, PBMC, and plasma data
    const recentSamples = await prisma.omics_results.findMany({
      take: 10,
      orderBy: {
        date_of_collection: 'desc'
      },
      select: {
        sample_id: true,
        subject_id: true,
        date_of_collection: true,
        genotype: true,
        qc_pass_advia: true,
        qc_pass_lorrca: true,
        qc_notes_advia: true,
        qc_notes_lorrca: true,
        concentration_1_dna: true,
        cell_number_1_pbmc: true,
        vol_plasma_1: true,
        rbc_advia: true,
        hb_advia: true,
        hct_advia: true,
        mcv_advia: true,
        mch_advia: true,
        mchc_advia: true,
        rdw_advia: true,
        plt_advia: true,
        wbc_advia: true,
        omics_subjects: {
          select: {
            subject_id: true,
            patient_mrn: true,
            project: true
          }
        }
      }
    })

    // Get all samples for processing status calculation
    const allSamples = await prisma.omics_results.findMany({
      select: {
        subject_id: true,
        concentration_1_dna: true,
        cell_number_1_pbmc: true,
        vol_plasma_1: true,
        qc_pass_advia: true,
        qc_pass_lorrca: true,
        rbc_advia: true,
        hb_advia: true,
        hct_advia: true,
        mcv_advia: true,
        mch_advia: true,
        mchc_advia: true,
        rdw_advia: true,
        plt_advia: true,
        wbc_advia: true
      }
    })

    // Helper function to check if a value is non-zero
    const isNonZero = (value: Decimal | number | null): boolean => {
      if (value === null) return false
      if (typeof value === 'number') return value !== 0
      return !value.equals(new Decimal(0))
    }

    // Calculate subject processing status
    const subjectProcessingStatus = new Map<string, ProcessingStatus>()
    allSamples.forEach((sample: SampleBase) => {
      const currentStatus = subjectProcessingStatus.get(sample.subject_id) || {
        hasDNA: false,
        hasPBMC: false,
        hasPlasma: false
      }

      const hasValidAdvia = [
        sample.rbc_advia,
        sample.hb_advia,
        sample.hct_advia,
        sample.mcv_advia,
        sample.mch_advia,
        sample.mchc_advia,
        sample.rdw_advia,
        sample.plt_advia,
        sample.wbc_advia
      ].some(isNonZero)

      if (hasValidAdvia) {
        if (isNonZero(sample.concentration_1_dna)) currentStatus.hasDNA = true
        if (isNonZero(sample.cell_number_1_pbmc)) currentStatus.hasPBMC = true
        if (isNonZero(sample.vol_plasma_1)) currentStatus.hasPlasma = true
      }

      subjectProcessingStatus.set(sample.subject_id, currentStatus)
    })

    // Count subjects by processing status
    interface SubjectStatusCounts {
      complete: number
      partial: number
      pending: number
    }

    const subjectCounts = Array.from(subjectProcessingStatus.entries()).reduce<SubjectStatusCounts>(
      (acc, [_, status]) => {
        if (status.hasDNA && status.hasPBMC && status.hasPlasma) {
          acc.complete++
        } else if (status.hasDNA || status.hasPBMC || status.hasPlasma) {
          acc.partial++
        } else {
          acc.pending++
        }
        return acc
      },
      { complete: 0, partial: 0, pending: 0 }
    )

    // Process recent samples with status information
    const processedSamples = recentSamples.map((sample: SampleBase) => {
      // Check if ADVIA has any non-zero values
      const hasValidAdvia = [
        sample.rbc_advia,
        sample.hb_advia,
        sample.hct_advia,
        sample.mcv_advia,
        sample.mch_advia,
        sample.mchc_advia,
        sample.rdw_advia,
        sample.plt_advia,
        sample.wbc_advia
      ].some(isNonZero)

      // Check other components for non-zero values
      const hasValidDNA = isNonZero(sample.concentration_1_dna)
      const hasValidPBMC = isNonZero(sample.cell_number_1_pbmc)
      const hasValidPlasma = isNonZero(sample.vol_plasma_1)

      // Determine processing status
      let processing_status: 'Complete' | 'Partial' | 'Pending'
      if (!hasValidAdvia) {
        processing_status = 'Pending'
      } else if (hasValidDNA && hasValidPBMC && hasValidPlasma) {
        processing_status = 'Complete'
      } else {
        processing_status = 'Partial'
      }

      // Parse QC notes for detailed failure reasons
      const parseQCNotes = (status: string | null, notes: string | null) => {
        if (status !== 'No') return null
        return notes ? notes.split(',').map(note => note.trim()) : []
      }

      // Get specific QC failure reasons
      const adviaFailures = parseQCNotes(sample.qc_pass_advia, sample.qc_notes_advia)
      const lorrcaFailures = parseQCNotes(sample.qc_pass_lorrca, sample.qc_notes_lorrca)

      // Determine QC status with specific failure reasons
      let qc_status: 'Passed' | 'Failed' | 'Review'
      const qc_notes: string[] = []

      if (sample.qc_pass_advia === 'No') {
        qc_status = 'Failed'
        if (adviaFailures) qc_notes.push(...adviaFailures)
      } else if (sample.qc_pass_lorrca === 'No') {
        qc_status = 'Failed'
        if (lorrcaFailures) qc_notes.push(...lorrcaFailures.map(note => `Lorrca: ${note}`))
      } else if (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review') {
        qc_status = 'Review'
      } else {
        qc_status = 'Passed'
      }

      return {
        ...sample,
        processing_status,
        qc_status,
        qc_notes: qc_notes.length > 0 ? qc_notes.join(', ') : null,
        date_of_collection: sample.date_of_collection ? sample.date_of_collection.toISOString() : null
      }
    })

    // Count total samples and subjects
    const totalSamples = await prisma.omics_results.count()
    const totalSubjects = await prisma.omics_subjects.count()

    // Count QC passed samples (only considering ADVIA and Lorrca failures)
    const qcPassedSamples = await prisma.omics_results.count({
      where: {
        AND: [
          {
            OR: [
              { qc_pass_advia: { not: 'No' } },
              { qc_pass_advia: null }
            ]
          },
          {
            OR: [
              { qc_pass_lorrca: { not: 'No' } },
              { qc_pass_lorrca: null }
            ]
          }
        ]
      }
    })

    // Count samples by processing status
    interface ProcessingStatusCounts {
      complete: number
      partial: number
      pending: number
    }

    const initialCounts: ProcessingStatusCounts = { complete: 0, partial: 0, pending: 0 }
    const processingStatusCounts = allSamples.reduce((acc: ProcessingStatusCounts, sample: SampleBase) => {
      const hasValidAdvia = [
        sample.rbc_advia,
        sample.hb_advia,
        sample.hct_advia,
        sample.mcv_advia,
        sample.mch_advia,
        sample.mchc_advia,
        sample.rdw_advia,
        sample.plt_advia,
        sample.wbc_advia
      ].some(isNonZero)

      const hasValidDNA = isNonZero(sample.concentration_1_dna)
      const hasValidPBMC = isNonZero(sample.cell_number_1_pbmc)
      const hasValidPlasma = isNonZero(sample.vol_plasma_1)

      if (!hasValidAdvia) {
        acc.pending++
      } else if (hasValidDNA && hasValidPBMC && hasValidPlasma) {
        acc.complete++
      } else {
        acc.partial++
      }

      return acc
    }, initialCounts)

    // Filter out any results with null or empty sample_ids
    const filteredSamples = processedSamples.filter(
      (sample: OmicsResult) => sample.sample_id && sample.sample_id.trim() !== ''
    )

    return {
      recentSamples: filteredSamples || [],
      totalSamples: totalSamples || 0,
      totalSubjects: totalSubjects || 0,
      qcPassedSamples: qcPassedSamples || 0,
      fullyProcessedSamples: processingStatusCounts.complete || 0,
      partiallyProcessedSamples: processingStatusCounts.partial || 0,
      pendingSamples: processingStatusCounts.pending || 0,
      subjectCounts: {
        complete: subjectCounts.complete || 0,
        partial: subjectCounts.partial || 0,
        pending: subjectCounts.pending || 0
      }
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return {
      recentSamples: [],
      totalSamples: 0,
      totalSubjects: 0,
      qcPassedSamples: 0,
      fullyProcessedSamples: 0,
      partiallyProcessedSamples: 0,
      pendingSamples: 0,
      subjectCounts: {
        complete: 0,
        partial: 0,
        pending: 0
      }
    }
  }
}

export default async function DashboardPage() {
  const rawData = await getDashboardData()
  
  // Convert all Decimal values to numbers before passing to client
  const data = convertToNumber(rawData)
  
  return (
    <DashboardLayout>
      <DashboardClient initialData={data} />
    </DashboardLayout>
  )
}

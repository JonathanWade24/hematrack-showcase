import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// Define types for our data structures
interface ProcessingStatus {
  hasDNA: boolean
  hasPBMC: boolean
  hasPlasma: boolean
}

interface OmicsSample {
  id: string
  project?: string | null
  subject_id: string
  sample_number?: number
  sample_id: string
  date_of_collection?: string | null
  genotype?: string | null
  qc_pass_advia?: string | null
  qc_pass_lorrca?: string | null
  qc_notes_advia?: string | null
  qc_notes_lorrca?: string | null
  concentration_1_dna?: number | null
  cell_number_1_pbmc?: number | null
  vol_plasma_1?: number | null
  rbc_advia?: number | null
  hb_advia?: number | null
  hct_advia?: number | null
  mcv_advia?: number | null
  mch_advia?: number | null
  mchc_advia?: number | null
  rdw_advia?: number | null
  plt_advia?: number | null
  wbc_advia?: number | null
  processing_status?: 'Complete' | 'Partial' | 'Pending'
  qc_status?: 'Passed' | 'Failed' | 'Review'
  qc_notes?: string | null
}

interface SubjectStatusCounts {
  complete: number
  partial: number
  pending: number
}

interface ProcessingStatusCounts {
  complete: number
  partial: number
  pending: number
}

interface DashboardData {
  recentSamples: OmicsSample[]
  totalSamples: number
  totalSubjects: number
  qcPassedSamples: number
  fullyProcessedSamples: number
  partiallyProcessedSamples: number
  pendingSamples: number
  subjectCounts: SubjectStatusCounts
}

export default async function Home() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    // Redirect to login if not authenticated
    redirect('/login')
  }
  
  try {
    // Helper function to check if a value is non-zero
    const isNonZero = (value: unknown): boolean => {
      if (value === null || value === undefined) return false
      if (typeof value === 'number') return value !== 0
      if (typeof value === 'string') return value !== '0' && value !== ''
      // For any other type, convert to number and check
      return Number(value) !== 0
    }

    // Get recent samples - Fix schema reference
    const { data: recentSamples, error: samplesError } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select(`
        id,
        project,
        subject_id,
        sample_number,
        sample_id,
        date_of_collection,
        genotype,
        qc_pass_advia,
        qc_pass_lorrca,
        qc_notes_advia,
        qc_notes_lorrca,
        concentration_1_dna,
        cell_number_1_pbmc,
        vol_plasma_1,
        rbc_advia,
        hb_advia,
        hct_advia,
        mcv_advia,
        mch_advia,
        mchc_advia,
        rdw_advia,
        plt_advia,
        wbc_advia
      `)
      .order('date_of_collection', { ascending: false })
      .limit(10)
    
    if (samplesError) {
      console.error('Error fetching recent samples:', samplesError)
      throw samplesError
    }

    // Get all samples for processing status calculation - Fix schema reference
    const { data: allSamples, error: allSamplesError } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select(`
        id,
        subject_id,
        concentration_1_dna,
        cell_number_1_pbmc,
        vol_plasma_1,
        rbc_advia,
        hb_advia,
        hct_advia,
        mcv_advia,
        mch_advia,
        mchc_advia,
        rdw_advia,
        plt_advia,
        wbc_advia
      `)
    
    if (allSamplesError) {
      console.error('Error fetching all samples:', allSamplesError)
      throw allSamplesError
    }

    // Count total samples and subjects - Fix schema references
    const { count: totalSamples, error: totalSamplesError } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select('*', { count: 'exact', head: true })
    
    if (totalSamplesError) {
      console.error('Error counting total samples:', totalSamplesError)
      throw totalSamplesError
    }

    const { count: totalSubjects, error: totalSubjectsError } = await supabase
      .schema('laboratory')
      .from('omics_subjects')
      .select('*', { count: 'exact', head: true })
    
    if (totalSubjectsError) {
      console.error('Error counting total subjects:', totalSubjectsError)
      throw totalSubjectsError
    }

    // Calculate subject processing status
    const subjectProcessingStatus = new Map<string, ProcessingStatus>()
    
    // Use type assertion to match the expected type
    const typedAllSamples = allSamples as unknown as OmicsSample[]
    
    typedAllSamples.forEach((sample) => {
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
    const subjectCounts = Array.from(subjectProcessingStatus.entries()).reduce<SubjectStatusCounts>(
      (acc, [, status]) => {
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
    // Use type assertion to match the expected type
    const typedRecentSamples = recentSamples as unknown as OmicsSample[]
    
    const processedSamples = typedRecentSamples.map((sample) => {
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
      const parseQCNotes = (status: string | null | undefined, notes: string | null | undefined) => {
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
        date_of_collection: sample.date_of_collection ? new Date(sample.date_of_collection).toISOString() : null
      }
    })

    // Count QC passed samples (only considering ADVIA and Lorrca failures)
    const qcPassedSamples = typedAllSamples.filter((sample) => {
      return (sample.qc_pass_advia !== 'No' || sample.qc_pass_advia === null) && 
             (sample.qc_pass_lorrca !== 'No' || sample.qc_pass_lorrca === null)
    }).length

    // Count samples by processing status
    const initialCounts: ProcessingStatusCounts = { complete: 0, partial: 0, pending: 0 }
    const processingStatusCounts = typedAllSamples.reduce((acc: ProcessingStatusCounts, sample) => {
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
      (sample) => sample.sample_id && sample.sample_id.trim() !== ''
    )

    // Create the dashboard data object
    const dashboardData: DashboardData = {
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
    
    return (
      <DashboardLayout>
        <DashboardClient initialData={dashboardData} />
      </DashboardLayout>
    )
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    
    // Return a fallback UI with empty data
    const emptyData: DashboardData = {
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
    
    return (
      <DashboardLayout>
        <DashboardClient initialData={emptyData} />
      </DashboardLayout>
    )
  }
}

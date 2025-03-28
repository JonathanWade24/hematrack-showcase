import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/server'
import { SampleSearch } from '@/components/data-entry/SampleSearch'
import { convertToNumber } from '@/lib/utils'

type Sample = {
  sample_id: string
  subject_id: string
  date_of_collection: string | null
  genotype: string | null
  processing_status: 'Complete' | 'Partial' | 'Pending'
  qc_status: 'Passed' | 'Failed' | 'Review'
}

type OmicsResult = {
  sample_id: string
  subject_id: string
  date_of_collection: string | null
  rbc_advia: number | null
  hb_advia: number | null
  hct_advia: number | null
  mcv_advia: number | null
  mch_advia: number | null
  mchc_advia: number | null
  rdw_advia: number | null
  plt_advia: number | null
  wbc_advia: number | null
  concentration_1_dna: number | null
  cell_number_1_pbmc: number | null
  vol_plasma_1: number | null
  qc_pass_advia: string | null
  qc_pass_lorrca: string | null
  qc_pass_dna: string | null
  omics_subject: {
    genotype: string | null
  } | null
}

async function getRecentSamples(): Promise<Sample[]> {
  // Get Supabase client
  const supabase = await createClient()
  
  try {
    const { data: samples, error } = await supabase
      .from('omics_results')
      .select(`
        *,
        omics_subject:omics_subjects (genotype)
      `)
      .order('date_of_collection', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching recent samples:', error)
      return []
    }
    
    // Process samples to include processing and QC status
    const processedSamples = (samples || []).map((sample: OmicsResult) => {
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
      ].some(value => value !== null && Number(value) !== 0)

      // Check other components
      const hasValidDNA = sample.concentration_1_dna !== null && Number(sample.concentration_1_dna) !== 0
      const hasValidPBMC = sample.cell_number_1_pbmc !== null && Number(sample.cell_number_1_pbmc) !== 0
      const hasValidPlasma = sample.vol_plasma_1 !== null && Number(sample.vol_plasma_1) !== 0

      // Determine processing status
      let processing_status: 'Complete' | 'Partial' | 'Pending'
      if (!hasValidAdvia) {
        processing_status = 'Pending'
      } else if (hasValidDNA && hasValidPBMC && hasValidPlasma) {
        processing_status = 'Complete'
      } else {
        processing_status = 'Partial'
      }

      // Determine QC status
      let qc_status: 'Passed' | 'Failed' | 'Review'
      if (sample.qc_pass_advia === 'No' || sample.qc_pass_lorrca === 'No' || sample.qc_pass_dna === 'No') {
        qc_status = 'Failed'
      } else if (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review' || sample.qc_pass_dna === 'Review') {
        qc_status = 'Review'
      } else {
        qc_status = 'Passed'
      }

      return {
        sample_id: sample.sample_id,
        subject_id: sample.subject_id,
        date_of_collection: sample.date_of_collection,
        genotype: sample.omics_subject?.genotype || null,
        processing_status,
        qc_status
      } as Sample
    })

    return convertToNumber(processedSamples)
  } catch (error) {
    console.error('Error in getRecentSamples:', error)
    return []
  }
}

export default async function UpdateSamplePage() {
  const recentSamples = await getRecentSamples()

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Continue Sample Entry</h1>
          <p className="mt-2 text-sm text-gray-700">
            Select a recently entered sample to continue data entry, or search for a specific sample.
          </p>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <SampleSearch recentSamples={recentSamples} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
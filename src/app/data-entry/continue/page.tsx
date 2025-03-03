import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SamplesTable } from '@/components/dashboard/SamplesTable'
import { prisma } from '@/db'
import { convertToNumber } from '@/lib/utils'
import { SampleSearch } from '@/components/data-entry/SampleSearch'
import type { Sample } from '@/components/dashboard/SamplesTable'

async function getRecentSamples(): Promise<Sample[]> {
  type PrismaSample = Awaited<ReturnType<typeof prisma.omics_results.findMany>>[number] & {
    omics_subjects: { genotype: string | null }
  }

  const samples = await prisma.omics_results.findMany({
    take: 10,
    orderBy: {
      updated_at: 'desc'
    },
    include: {
      omics_subjects: true
    }
  })

  // Process samples to include processing and QC status
  const processedSamples = samples.map((sample: PrismaSample) => {
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
      date_of_collection: sample.date_of_collection?.toISOString() || null,
      genotype: sample.omics_subjects?.genotype || null,
      processing_status,
      qc_status
    } as Sample
  })

  return convertToNumber(processedSamples)
}

export default async function UpdateSamplePage() {
  const recentSamples = await getRecentSamples()

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Update Existing Sample</h1>
            <p className="mt-2 text-sm text-gray-600">
              Search for a sample by Sample ID or Subject ID to update its information
            </p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Search Samples</h2>
            <SampleSearch />
          </div>

          {/* Recent Samples */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Recent Samples</h3>
              <p className="mt-1 text-sm text-gray-600">
                Click on a sample to update its information
              </p>
            </div>
            <SamplesTable samples={recentSamples} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
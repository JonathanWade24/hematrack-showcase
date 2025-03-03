import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { prisma } from '@/db'
import { notFound } from 'next/navigation'
import { convertToNumber } from '@/lib/utils'
import { SampleEntryForm } from '@/components/data-entry/SampleEntryForm'

interface PageProps {
  params: {
    id: string
  }
}

async function getSampleData(sampleId: string) {
  const sample = await prisma.omics_results.findUnique({
    where: { sample_id: sampleId },
    include: {
      omics_subjects: true
    }
  })

  if (!sample) {
    return null
  }

  return convertToNumber(sample)
}

export default async function EditSamplePage({ params }: PageProps) {
  const sample = await getSampleData(params.id)

  if (!sample) {
    notFound()
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Edit Sample {sample.sample_id}</h1>
          <p className="mt-2 text-sm text-gray-700">
            Update sample information. All fields are optional unless marked as required.
          </p>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <SampleEntryForm initialData={sample} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
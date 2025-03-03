import { prisma } from '@/db'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SampleViewer } from '@/components/samples/SampleViewer'
import { convertToNumber } from '@/lib/utils'

interface SamplePageProps {
  params: {
    id: string
  }
}

async function getSampleData(sampleId: string) {
  const sample = await prisma.omics_results.findUnique({
    where: { sample_id: sampleId },
    include: {
      omics_subjects: {
        include: {
          patients: {
            select: {
              first_name: true,
              last_name: true,
              birth_date: true,
              sex: true,
              race: true,
              ethnicity: true
            }
          }
        }
      }
    }
  })

  if (!sample) {
    return null
  }

  // Convert all Decimal values to numbers
  return convertToNumber(sample)
}

export default async function SamplePage({ params }: SamplePageProps) {
  const sample = await getSampleData(params.id)
  
  if (!sample) {
    notFound()
  }

  return (
    <DashboardLayout>
      <SampleViewer sample={sample} />
    </DashboardLayout>
  )
} 
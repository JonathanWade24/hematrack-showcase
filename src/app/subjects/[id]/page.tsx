import { prisma } from '@/db'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SubjectViewer } from '@/components/subjects/SubjectViewer'
import { convertToNumber } from '@/lib/utils'

interface SubjectPageProps {
  params: {
    id: string
  }
}

async function getSubjectData(subjectId: string) {
  const subject = await prisma.omics_subjects.findUnique({
    where: { subject_id: subjectId },
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
      },
      omics_results: {
        orderBy: {
          date_of_collection: 'desc'
        }
      }
    }
  })

  if (!subject) {
    return null
  }

  // Convert all Decimal values to numbers
  return convertToNumber(subject)
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const subject = await getSubjectData(params.id)
  
  if (!subject) {
    notFound()
  }

  return (
    <DashboardLayout>
      <SubjectViewer subject={subject} />
    </DashboardLayout>
  )
} 
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SubjectViewer } from '@/components/subjects/SubjectViewer'
import { convertToNumber } from '@/lib/utils'
import { getOmicsSubjectById } from '@/lib/supabase/operations'

interface SubjectPageProps {
  params: {
    id: string
  }
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  // Convert params to a regular object to avoid the async property access error
  const id = params.id;
  
  const subject = await getOmicsSubjectById(id);
  
  if (!subject) {
    notFound();
  }

  // Convert all numeric values to numbers
  const processedSubject = convertToNumber(subject);

  return (
    <DashboardLayout>
      <SubjectViewer subject={processedSubject} />
    </DashboardLayout>
  );
} 
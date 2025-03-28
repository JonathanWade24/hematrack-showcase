import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SubjectViewer } from '@/components/subjects/SubjectViewer'
import { convertToNumber } from '@/lib/utils'
import { getOmicsSubjectById } from '@/lib/supabase/operations'

// Updated page props for Next.js 15
type PageParams = {
  id: string;
};

type SubjectPageProps = {
  params: Promise<PageParams> | undefined;
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  // Handle params correctly, checking for undefined
  if (!params) {
    throw new Error('Missing page parameters');
  }
  
  // Resolve params if it's a Promise
  const parameters = await params;
  const id = parameters.id;
  
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
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SubjectViewer } from '@/components/subjects/SubjectViewer'
// import { getOmicsSubjectById } from '@/lib/supabase/operations' // Old Supabase import
import { getOmicsSubjectById } from '@/lib/prisma/operations' // New Prisma import
import { Decimal } from 'decimal.js'

// Updated page props for Next.js 15
type PageParams = {
  id: string;
};

type SubjectPageProps = {
  params: Promise<PageParams> | undefined;
};

// Helper function to serialize Decimal fields in an object
const serializeDecimals = (obj: any) => {
  if (!obj) return null;
  const newObj = { ...obj };
  for (const key in newObj) {
    if (newObj[key] instanceof Decimal) {
      newObj[key] = newObj[key].toString();
    }
  }
  return newObj;
};

// Helper function to serialize Date fields in an object
const serializeDates = (obj: any) => {
  if (!obj) return null;
  const newObj = { ...obj };
  for (const key in newObj) {
    if (newObj[key] instanceof Date) {
      newObj[key] = newObj[key].toISOString();
    }
  }
  return newObj;
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  // Handle params correctly, checking for undefined
  if (!params) {
    throw new Error('Missing page parameters');
  }
  
  // Resolve params if it's a Promise
  const parameters = await params;
  const idFromParams = parameters.id;
  
  // Use the new Prisma function
  const subjectData = await getOmicsSubjectById(idFromParams);
  
  if (!subjectData) {
    notFound();
  }

  // Fully serialize the subject data, including nested objects/arrays
  const serializedPatient = serializeDates(serializeDecimals(subjectData.patient));
  const serializedOmicsResults = subjectData.omics_results.map(result => 
    serializeDates(serializeDecimals(result))
  );

  const subjectForViewer = {
    ...serializeDates(serializeDecimals(subjectData)), // Serialize top-level subject fields
    id: subjectData.subject_id, // Ensure ID is present
    omics_results: serializedOmicsResults, // Assign serialized results
    patient: serializedPatient // Assign serialized patient
  };

  // Remove the original non-serialized nested fields if they exist at top level
  delete (subjectForViewer as any).patients; // Prisma includes relation here

  return (
    <DashboardLayout>
      <SubjectViewer subject={subjectForViewer} />
    </DashboardLayout>
  );
} 
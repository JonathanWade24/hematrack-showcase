import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SubjectViewer } from '@/components/subjects/SubjectViewer'
// import { getOmicsSubjectById } from '@/lib/supabase/operations' // Old Supabase import
// import { getOmicsSubjectById } from '@/lib/prisma/operations' // Old Prisma import
import { getOmicsSubjectById, SubjectWithDetails } from '@/lib/db/queries' // Drizzle import
// import { Decimal } from 'decimal.js' // No longer needed

// Updated page props for Next.js 15
type PageParams = {
  id: string;
};

type SubjectPageProps = {
  params: Promise<PageParams> | undefined;
};

// Helper function to serialize Decimal fields in an object
// const serializeDecimals = (obj: any) => {
//   if (!obj) return null;
//   const newObj = { ...obj };
//   for (const key in newObj) {
//     if (newObj[key] instanceof Decimal) {
//       newObj[key] = newObj[key].toString();
//     }
//   }
//   return newObj;
// };

// Helper function to serialize Date fields in an object
const serializeDates = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj; // Return non-objects as is
  
  // Handle arrays recursively
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }

  const newObj = { ...obj };
  for (const key in newObj) {
    if (newObj[key] instanceof Date) {
      newObj[key] = newObj[key].toISOString();
    } else if (typeof newObj[key] === 'object') {
        // Recursively serialize nested objects/arrays
        newObj[key] = serializeDates(newObj[key]); 
    }
  }
  return newObj;
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  if (!params) {
    throw new Error('Missing page parameters');
  }
  
  const parameters = await params;
  const subjectId = parameters.id;
  
  // Use the Drizzle function
  const subjectData: SubjectWithDetails | null = await getOmicsSubjectById(subjectId);
  
  if (!subjectData) {
    notFound();
  }

  // Serialize dates deeply within the entire subjectData object
  // This handles dates in the top-level subject, the patient object,
  // the samples array, and all nested results arrays.
  const subjectForViewer = serializeDates(subjectData);

  // Ensure id field exists for component if needed (Drizzle includes subject_id)
  // subjectForViewer.id = subjectData.subject_id; // Probably not needed if component uses subject_id
  
  // The structure passed to SubjectViewer is now SubjectWithDetails 
  // (with Dates serialized to strings), including nested samplesInLaboratories
  // SubjectViewer component will need updating separately to handle this new structure.

  return (
    <DashboardLayout>
      {/* Pass the serialized data */} 
      <SubjectViewer subject={subjectForViewer} />
    </DashboardLayout>
  );
} 
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound, redirect } from 'next/navigation'
import { SampleViewer } from '@/components/samples/SampleViewer'
import { prisma } from '@/lib/prisma' // Use Prisma client
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Define allowed roles for accessing sample details
const ALLOWED_ROLES = ['admin', 'clinician', 'editor', 'viewer', 'clinical_researcher_full', 'clinical_researcher_masked'] // Adjust as needed

// Updated page props for Next.js 15
type PageParams = {
  id: string;
};

type SamplePageProps = {
  params: Promise<PageParams> | undefined;
};

async function getSampleData(sampleId: string) {
  try {
    // Fetch the sample data with related subject and potentially patient
    const sampleWithRelations = await prisma.omics_results.findUnique({
      where: {
        sample_id: sampleId,
      },
      include: {
        omics_subjects: { // Include the related subject
          include: {
            patients: { // Include the related patient from the subject
              select: { // Select only necessary non-sensitive fields initially if needed
                patient_mrn: true, // Keep MRN for potential linking/display
                first_name: true,
                last_name: true,
                birth_date: true,
                sex: true,
                race: true,
                ethnicity: true,
              },
            },
          },
        },
      },
    });

    if (!sampleWithRelations) {
      console.log(`[getSampleData] No sample found with ID: ${sampleId}`)
      return null;
    }
    
    // Structure the data similar to the original output if needed by SampleViewer
    // The structure returned by Prisma with includes is already nested.
    return sampleWithRelations;

  } catch (error) {
    console.error(`[getSampleData] Error fetching data for sample ${sampleId}:`, error)
    return null;
  }
}

export default async function SamplePage({ params }: SamplePageProps) {
  // --- Authentication & Authorization ---
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
    const reason = !session ? 'No session' : !session.user ? 'No user' : 'Insufficient role';
    console.warn(`[Sample Page] Unauthorized access attempt: ${reason}`);
    // Decide whether to redirect to login or show a generic notFound/forbidden page
    // Redirecting to login is common if the user isn't authenticated at all
    if (!session) redirect('/login'); 
    // Otherwise, show not found to avoid revealing the page exists
    notFound(); 
  }

  // Handle params correctly, checking for undefined
  if (!params) {
    throw new Error('Missing page parameters');
  }
  
  // Resolve params if it's a Promise
  const parameters = await params;
  const id = parameters.id;
  
  const sample = await getSampleData(id);
  
  if (!sample) {
    notFound(); // Show 404 if sample data is null (not found or fetch error)
  }

  // Need to explicitly type `sample` before passing to client component
  // to avoid serialization issues with Date objects etc.
  // Select/transform the fields needed by SampleViewer here
  const sampleForViewer = {
    ...sample,
    // Convert Date objects to strings or numbers for serialization
    date_of_collection: sample.date_of_collection?.toISOString() ?? null,
    omics_subjects: sample.omics_subjects ? {
        ...sample.omics_subjects,
        patients: sample.omics_subjects.patients ? {
            ...sample.omics_subjects.patients,
            birth_date: sample.omics_subjects.patients.birth_date?.toISOString() ?? null,
        } : null,
         // Convert other dates if they exist on omics_subjects
        created_at: sample.omics_subjects.created_at?.toISOString() ?? null,
        updated_at: sample.omics_subjects.updated_at?.toISOString() ?? null,
    } : null,
     // Convert other dates if they exist on omics_results
    created_at: sample.created_at?.toISOString() ?? null,
    updated_at: sample.updated_at?.toISOString() ?? null,
    qc_run_date: sample.qc_run_date?.toISOString() ?? null, // Example
    date_of_processing: sample.date_of_processing?.toISOString() ?? null, // Example
  };

  return (
    <DashboardLayout>
      {/* Pass the correctly typed/serialized data */} 
      <SampleViewer sample={sampleForViewer} /> 
    </DashboardLayout>
  );
} 
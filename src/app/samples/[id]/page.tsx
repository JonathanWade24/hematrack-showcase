import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound, redirect } from 'next/navigation'
import { SampleViewer } from '@/components/samples/SampleViewer'
// import { prisma } from '@/lib/prisma' // Remove Prisma client
// import { getServerSession } from 'next-auth/next' // Old import
import { auth } from '@/app/api/auth/[...nextauth]/route'
// Remove DefaultSession and DefaultUser imports as we'll use a minimal local type
// import type { Session as DefaultSession, User as DefaultUser } from 'next-auth'; 

// Import Drizzle function and types
import { getSampleByIdWithResults, SampleWithAllResults, formatDate } from '@/lib/db/queries';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button'; // Import Button

// Define allowed roles for accessing sample details
const ALLOWED_ROLES = ['admin', 'clinician', 'editor', 'viewer', 'clinical_researcher_full', 'clinical_researcher_masked', 'noPHI_viewer', 'noPHI_editor'] // Adjust as needed

// Updated page props for Next.js 15
type PageParams = {
  id: string;
};

type SamplePageProps = {
  params: Promise<PageParams> | undefined;
};

// Minimal local type definition for casting - this should align with your actual session structure 
// from next-auth.d.ts and callbacks
interface ExpectedSessionShape {
  user?: {
    id?: string;
    name?: string; 
    email?: string; 
    role?: string;
  };
  expires?: string; // NextAuth sessions typically have an expires string
}

// Remove Prisma specific helper function
// async function getSampleData(sampleId: string) { ... }

// Reusable recursive date serializer (same as in subject page)
const serializeDates = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj; // Return non-objects as is
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }
  const newObj = { ...obj };
  for (const key in newObj) {
    if (newObj[key] instanceof Date) {
      newObj[key] = newObj[key].toISOString();
    } else if (typeof newObj[key] === 'object') {
        newObj[key] = serializeDates(newObj[key]); 
    }
  }
  return newObj;
};

export default async function SamplePage({ params }: SamplePageProps) {
  // --- Authentication & Authorization ---
  const session = await auth() as ExpectedSessionShape | null;
  
  console.log("[Sample Page] Raw session object from auth():", JSON.stringify(session, null, 2));

  let authorized = false;
  let reason = "Unknown";

  // Access role via session?.user?.role, which should now be type-safe with ExpectedSessionShape
  if (session && session.user && typeof session.user.role === 'string' && ALLOWED_ROLES.includes(session.user.role)) {
    authorized = true;
  } else {
    if (!session || !session.user) {
      reason = "No session or user object (checked after logging)";
    } else if (!session.user.role) {
      reason = "No role on session.user (checked after logging)";
    } else {
      reason = "Insufficient role (checked after logging)";
    }
  }

  if (!authorized) {
    console.warn(`[Sample Page] Unauthorized access attempt: ${reason}`);
    if (!session) redirect('/login'); // Redirect to login if no session at all
    notFound(); // For other auth issues (e.g. insufficient role), show notFound
  }

  if (!params) {
    throw new Error('Missing page parameters');
  }
  
  const parameters = await params;
  const sampleId = parameters.id;
  
  // Fetch data using Drizzle function
  const sampleData = await getSampleByIdWithResults(sampleId);
  
  if (!sampleData) {
    notFound(); 
  }

  // Serialize dates deeply
  const sampleForViewer = serializeDates(sampleData);

  // SampleViewer component will need updating separately 
  // to handle the new structure (nested results)

  return (
    <DashboardLayout>
      <div className="mb-4 flex justify-end">
        <Link href={`/data-entry/edit/${sampleId}`} passHref>
          <Button variant="outline">Edit Sample</Button>
        </Link>
      </div>
      {/* Pass the correctly typed/serialized data */} 
      <SampleViewer sample={sampleForViewer} /> 
    </DashboardLayout>
  );
} 
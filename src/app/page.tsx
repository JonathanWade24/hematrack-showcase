import { redirect } from 'next/navigation'
// import { getServerSession } from 'next-auth/next' // Old import
// import { getServerSession } from 'next-auth' // Named import was wrong
import getServerSession from 'next-auth' // Default import as suggested
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
// import { prisma } from '@/lib/prisma' // Remove Prisma import
import DashboardClient from '@/components/dashboard/DashboardClient'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Suspense } from 'react'
// import { Decimal } from '@prisma/client/runtime/library' // Remove Decimal import

// Import Drizzle functions and types
import { 
    getTotalSubjectCount, 
    getTotalSampleCount, 
    getAllSamplesWithStatusFields, 
    getRecentSamplesWithStatusFields, 
    SampleWithStatusFields, 
    formatDate // Import the helper function
} from '@/lib/db/queries';

// Force dynamic rendering to prevent stale cached data
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Home - SCD Dashboard',
  description: 'Sample overview and status dashboard for SCD research'
}

// --- Type Definitions ---
// Type for data fetched for the main status calculations
// Adapt to match SampleWithStatusFields structure + ensure all needed fields are present
type AllSampleData = SampleWithStatusFields & { // Extend the Drizzle type
  sample_id: string; // Ensure sample_id is present if needed by helpers
  subject_id: string;
  // Numeric fields are string | null
  rbc_advia?: string | null;
  hb_advia?: string | null;
  hct_advia?: string | null;
  mcv_advia?: string | null;
  mch_advia?: string | null;
  mchc_advia?: string | null;
  rdw_advia?: string | null;
  plt_advia?: string | null;
  wbc_advia?: string | null;
  concentration_1_dna?: string | null;
  cell_number_1_pbmc?: string | null;
  vol_plasma_1?: string | null;
  ei_min_lorrca?: string | null;
  ei_max_lorrca?: string | null;
  // QC fields remain string | null
  qc_pass_advia?: string | null;
  qc_pass_lorrca?: string | null;
  qc_pass_dna?: string | null;
};

// Type for data fetched for the recent samples list
// Adapt to match SampleWithStatusFields structure
type RecentSampleData = SampleWithStatusFields & { // Extend the Drizzle type
  sample_id: string;
  subject_id: string;
  date_of_collection?: Date | string | null; // Drizzle might return Date or string
  genotype?: string | null;
  // Numeric fields are string | null
  rbc_advia?: string | null;
  hb_advia?: string | null;
  hct_advia?: string | null;
  mcv_advia?: string | null;
  mch_advia?: string | null;
  mchc_advia?: string | null;
  rdw_advia?: string | null;
  plt_advia?: string | null;
  wbc_advia?: string | null;
  concentration_1_dna?: string | null;
  cell_number_1_pbmc?: string | null;
  vol_plasma_1?: string | null;
  ei_min_lorrca?: string | null;
  ei_max_lorrca?: string | null;
  // QC fields remain string | null
  qc_pass_advia?: string | null;
  qc_pass_lorrca?: string | null;
  qc_pass_dna?: string | null;
};

// Type for the formatted recent sample passed to the client
type FormattedRecentSample = {
    sample_id: string;
    subject_id: string;
    date_of_collection: string | null;
    genotype: string | null;
    processing_status: string; // Uses the calculated status string ('Complete', 'Partial', 'Pending')
    qc_status: 'Passed' | 'Failed' | 'Review';
};

// Type for the overall dashboard data passed to the client
interface DashboardData { 
  recentSamples: FormattedRecentSample[]; 
  totalSamples: number;
  totalSubjects: number;
  qcPassedSamples: number;
  fullyProcessedSamples: number;
  partiallyProcessedSamples: number;
  pendingSamples: number; // Represents 'Not Started' count
  subjectCounts: { complete: number; partial: number; pending: number };
}

// Placeholder data structure 
const PLACEHOLDER_DASHBOARD_DATA: DashboardData = {
  recentSamples: [],
  totalSamples: 0,
  totalSubjects: 0,
  qcPassedSamples: 0,
  fullyProcessedSamples: 0,
  partiallyProcessedSamples: 0,
  pendingSamples: 0,
  subjectCounts: { complete: 0, partial: 0, pending: 0 },
};
// --- End Type Definitions ---

// --- Status Calculation Configuration (Same as samples page) ---
const ASSAY_DEFINITIONS = {
  Advia: [
    'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia', 
    'mchc_advia', 'rdw_advia', 'plt_advia', 'wbc_advia'
  ],
  DNA: ['concentration_1_dna'],
  PBMC: ['cell_number_1_pbmc'],
  Plasma: ['vol_plasma_1'],
  Lorrca: ['ei_min_lorrca', 'ei_max_lorrca'],
};

const REQUIRED_ASSAYS_FOR_COMPLETION: (keyof typeof ASSAY_DEFINITIONS)[] = [
  'Advia', 'DNA', 'Lorrca' // Requires Advia, DNA, Lorrca
];
// --- End Configuration ---

// --- Helper Functions ---
// Helper function to check if a value is non-zero 
// Updated to handle strings from Drizzle numeric types
const isNonZero = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  // Remove Decimal check
  // if (typeof value === 'object' && value !== null && typeof value.isZero === 'function') { ... }
  if (typeof value === 'number') return value !== 0;
  // Add check for string: try parsing, handle NaN, check if non-zero
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && num !== 0;
  }
  // Default case for other types (booleans, objects not handled above)
  return false; 
};

// Refactored Status Calculation using Configuration (Same as samples page)
const calculateProcessingStatus = (sample: AllSampleData | RecentSampleData): string => {
  const assayCompletion: { [key in keyof typeof ASSAY_DEFINITIONS]?: boolean } = {};
  let anyAssayDone = false;

  for (const assayName in ASSAY_DEFINITIONS) {
    const fields = ASSAY_DEFINITIONS[assayName as keyof typeof ASSAY_DEFINITIONS];
    // @ts-ignore - Dynamically access fields
    const done = fields.some(field => isNonZero(sample[field]));
    assayCompletion[assayName as keyof typeof ASSAY_DEFINITIONS] = done;
    if (done) anyAssayDone = true;
  }

  if (!anyAssayDone) return 'Not Started';

  const requiredAssaysComplete = REQUIRED_ASSAYS_FOR_COMPLETION.every(
    assayName => assayCompletion[assayName]
  );

  if (requiredAssaysComplete) return 'Complete';
  
  const missingAssays = Object.entries(assayCompletion)
    .filter(([_, done]) => !done)
    .map(([name]) => name);
  const relevantMissing = missingAssays.filter(name => name in ASSAY_DEFINITIONS);

  return `Partial: Missing ${relevantMissing.join(', ')}`;
};

// QC Status Calculation (Same as samples page)
const getQCStatus = (sample: AllSampleData | RecentSampleData): 'Passed' | 'Failed' | 'Review' => {
   if (sample.qc_pass_advia === 'No' || sample.qc_pass_lorrca === 'No' || sample.qc_pass_dna === 'No') {
      return 'Failed'
    } else if (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review' || sample.qc_pass_dna === 'Review') {
      return 'Review'
    } else {
      return 'Passed'
    }
};
// --- End Helper Functions ---

export default async function Home() {
  // Check if user is authenticated using NextAuth v5
  const session = await getServerSession(authOptions)
  
  // Updated check for v5 session
  if (!session) {
    redirect('/login')
  }
  
  // Initialize data variables
  // Use SampleWithStatusFields for fetched data types
  let recentSamplesData: SampleWithStatusFields[] = []; 
  let allSamplesData: SampleWithStatusFields[] = []; 
  let totalSamplesCount = 0;
  let totalSubjectsCount = 0;
  let qcPassedSamples = 0;
  let fullyProcessedSamples = 0;
  let partiallyProcessedSamples = 0;
  let pendingSamples = 0;
  let subjectCounts: { complete: number; partial: number; pending: number } = { complete: 0, partial: 0, pending: 0 };

  try {
    // Fetch data using Drizzle functions
    console.log("[Dashboard] Fetching data using Drizzle...");

    // Fetch counts
    totalSubjectsCount = await getTotalSubjectCount();
    totalSamplesCount = await getTotalSampleCount();
    
    // Fetch sample data
    allSamplesData = await getAllSamplesWithStatusFields();
    recentSamplesData = await getRecentSamplesWithStatusFields(10); // Fetch 10 recent
    
    console.log(`[Dashboard] Fetched: ${totalSubjectsCount} subjects, ${totalSamplesCount} total samples, ${allSamplesData.length} samples for status calc, ${recentSamplesData.length} recent samples.`);

    // --- Recalculate Counts --- 
    fullyProcessedSamples = 0;
    partiallyProcessedSamples = 0; 
    pendingSamples = 0; 
    qcPassedSamples = 0;
    subjectCounts = { complete: 0, partial: 0, pending: 0 }; // Reset

    // This loop should work if SampleWithStatusFields provides all needed fields
    // and helpers handle the types correctly.
    allSamplesData.forEach((sample) => { 
        // Cast sample to the type expected by helpers if necessary,
        // but SampleWithStatusFields should align with AllSampleData now.
        const processingStatusString = calculateProcessingStatus(sample as AllSampleData);
        const qcStatus = getQCStatus(sample as AllSampleData);

        // Map detailed status to simple categories for counts
        if (processingStatusString === 'Complete') fullyProcessedSamples++;
        else if (processingStatusString === 'Not Started') pendingSamples++; 
        else partiallyProcessedSamples++; // Any non-Complete, non-Not Started is Partial for counts
        
        if (qcStatus === 'Passed') qcPassedSamples++;
    });
    
    // Calculate subject processing status - should work with allSamplesData
    const subjectProcessingMap = new Map<string, { complete: boolean; partial: boolean; notStarted: boolean }>();
    allSamplesData.forEach((sample) => { 
        const statusString = calculateProcessingStatus(sample as AllSampleData); 
        const subjectStatus = subjectProcessingMap.get(sample.subject_id) || { complete: false, partial: false, notStarted: true };
        
        if (statusString === 'Complete') {
          subjectStatus.complete = true;
          subjectStatus.notStarted = false;
        } else if (statusString.startsWith('Partial')) {
          subjectStatus.partial = true;
          subjectStatus.notStarted = false;
        } 
        
        subjectProcessingMap.set(sample.subject_id, subjectStatus);
    });
    
    // Corrected Subject Count Logic
    subjectProcessingMap.forEach(status => {
        if (status.complete) {
            subjectCounts.complete++;
        } else if (status.partial) {
            subjectCounts.partial++;
        } else { 
            subjectCounts.pending++;
        }
    });
    // --- End Recalculation --- 

    // Format recent samples for the client 
    const formattedRecentSamples: FormattedRecentSample[] = recentSamplesData.map((sample: SampleWithStatusFields) => {
        const detailedStatus = calculateProcessingStatus(sample as RecentSampleData); 
        let simpleStatus: 'Complete' | 'Partial' | 'Pending'; // Status for client overview
        
        if (detailedStatus === 'Complete') {
          simpleStatus = 'Complete';
        } else if (detailedStatus === 'Not Started') {
          simpleStatus = 'Pending';
        } else { // Any "Partial: Missing..." becomes "Partial"
          simpleStatus = 'Partial';
        }

        // Use the imported formatDate helper
        const collectionDateStr = formatDate(sample.date_of_collection); 

        return {
            sample_id: sample.sample_id,
            subject_id: sample.subject_id,
            date_of_collection: collectionDateStr, 
            genotype: sample.genotype ?? 'N/A',
            processing_status: simpleStatus, 
            qc_status: getQCStatus(sample as RecentSampleData),
        };
    });

    // Prepare final data object for the client component
    const initialDataForClient: DashboardData = { // Explicitly type this
      recentSamples: formattedRecentSamples, 
      qcPassedSamples: qcPassedSamples,
      fullyProcessedSamples: fullyProcessedSamples,
      partiallyProcessedSamples: partiallyProcessedSamples, 
      pendingSamples: pendingSamples, 
      totalSamples: totalSamplesCount, 
      totalSubjects: totalSubjectsCount, // Add missing property
      subjectCounts: subjectCounts, 
    };

    return (
      <DashboardLayout>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard Overview</h1>
        <Suspense fallback={<p>Loading dashboard client...</p>}> 
          <DashboardClient 
            initialData={initialDataForClient} // Pass the structured data
            totalSamples={totalSamplesCount}    // Pass directly as well
            totalSubjects={totalSubjectsCount}
          />
        </Suspense>
      </DashboardLayout>
    );

  } catch (error) {
    console.error('Error fetching dashboard data with Drizzle:', error); // Update log message
    // Render with placeholder data or an error message
    return (
      <DashboardLayout>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard Overview</h1>
        <p className="text-red-600 mb-4">Error loading dashboard data. Displaying placeholder information.</p>
        <Suspense fallback={<p>Loading dashboard client...</p>}> 
           <DashboardClient 
            initialData={PLACEHOLDER_DASHBOARD_DATA}
            totalSamples={PLACEHOLDER_DASHBOARD_DATA.totalSamples}
            totalSubjects={PLACEHOLDER_DASHBOARD_DATA.totalSubjects}
          />
        </Suspense>
      </DashboardLayout>
    );
  }
}

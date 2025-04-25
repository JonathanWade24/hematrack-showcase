import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Suspense } from 'react'
import { Decimal } from '@prisma/client/runtime/library'

export const metadata = {
  title: 'Home - SCD Dashboard',
  description: 'Sample overview and status dashboard for SCD research'
}

// --- Type Definitions ---
// Type for data fetched for the main status calculations
type AllSampleData = {
  subject_id: string;
  // Include all fields from ASSAY_DEFINITIONS
  rbc_advia: Decimal | null;
  hb_advia: Decimal | null;
  hct_advia: Decimal | null;
  mcv_advia: Decimal | null;
  mch_advia: Decimal | null;
  mchc_advia: Decimal | null;
  rdw_advia: Decimal | null;
  plt_advia: Decimal | null;
  wbc_advia: Decimal | null;
  concentration_1_dna: Decimal | null;
  cell_number_1_pbmc: Decimal | null;
  vol_plasma_1: Decimal | null;
  ei_min_lorrca: Decimal | null;
  ei_max_lorrca: Decimal | null;
  // Fields for QC status
  qc_pass_advia: string | null;
  qc_pass_lorrca: string | null;
  qc_pass_dna: string | null;
};

// Type for data fetched for the recent samples list
type RecentSampleData = {
  sample_id: string;
  subject_id: string;
  date_of_collection: Date | null;
  genotype: string | null;
  // Include all fields from ASSAY_DEFINITIONS
  rbc_advia: Decimal | null;
  hb_advia: Decimal | null;
  hct_advia: Decimal | null;
  mcv_advia: Decimal | null;
  mch_advia: Decimal | null;
  mchc_advia: Decimal | null;
  rdw_advia: Decimal | null;
  plt_advia: Decimal | null;
  wbc_advia: Decimal | null;
  concentration_1_dna: Decimal | null;
  cell_number_1_pbmc: Decimal | null;
  vol_plasma_1: Decimal | null;
  ei_min_lorrca: Decimal | null;
  ei_max_lorrca: Decimal | null;
  // Fields for QC status
  qc_pass_advia: string | null;
  qc_pass_lorrca: string | null;
  qc_pass_dna: string | null;
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
// Helper function to check if a value is non-zero (Same as samples page)
const isNonZero = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object' && value !== null && typeof value.isZero === 'function') {
    try { return !value.isZero(); } catch (e) { return false; }
  }
  if (typeof value === 'number') return value !== 0;
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
  // Check if user is authenticated using NextAuth
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    redirect('/login')
  }
  
  // Initialize data variables with defaults or placeholders
  let recentSamplesData: RecentSampleData[] = [];
  let allSamplesData: AllSampleData[] = [];
  let totalSamplesCount = 0;
  let totalSubjectsCount = 0;
  let qcPassedSamples = 0;
  let fullyProcessedSamples = 0;
  let partiallyProcessedSamples = 0;
  let pendingSamples = 0;
  let subjectCounts: { complete: number; partial: number; pending: number } = { complete: 0, partial: 0, pending: 0 };

  try {
    // Define fields needed based on config
    const requiredFields = Object.values(ASSAY_DEFINITIONS).flat();
    
    // Base fields needed for QC status and subject identification
    const baseSelectFields = {
        subject_id: true,
        qc_pass_advia: true, 
        qc_pass_lorrca: true,
        qc_pass_dna: true,
    };

    // Combine base fields with dynamically added assay fields
    const selectFieldsForAllSamples = {
        ...baseSelectFields,
        ...(requiredFields.reduce((acc, field) => {
            // Only add if not already in base fields (like subject_id)
            if (!(field in baseSelectFields)) { 
              acc[field] = true; 
            }
            return acc; 
        }, {} as { [key: string]: boolean }))
    };
    
    // Select for recent samples includes display fields + all calc fields
    const selectFieldsForRecentSamples = {
        sample_id: true,
        // subject_id: true, // Already included via spread
        date_of_collection: true,
        genotype: true,
        ...selectFieldsForAllSamples 
    };

    // Fetch recent samples using Prisma 
    const recentSamplesData: RecentSampleData[] = await prisma.omics_results.findMany({
      orderBy: { date_of_collection: 'desc' },
      take: 10,
      select: selectFieldsForRecentSamples as any 
    });

    // Fetch all samples for status calculation
    const allSamplesData: AllSampleData[] = await prisma.omics_results.findMany({
      select: selectFieldsForAllSamples as any 
    });

    // Get total counts
    totalSamplesCount = await prisma.omics_results.count();
    totalSubjectsCount = await prisma.omics_subjects.count();

    // --- Recalculate Counts using NEW status logic --- 
    fullyProcessedSamples = 0;
    partiallyProcessedSamples = 0; // Represents any partial state
    pendingSamples = 0; // Represents 'Not Started' count
    qcPassedSamples = 0;
    subjectCounts = { complete: 0, partial: 0, pending: 0 }; // Reset

    allSamplesData.forEach((sample: AllSampleData) => { 
        const processingStatusString = calculateProcessingStatus(sample); // Get detailed status
        const qcStatus = getQCStatus(sample);

        // Map detailed status to simple categories for counts
        if (processingStatusString === 'Complete') fullyProcessedSamples++;
        else if (processingStatusString === 'Not Started') pendingSamples++; 
        else partiallyProcessedSamples++; // Any non-Complete, non-Not Started is Partial for counts
        
        if (qcStatus === 'Passed') qcPassedSamples++;
    });
    
    // Calculate subject processing status based on NEW logic
    const subjectProcessingMap = new Map<string, { complete: boolean; partial: boolean; notStarted: boolean }>();
    allSamplesData.forEach((sample: AllSampleData) => { 
        const statusString = calculateProcessingStatus(sample); 
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

    // Format recent samples for the client - Map status back to simple union type for Client
    const formattedRecentSamples: FormattedRecentSample[] = recentSamplesData.map((sample: RecentSampleData) => {
        const detailedStatus = calculateProcessingStatus(sample); // Get detailed status string
        let simpleStatus: 'Complete' | 'Partial' | 'Pending'; // Status for client overview
        
        if (detailedStatus === 'Complete') {
          simpleStatus = 'Complete';
        } else if (detailedStatus === 'Not Started') {
          simpleStatus = 'Pending';
        } else { // Any "Partial: Missing..." becomes "Partial"
          simpleStatus = 'Partial';
        }

        return {
            sample_id: sample.sample_id,
            subject_id: sample.subject_id,
            date_of_collection: sample.date_of_collection ? sample.date_of_collection.toISOString().split('T')[0] : null,
            genotype: sample.genotype ?? 'N/A',
            processing_status: simpleStatus, // Use the simple status for the client table
            qc_status: getQCStatus(sample),
        };
    });

    // Prepare final data object for the client component
    const initialDataForClient = {
      recentSamples: formattedRecentSamples, 
      qcPassedSamples: qcPassedSamples,
      fullyProcessedSamples: fullyProcessedSamples,
      partiallyProcessedSamples: partiallyProcessedSamples, 
      pendingSamples: pendingSamples, 
      totalSamples: totalSamplesCount, 
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
    console.error('Error fetching dashboard data:', error);
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

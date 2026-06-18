import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SampleSearch } from '@/components/data-entry/SampleSearch'
import { getRecentSamplesWithStatusFields, type SampleWithStatusFields } from '@/lib/db/queries' 

// --- Status Calculation Configuration (copied from src/app/samples/page.tsx for now) ---
const ASSAY_DEFINITIONS = {
  Advia: [
    'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia', 
    'mchc_advia', 'rdw_advia', 'plt_advia', 'wbc_advia'
  ],
  DNA: ['concentration_1_dna'],
  PBMC: ['cell_number_1_pbmc'],
  Plasma: ['vol_plasma_1'],
  Lorrca: ['ei_min_lorrca', 'ei_max_lorrca'],
  // Add other assays if they contribute to "Recent Samples" status or are needed by SampleSearch
};

const REQUIRED_ASSAYS_FOR_COMPLETION: (keyof typeof ASSAY_DEFINITIONS)[] = [
  'Advia', 'DNA', 'Lorrca' // Example, adjust as needed for this page's context
];

const isNonZero = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && num !== 0;
  }
  if (typeof value === 'number') return value !== 0;
  return false;
};

const calculateProcessingStatus = (sample: SampleWithStatusFields): string => {
  const assayCompletion: { [key in keyof typeof ASSAY_DEFINITIONS]?: boolean } = {};
  let anyAssayDone = false;

  for (const assayName in ASSAY_DEFINITIONS) {
    const fields = ASSAY_DEFINITIONS[assayName as keyof typeof ASSAY_DEFINITIONS];
    // @ts-ignore - Dynamically access fields, ensure sample has them
    const done = fields.some(field => isNonZero(sample[field as keyof SampleWithStatusFields]));
    assayCompletion[assayName as keyof typeof ASSAY_DEFINITIONS] = done;
    if (done) {
      anyAssayDone = true;
    }
  }

  if (!anyAssayDone) {
    return 'Not Started'; // Or 'Pending' as per original logic
  }

  const requiredAssaysComplete = REQUIRED_ASSAYS_FOR_COMPLETION.every(
    assayName => assayCompletion[assayName]
  );

  if (requiredAssaysComplete) {
    return 'Complete';
  }
  
  const missingAssays = Object.entries(assayCompletion)
    .filter(([_, done]) => !done)
    .map(([name]) => name);
    
  const relevantMissing = missingAssays.filter(name => name in ASSAY_DEFINITIONS);

  if (relevantMissing.length === 0 && anyAssayDone) { // All defined assays are done, but not enough for 'Complete'
    return 'Partial'; // Generic partial if no specific missing ones based on a limited ASSAY_DEFINITION here
  }
  return `Partial: Missing ${relevantMissing.join(', ')}`;
};

// Simplified QC Status for this page - adjust as needed
const getSimpleQCStatus = (sample: SampleWithStatusFields): 'Passed' | 'Failed' | 'Review' => {
  if (sample.qc_pass_advia === 'No' || sample.qc_pass_lorrca === 'No' || sample.qc_pass_dna === 'No') {
    return 'Failed';
  } else if (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review' || sample.qc_pass_dna === 'Review') {
    return 'Review';
  } else if (isNonZero(sample.rbc_advia) || isNonZero(sample.concentration_1_dna) || isNonZero(sample.ei_min_lorrca)) { // Only if some data exists
    return 'Passed'; // Default to passed if some data exists and no fails/reviews
  }
  return 'Review'; // Default if no data or indeterminate
};

// This is the type SampleSearch component expects
interface SampleForContinuePage {
  sample_id: string;
  subject_id: string;
  date_of_collection: string | null;
  genotype: string | null;
  processing_status: 'Complete' | 'Partial' | 'Pending'; // Adjusted to match SampleSearch
  qc_status: 'Passed' | 'Failed' | 'Review';
}

export default async function UpdateSamplePage() {
  const rawRecentSamples = await getRecentSamplesWithStatusFields(10); // Fetch 10 recent samples

  const processedRecentSamples: SampleForContinuePage[] = rawRecentSamples.map(sample => {
    const detailedProcessingStatus = calculateProcessingStatus(sample);
    let simpleProcessingStatus: 'Complete' | 'Partial' | 'Pending';
    if (detailedProcessingStatus === 'Complete') {
      simpleProcessingStatus = 'Complete';
    } else if (detailedProcessingStatus === 'Not Started') {
      simpleProcessingStatus = 'Pending'; 
    } else { 
      simpleProcessingStatus = 'Partial';
    }

    const qcStatus = getSimpleQCStatus(sample);
    
    let collectionDateStr: string | null = null;
    const collDate = sample.date_of_collection;
    // Option 1: Assume string or null from Drizzle query result
    if (typeof collDate === 'string') {
        collectionDateStr = collDate; 
    }
    // If collDate is null or a Date object (which we are ignoring for now),
    // collectionDateStr remains null.

    return {
      sample_id: sample.sample_id,
      subject_id: sample.subject_id,
      date_of_collection: collectionDateStr,
      genotype: sample.genotype || 'N/A',
      processing_status: simpleProcessingStatus, // Use the simplified status
      qc_status: qcStatus,
    };
  });

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Continue Sample Entry</h1>
          <p className="mt-2 text-sm text-gray-700">
            Select a recently entered sample to continue data entry, or search for a specific sample.
          </p>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <SampleSearch recentSamples={processedRecentSamples} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
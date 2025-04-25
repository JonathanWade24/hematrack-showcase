import { DashboardLayout } from '@/components/layout/DashboardLayout'
import SamplesTable from '@/components/samples/SamplesTable'
import Link from 'next/link'
import PageSizeSelector from '@/components/samples/PageSizeSelector'
import { SamplesSearchBar } from '@/components/samples/SamplesSearchBar'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import Pagination from '@/components/samples/Pagination'
import { ProcessedSample } from '@/types/samples'
import { omics_results } from '@prisma/client'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

// --- Status Calculation Configuration ---
const ASSAY_DEFINITIONS = {
  Advia: [
    'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia', 
    'mchc_advia', 'rdw_advia', 'plt_advia', 'wbc_advia'
  ],
  DNA: ['concentration_1_dna'],
  PBMC: ['cell_number_1_pbmc'],
  Plasma: ['vol_plasma_1'],
  Lorrca: ['ei_min_lorrca', 'ei_max_lorrca'],
  // Add other assays here, e.g.:
  // HPLC: ['hbf_percent_grady_hplc', 'hba_percent_grady_hplc', ...]
};

// Define which assays are REQUIRED for the sample to be marked 'Complete'
const REQUIRED_ASSAYS_FOR_COMPLETION: (keyof typeof ASSAY_DEFINITIONS)[] = [
  'Advia', 'DNA', 'Lorrca' // Currently requires Advia, DNA, Lorrca
  // To require PBMC and Plasma as well, add them: 'Advia', 'DNA', 'PBMC', 'Plasma', 'Lorrca'
];
// --- End Configuration ---

// Helper function to check if a value is non-zero (handles Decimal)
const isNonZero = (value: Decimal | number | null | undefined): boolean => {
  if (value === null || value === undefined) return false;
  if (value instanceof Decimal) return !value.isZero();
  if (typeof value === 'number') return value !== 0;
  return false;
};

// Type for the structure returned by the Prisma select
type SampleFromDb = {
  sample_id: string;
  subject_id: string;
  date_of_collection: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  // Include all fields mentioned in ASSAY_DEFINITIONS
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
};

// Refactored Status Calculation using Configuration
const calculateProcessingStatus = (sample: SampleFromDb): string => {
  const assayCompletion: { [key in keyof typeof ASSAY_DEFINITIONS]?: boolean } = {};
  let anyAssayDone = false;

  // Determine completion status for each defined assay
  for (const assayName in ASSAY_DEFINITIONS) {
    const fields = ASSAY_DEFINITIONS[assayName as keyof typeof ASSAY_DEFINITIONS];
    // @ts-ignore - Dynamically access fields based on config
    const done = fields.some(field => isNonZero(sample[field]));
    assayCompletion[assayName as keyof typeof ASSAY_DEFINITIONS] = done;
    if (done) {
      anyAssayDone = true;
    }
  }

  // Determine overall status based on configuration
  if (!anyAssayDone) {
    return 'Not Started';
  }

  const requiredAssaysComplete = REQUIRED_ASSAYS_FOR_COMPLETION.every(
    assayName => assayCompletion[assayName]
  );

  if (requiredAssaysComplete) {
    return 'Complete'; // Only if all REQUIRED assays are done
  }
  
  // If not Not Started and not Complete, it's Partial
  const missingAssays = Object.entries(assayCompletion)
    .filter(([_, done]) => !done)
    .map(([name]) => name);
    
  // Optional: Only list missing assays that are part of the definition
  const relevantMissing = missingAssays.filter(name => name in ASSAY_DEFINITIONS);

  return `Partial: Missing ${relevantMissing.join(', ')}`;
};

async function getSamplesData(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search?: string,
  sort = 'dateOfCollection',
  order: 'asc' | 'desc' = 'desc'
): Promise<{ samples: ProcessedSample[], totalCount: number, totalPages: number }> {
  const skip = (page - 1) * pageSize;
  const defaultReturn = { samples: [], totalCount: 0, totalPages: 0 };

  try {
    const sortFieldMapping: Record<string, string> = {
      id: 'sample_id',
      patientId: 'subject_id',
      dateOfCollection: 'date_of_collection',
      status: 'sample_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
    const dbSortField = sortFieldMapping[sort] || 'date_of_collection';

    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { sample_id: { contains: search, mode: 'insensitive' } },
          { subject_id: { contains: search, mode: 'insensitive' } },
        ]
      };
    }

    const totalCount = await prisma.omics_results.count({ where: whereClause });

    const orderByClause = { [dbSortField]: order };

    // Fetch fields needed for ProcessedSample + all fields in ASSAY_DEFINITIONS
    const fieldsToSelect = {
        // Fields needed for ProcessedSample type
        sample_id: true,
        subject_id: true,
        date_of_collection: true,
        created_at: true,
        updated_at: true,
        // Dynamically add all fields from ASSAY_DEFINITIONS
        ...(Object.values(ASSAY_DEFINITIONS).flat().reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {} as { [key: string]: boolean }))
    };

    const samplesFromDb = await prisma.omics_results.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip,
      take: pageSize,
      select: fieldsToSelect as any // Use the dynamically generated select object
    });

    // Map and Serialize the data
    const processedSamples: ProcessedSample[] = samplesFromDb.map((sample: SampleFromDb) => { 
      const calculated_status = calculateProcessingStatus(sample); // Use refactored function

      // Construct the final object 
      const serializedSample: ProcessedSample = {
        id: sample.sample_id,
        patientId: sample.subject_id,
        dateOfCollection: sample.date_of_collection?.toISOString() ?? '', 
        status: calculated_status, 
        createdAt: sample.created_at?.toISOString() ?? '',
        updatedAt: sample.updated_at?.toISOString() ?? '',
      };
      return serializedSample;
    });

    return {
      samples: processedSamples,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  } catch (error) {
    console.error('Error in getSamplesData:', error);
    return defaultReturn;
  }
}

// Update the interface
type SearchParamsType = {
  page?: string
  pageSize?: string
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
};

// Correct PageProps type to expect resolved SearchParamsType
type PageProps = {
  searchParams: SearchParamsType; // Expect resolved params, not Promise
};


// The page component itself is async (Server Component)
export default async function SamplesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // Parse search params with proper type safety
  const page = Number(searchParams?.page) || 1
  const pageSize = Number(searchParams?.pageSize) || 10
  const sort = (searchParams?.sort as string) || 'date_of_collection'
  const order = (searchParams?.order as 'asc' | 'desc') || 'desc'
  const search = searchParams?.search as string | undefined

  // Fetch the data
  const { samples, totalCount, totalPages } = await getSamplesData(
    page,
    pageSize,
    search,
    sort,
    order
  )

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Samples</h1>
        
        <SamplesTable
          samples={samples}
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          sort={sort}
          order={order}
          search={search}
        />

        <div className="mt-4 flex justify-between items-center">
          <PageSizeSelector currentSize={pageSize} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
          />
        </div>
      </div>
    </DashboardLayout>
  )
} 
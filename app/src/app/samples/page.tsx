import { DashboardLayout } from '@/components/layout/DashboardLayout'
import SamplesTable from '@/components/samples/SamplesTable'
import Link from 'next/link'
import PageSizeSelector from '@/components/samples/PageSizeSelector'
import { SamplesSearchBar } from '@/components/samples/SamplesSearchBar'
import Pagination from '@/components/samples/Pagination'
import { ProcessedSample } from '@/types/samples'
import { db } from '@/lib/db'
// Import the main samples table and all relevant results tables from the schema
import { 
  samplesInLaboratory,
  results_adviaInLaboratory,
  results_dnaInLaboratory,
  results_pbmcInLaboratory,
  results_plasmaInLaboratory,
  results_lorrcaInLaboratory 
} from '@/lib/db/schema'
import { sql, eq, count, or, and, like, asc, desc, SQL } from 'drizzle-orm'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

// --- Status Calculation Configuration ---
// These field names must match the selected column names from the Drizzle query
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
  'Advia', 'DNA', 'Lorrca'
];
// --- End Configuration ---

const isNonZero = (value: string | number | null | undefined): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && num !== 0;
  }
  if (typeof value === 'number') return value !== 0;
  return false;
};

// Type for the structure returned by Drizzle query after joins
// It includes fields from samplesInLaboratory and all joined results tables
type SampleFromDb = {
  // Fields from samplesInLaboratory
  sample_id: string;
  subject_id: string;
  date_of_collection: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  // Fields from results_adviaInLaboratory (example)
  rbc_advia: string | null;
  hb_advia: string | null;
  hct_advia: string | null;
  mcv_advia: string | null;
  mch_advia: string | null;
  mchc_advia: string | null;
  rdw_advia: string | null;
  plt_advia: string | null;
  wbc_advia: string | null;
  // Fields from results_dnaInLaboratory
  concentration_1_dna: string | null;
  // Fields from results_pbmcInLaboratory
  cell_number_1_pbmc: string | null;
  // Fields from results_plasmaInLaboratory
  vol_plasma_1: string | null;
  // Fields from results_lorrcaInLaboratory
  ei_min_lorrca: string | null;
  ei_max_lorrca: string | null;
  // Allow dynamic access for other fields potentially selected or for flexibility
  [key: string]: any; 
};

const calculateProcessingStatus = (sample: SampleFromDb): string => {
  const assayCompletion: { [key in keyof typeof ASSAY_DEFINITIONS]?: boolean } = {};
  let anyAssayDone = false;

  for (const assayName in ASSAY_DEFINITIONS) {
    const fields = ASSAY_DEFINITIONS[assayName as keyof typeof ASSAY_DEFINITIONS];
    const done = fields.some(field => isNonZero(sample[field]));
    assayCompletion[assayName as keyof typeof ASSAY_DEFINITIONS] = done;
    if (done) {
      anyAssayDone = true;
    }
  }

  if (!anyAssayDone) {
    return 'Not Started';
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

  return `Partial: Missing ${relevantMissing.join(', ')}`;
};

async function getSamplesData(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  search?: string,
  sort = 'date_of_collection', 
  order: 'asc' | 'desc' = 'desc'
): Promise<{ samples: ProcessedSample[], totalCount: number, totalPages: number }> {
  const skip = (page - 1) * pageSize;
  const defaultReturn = { samples: [], totalCount: 0, totalPages: 0 };

  try {
    // Sort field mapping now refers to columns in samplesInLaboratory
    const sortFieldMapping: Record<string, any> = {
      id: samplesInLaboratory.sample_id,
      patientId: samplesInLaboratory.subject_id,
      dateOfCollection: samplesInLaboratory.date_of_collection,
      // Status is calculated, default sort to date_of_collection
      status: samplesInLaboratory.date_of_collection, 
      createdAt: samplesInLaboratory.created_at,
      updatedAt: samplesInLaboratory.updated_at
    };
    const dbSortField = sortFieldMapping[sort] || samplesInLaboratory.date_of_collection;

    // Build WHERE conditions for search (on samplesInLaboratory)
    let whereConditionsArray: SQL[] = [];
    if (search) {
      const searchLower = search.toLowerCase();
      whereConditionsArray.push(
        or(
          sql`lower(${samplesInLaboratory.sample_id}) like ${'%' + searchLower + '%'}`,
          sql`lower(${samplesInLaboratory.subject_id}) like ${'%' + searchLower + '%'} `
        )! // Add non-null assertion if or can return undefined
      );
    }
    const finalWhereCondition = whereConditionsArray.length > 0 ? and(...whereConditionsArray) : undefined;

    // Get total count
    const totalCountQuery = db
      .select({ value: count() })
      .from(samplesInLaboratory)
      .where(finalWhereCondition);
    
    const totalCountResult = await totalCountQuery;
    const totalCount = totalCountResult[0]?.value || 0;

    if (totalCount === 0) {
        return defaultReturn;
    }
    
    // Fetch paginated data with joins
    const query = db
      .select({
        // Select fields from samplesInLaboratory
        sample_id: samplesInLaboratory.sample_id,
        subject_id: samplesInLaboratory.subject_id,
        date_of_collection: samplesInLaboratory.date_of_collection,
        created_at: samplesInLaboratory.created_at,
        updated_at: samplesInLaboratory.updated_at,
        // Select fields from results_adviaInLaboratory
        rbc_advia: results_adviaInLaboratory.rbc_advia,
        hb_advia: results_adviaInLaboratory.hb_advia,
        hct_advia: results_adviaInLaboratory.hct_advia,
        mcv_advia: results_adviaInLaboratory.mcv_advia,
        mch_advia: results_adviaInLaboratory.mch_advia,
        mchc_advia: results_adviaInLaboratory.mchc_advia,
        rdw_advia: results_adviaInLaboratory.rdw_advia,
        plt_advia: results_adviaInLaboratory.plt_advia,
        wbc_advia: results_adviaInLaboratory.wbc_advia,
        // Select fields from results_dnaInLaboratory
        concentration_1_dna: results_dnaInLaboratory.concentration_1_dna,
        // Select fields from results_pbmcInLaboratory
        cell_number_1_pbmc: results_pbmcInLaboratory.cell_number_1_pbmc,
        // Select fields from results_plasmaInLaboratory
        vol_plasma_1: results_plasmaInLaboratory.vol_plasma_1,
        // Select fields from results_lorrcaInLaboratory
        ei_min_lorrca: results_lorrcaInLaboratory.ei_min_lorrca,
        ei_max_lorrca: results_lorrcaInLaboratory.ei_max_lorrca,
      })
      .from(samplesInLaboratory)
      .leftJoin(results_adviaInLaboratory, eq(samplesInLaboratory.sample_id, results_adviaInLaboratory.sample_id))
      .leftJoin(results_dnaInLaboratory, eq(samplesInLaboratory.sample_id, results_dnaInLaboratory.sample_id))
      .leftJoin(results_pbmcInLaboratory, eq(samplesInLaboratory.sample_id, results_pbmcInLaboratory.sample_id))
      .leftJoin(results_plasmaInLaboratory, eq(samplesInLaboratory.sample_id, results_plasmaInLaboratory.sample_id))
      .leftJoin(results_lorrcaInLaboratory, eq(samplesInLaboratory.sample_id, results_lorrcaInLaboratory.sample_id))
      .where(finalWhereCondition)
      .orderBy(order === 'asc' ? asc(dbSortField) : desc(dbSortField))
      .limit(pageSize)
      .offset(skip);

    const samplesFromDb = await query;

    // Map and Serialize the data
    const processedSamples: ProcessedSample[] = samplesFromDb.map((sample) => { 
      // sample is now SampleFromDb due to explicit select and joins
      const calculated_status = calculateProcessingStatus(sample as SampleFromDb);

      const toISOStringOrEmpty = (dateValue: Date | string | null | undefined): string => {
        if (!dateValue) return '';
        if (dateValue instanceof Date) return dateValue.toISOString();
        return String(dateValue); 
      };
      
      const serializedSample: ProcessedSample = {
        id: sample.sample_id,
        patientId: sample.subject_id,
        dateOfCollection: toISOStringOrEmpty(sample.date_of_collection), 
        status: calculated_status, 
        createdAt: toISOStringOrEmpty(sample.created_at),
        updatedAt: toISOStringOrEmpty(sample.updated_at),
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
    if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    } else {
        console.error('Unknown error:', error);
    }
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

type PageProps = {
  searchParams: SearchParamsType;
};

export default async function SamplesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const page = Number(searchParams?.page) || 1
  const pageSize = Number(searchParams?.pageSize) || DEFAULT_PAGE_SIZE
  const sort = (searchParams?.sort as string) || 'dateOfCollection' // Default sort field
  const order = (searchParams?.order as 'asc' | 'desc') || 'desc'
  const search = searchParams?.search as string | undefined

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
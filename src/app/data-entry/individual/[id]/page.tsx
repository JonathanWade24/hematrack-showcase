import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { SampleEntryForm } from '@/components/data-entry/SampleEntryForm'
import { getOmicsResultBySampleId } from '@/lib/prisma/operations'
import { SampleData } from '@/components/data-entry/form-sections/types'
import { omics_results, omics_subjects } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// Helper to format Date or null to 'YYYY-MM-DD' or empty string
const formatDateForInput = (date: Date | null | undefined): string => {
  if (!date) return '';
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Updated PageProps to match Next.js 15 expectations exactly
type PageParams = {
  id: string;
};

type PageProps = {
  params: Promise<PageParams> | undefined;
};

// Combine Prisma types for the data structure returned by the updated function
type FetchedSampleData = (omics_results & { omics_subjects: omics_subjects | null });

// Function to transform raw database data (from Prisma) to match the expected SampleData type
function transformToSampleData(raw: FetchedSampleData): SampleData {
  // Helper to convert Decimal to number or null
  const toNumber = (val: Decimal | number | null | undefined): number | null => {
    if (val instanceof Decimal) return val.toNumber();
    return val ?? null;
  };
  
  // Default values (ensure sample_number has a fallback)
  const defaults = {
    sample_number: raw.sample_number ?? 1,
    date_of_collection: formatDateForInput(raw.date_of_collection) // Format date (now returns '')
  }
  
  // Handle QC fields validation (remains the same)
  const validateQcStatus = (status: string | null | undefined): 'Yes' | 'No' | 'Review' | null => {
    const validStatus = status?.trim();
    if (validStatus === 'Yes' || validStatus === 'No' || validStatus === 'Review') {
      return validStatus;
    }
    return null;
  };
  
  // Transform using data from the Prisma result
  const transformed: SampleData = {
    subject_id: raw.subject_id,
    sample_number: defaults.sample_number,
    date_of_collection: defaults.date_of_collection,
    
    age_at_collection: toNumber(raw.age_at_collection),
    sex: raw.sex ?? null,
    genotype: raw.genotype ?? null,
    
    // ADVIA Data (convert Decimals using toNumber)
    rbc_advia: toNumber(raw.rbc_advia),
    hb_advia: toNumber(raw.hb_advia),
    hct_advia: toNumber(raw.hct_advia),
    mcv_advia: toNumber(raw.mcv_advia),
    mch_advia: toNumber(raw.mch_advia),
    mchc_advia: toNumber(raw.mchc_advia),
    rdw_advia: toNumber(raw.rdw_advia),
    hdw_advia: toNumber(raw.hdw_advia),
    plt_advia: toNumber(raw.plt_advia),
    mpv_advia: toNumber(raw.mpv_advia),
    wbc_advia: toNumber(raw.wbc_advia),
    neut_advia: toNumber(raw.neut_advia),
    retic_advia: toNumber(raw.retic_advia),
    chr_advia: toNumber(raw.chr_advia),
    // These might not exist in schema? Handle potential undefined
    hc41_v120_advia: toNumber(raw.hc41_v120_advia),
    hc41_v60_120_advia: toNumber(raw.hc41_v60_120_advia),
    hc41_v60_advia: toNumber(raw.hc41_v60_advia),
    drbc_advia: toNumber(raw.drbc_advia),
    hyper_advia: toNumber(raw.hyper_advia),
    nrbc_advia: toNumber(raw.nrbc_advia),
    qc_pass_advia: validateQcStatus(raw.qc_pass_advia),
    qc_notes_advia: raw.qc_notes_advia ?? null,
    date_advia: formatDateForInput(raw.date_advia),
    
    // DNA Data
    date_dna: formatDateForInput(raw.date_dna),
    concentration_1_dna: toNumber(raw.concentration_1_dna),
    purity_1_dna: toNumber(raw.purity_1_dna),
    concentration_2_dna: toNumber(raw.concentration_2_dna),
    purity_2_dna: toNumber(raw.purity_2_dna),
    qc_pass_dna: validateQcStatus(raw.qc_pass_dna),
    qc_notes_dna: raw.qc_notes_dna ?? null,
    
    // PBMC Data
    date_pmbc: formatDateForInput(raw.date_pmbc),
    cell_number_1_pbmc: toNumber(raw.cell_number_1_pbmc),
    cell_number_2_pbmc: toNumber(raw.cell_number_2_pbmc),
    sent_to_gt_pbmc: ((status) => status === 'Review' ? null : status)(validateQcStatus(raw.sent_to_gt_pbmc)),
    qc_notes_pbmc: raw.qc_notes_pbmc ?? null,
    
    // Plasma Data
    date_plasma: formatDateForInput(raw.date_plasma),
    vol_plasma_1: toNumber(raw.vol_plasma_1),
    vol_plasma_2: toNumber(raw.vol_plasma_2),
    vol_plasma_3: toNumber(raw.vol_plasma_3),
    qc_notes_plasma: raw.qc_notes_plasma ?? null,
    
    // Lorrca Data
    date_lorrca: formatDateForInput(raw.date_lorrca),
    ei_min_lorrca: toNumber(raw.ei_min_lorrca),
    ei_max_lorrca: toNumber(raw.ei_max_lorrca),
    ei_delta_lorrca: toNumber(raw.ei_delta_lorrca),
    pos_lorrca: toNumber(raw.pos_lorrca),
    instrument_lorrca: raw.instrument_lorrca ?? null,
    qc_pass_lorrca: validateQcStatus(raw.qc_pass_lorrca),
    qc_notes_lorrca: raw.qc_notes_lorrca ?? null,
    
    // Viscosity Data
    date_visc: formatDateForInput(raw.date_visc),
    visc_45: toNumber(raw.visc_45),
    visc_225: toNumber(raw.visc_225),
    qc_pass_viscosity: validateQcStatus(raw.qc_pass_viscosity),
    qc_notes_viscosity: raw.qc_notes_viscosity ?? null,
    
    // HVR Data
    date_hvr: formatDateForInput(raw.date_hvr),
    hvr_45: toNumber(raw.hvr_45),
    hvr_225: toNumber(raw.hvr_225),
    qc_pass_hvr: validateQcStatus(raw.qc_pass_hvr),
    qc_notes_hvr: raw.qc_notes_hvr ?? null,
    
    // F-Cells Data
    date_f_cells: formatDateForInput(raw.date_f_cells),
    percent_f_cells: toNumber(raw.percent_f_cells),
    stain_f_cells: raw.stain_f_cells ?? null,
    cytometer_f_cells: raw.cytometer_f_cells ?? null,
    qc_pass_f_cells: validateQcStatus(raw.qc_pass_f_cells),
    qc_notes_f_cells: raw.qc_notes_f_cells ?? null,
    
    // Adhesion Data
    date_adhesion: formatDateForInput(raw.date_adhesion),
    cells_adhered_adhesion: toNumber(raw.cells_adhered_adhesion),
    qc_pass_adhesion: validateQcStatus(raw.qc_pass_adhesion),
    qc_notes_adhesion: raw.qc_notes_adhesion ?? null,
    
    // HPLC Data
    date_hplc: formatDateForInput(raw.date_hplc),
    hbf_percent_grady_hplc: toNumber(raw.hbf_percent_grady_hplc),
    hba_percent_grady_hplc: toNumber(raw.hba_percent_grady_hplc),
    hbc_percent_grady_hplc: toNumber(raw.hbc_percent_grady_hplc),
    hba2_percent_grady_hplc: toNumber(raw.hba2_percent_grady_hplc),
    hbs_percent_grady_hplc: toNumber(raw.hbs_percent_grady_hplc),
    hbf_percent_d10_hplc: toNumber(raw.hbf_percent_d10_hplc),
    hba_percent_d10_hplc: toNumber(raw.hba_percent_d10_hplc),
    hbc_percent_d10_hplc: toNumber(raw.hbc_percent_d10_hplc),
    hba2_percent_d10_hplc: toNumber(raw.hba2_percent_d10_hplc),
    hbs_percent_d10_hplc: toNumber(raw.hbs_percent_d10_hplc),
    hbf_percent_d10_fcell_ratio: toNumber(raw.hbf_percent_d10_fcell_ratio),
    hbf_percent_grady_fcell_ratio: toNumber(raw.hbf_percent_grady_fcell_ratio)
  };
  
  return transformed;
}

export default async function EditSamplePage({ params }: PageProps) {
  try {
    // Handle params correctly, checking for undefined
    if (!params) {
      throw new Error('Missing page parameters');
    }
    
    // Resolve params if it's a Promise
    const paramsObj = await params;
    const id = paramsObj.id;
    
    // Fetch data using Prisma function
    const rawSample = await getOmicsResultBySampleId(id)

    if (!rawSample) {
      notFound()
    }

    // Transform the raw data using the updated function
    const sample = transformToSampleData(rawSample);

    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Edit Sample {rawSample.sample_id}</h1>
            <p className="mt-2 text-sm text-gray-700">
              Editing sample data for Subject ID: {rawSample.omics_subjects?.subject_id ?? 'N/A'}
            </p>
          </div>
          <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 md:px-8">
            <SampleEntryForm initialData={sample} isEditing={true} />
          </div>
        </div>
      </DashboardLayout>
    )
  } catch (error) {
    // Log the error and show notFound or a specific error page
    console.error('Error in EditSamplePage:', error)
    notFound() // Or render an error component
  }
} 
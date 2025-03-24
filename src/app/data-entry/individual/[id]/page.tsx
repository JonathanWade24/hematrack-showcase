import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { notFound } from 'next/navigation'
import { convertToNumber } from '@/lib/utils'
import { SampleEntryForm } from '@/components/data-entry/SampleEntryForm'
import { createClient } from '@/lib/supabase/server'
import { SampleData } from '@/components/data-entry/form-sections/types'

interface PageProps {
  params: {
    id: string
  }
}

interface OmicsSubject {
  subject_id: string
  patient_mrn: string
  project: string
}

interface RawSampleData {
  sample_id: string
  sample_number: number
  subject_id: string
  date_of_collection: string | null
  genotype: string | null
  rbc_advia: number | null
  hb_advia: number | null
  hct_advia: number | null
  mcv_advia: number | null
  mch_advia: number | null
  mchc_advia: number | null
  rdw_advia: number | null
  plt_advia: number | null
  wbc_advia: number | null
  concentration_1_dna: number | null
  cell_number_1_pbmc: number | null
  vol_plasma_1: number | null
  qc_pass_advia: string | null
  qc_pass_lorrca: string | null
  qc_pass_dna: string | null
  qc_pass_viscosity: string | null
  qc_pass_hvr: string | null
  qc_pass_f_cells: string | null
  qc_pass_adhesion: string | null
  sent_to_gt_pbmc: string | null
  omics_subject: OmicsSubject | null
  [key: string]: unknown
}

async function getSampleData(sampleId: string): Promise<RawSampleData | null> {
  try {
    // Create client - properly await it
    const supabase = await createClient()
    
    // Set the schema to laboratory
    const { data, error } = await supabase
      .schema('laboratory')
      .from('omics_results')
      .select(`
        *,
        omics_subject:omics_subjects (
          subject_id,
          patient_mrn,
          project
        )
      `)
      .eq('sample_id', sampleId)
      .single()
    
    if (error) {
      console.error('Error fetching sample:', error)
      return null
    }
    
    if (!data) {
      return null
    }
    
    return convertToNumber(data) as RawSampleData
  } catch (error) {
    // Log the detailed error
    if (error instanceof Error) {
      console.error('Error in getSampleData:', error.message, error.stack)
    } else {
      console.error('Unknown error in getSampleData:', error)
    }
    return null
  }
}

// Function to transform raw database data to match the expected SampleData type
function transformToSampleData(raw: RawSampleData): SampleData {
  // Ensure required string fields are present
  const requiredDefaults = {
    subject_id: raw.subject_id,
    sample_number: raw.sample_number || 1,
    date_of_collection: raw.date_of_collection || new Date().toISOString().split('T')[0]
  }
  
  // Handle QC fields to ensure they match the expected enum values
  const validateQcStatus = (status: string | null): 'Yes' | 'No' | 'Review' | null => {
    if (status === 'Yes' || status === 'No' || status === 'Review') {
      return status;
    }
    return null;
  }
  
  // Pick only the fields that are expected in SampleData
  const transformed: SampleData = {
    ...requiredDefaults,
    // Optional fields from raw data
    age_at_collection: raw.age_at_collection as number | null,
    sex: raw.sex as string | null,
    genotype: raw.genotype || null,
    
    // ADVIA Data
    rbc_advia: raw.rbc_advia,
    hb_advia: raw.hb_advia,
    hct_advia: raw.hct_advia,
    mcv_advia: raw.mcv_advia,
    mch_advia: raw.mch_advia,
    mchc_advia: raw.mchc_advia,
    rdw_advia: raw.rdw_advia,
    hdw_advia: raw.hdw_advia as number | null,
    plt_advia: raw.plt_advia,
    mpv_advia: raw.mpv_advia as number | null,
    wbc_advia: raw.wbc_advia,
    neut_advia: raw.neut_advia as number | null,
    retic_advia: raw.retic_advia as number | null,
    chr_advia: raw.chr_advia as number | null,
    hc41_v120_advia: raw.hc41_v120_advia as number | null,
    hc41_v60_120_advia: raw.hc41_v60_120_advia as number | null,
    hc41_v60_advia: raw.hc41_v60_advia as number | null,
    drbc_advia: raw.drbc_advia as number | null,
    hyper_advia: raw.hyper_advia as number | null,
    nrbc_advia: raw.nrbc_advia as number | null,
    qc_pass_advia: validateQcStatus(raw.qc_pass_advia),
    qc_notes_advia: raw.qc_notes_advia as string | null,
    date_advia: raw.date_advia as string | null,
    
    // DNA Data
    date_dna: raw.date_dna as string | null,
    concentration_1_dna: raw.concentration_1_dna,
    purity_1_dna: raw.purity_1_dna as number | null,
    concentration_2_dna: raw.concentration_2_dna as number | null,
    purity_2_dna: raw.purity_2_dna as number | null,
    qc_pass_dna: validateQcStatus(raw.qc_pass_dna),
    qc_notes_dna: raw.qc_notes_dna as string | null,
    
    // PBMC Data
    date_pmbc: raw.date_pmbc as string | null,
    cell_number_1_pbmc: raw.cell_number_1_pbmc,
    cell_number_2_pbmc: raw.cell_number_2_pbmc as number | null,
    sent_to_gt_pbmc: validateQcStatus(raw.sent_to_gt_pbmc) as 'Yes' | 'No' | null,
    qc_notes_pbmc: raw.qc_notes_pbmc as string | null,
    
    // Plasma Data
    date_plasma: raw.date_plasma as string | null,
    vol_plasma_1: raw.vol_plasma_1,
    vol_plasma_2: raw.vol_plasma_2 as number | null,
    vol_plasma_3: raw.vol_plasma_3 as number | null,
    qc_notes_plasma: raw.qc_notes_plasma as string | null,
    
    // Lorrca Data
    date_lorrca: raw.date_lorrca as string | null,
    ei_min_lorrca: raw.ei_min_lorrca as number | null,
    ei_max_lorrca: raw.ei_max_lorrca as number | null,
    ei_delta_lorrca: raw.ei_delta_lorrca as number | null,
    pos_lorrca: raw.pos_lorrca as number | null,
    instrument_lorrca: raw.instrument_lorrca as string | null,
    qc_pass_lorrca: validateQcStatus(raw.qc_pass_lorrca),
    qc_notes_lorrca: raw.qc_notes_lorrca as string | null,
    
    // Other sections with proper validation
    date_visc: raw.date_visc as string | null,
    visc_45: raw.visc_45 as number | null,
    visc_225: raw.visc_225 as number | null,
    qc_pass_viscosity: validateQcStatus(raw.qc_pass_viscosity),
    qc_notes_viscosity: raw.qc_notes_viscosity as string | null,
    
    date_hvr: raw.date_hvr as string | null,
    hvr_45: raw.hvr_45 as number | null,
    hvr_225: raw.hvr_225 as number | null,
    qc_pass_hvr: validateQcStatus(raw.qc_pass_hvr),
    qc_notes_hvr: raw.qc_notes_hvr as string | null,
    
    date_f_cells: raw.date_f_cells as string | null,
    percent_f_cells: raw.percent_f_cells as number | null,
    stain_f_cells: raw.stain_f_cells as string | null,
    cytometer_f_cells: raw.cytometer_f_cells as string | null,
    qc_pass_f_cells: validateQcStatus(raw.qc_pass_f_cells),
    qc_notes_f_cells: raw.qc_notes_f_cells as string | null,
    
    date_adhesion: raw.date_adhesion as string | null,
    cells_adhered_adhesion: raw.cells_adhered_adhesion as number | null,
    qc_pass_adhesion: validateQcStatus(raw.qc_pass_adhesion),
    qc_notes_adhesion: raw.qc_notes_adhesion as string | null,
    
    date_hplc: raw.date_hplc as string | null,
    hbf_percent_grady_hplc: raw.hbf_percent_grady_hplc as number | null,
    hba_percent_grady_hplc: raw.hba_percent_grady_hplc as number | null,
    hbc_percent_grady_hplc: raw.hbc_percent_grady_hplc as number | null,
    hba2_percent_grady_hplc: raw.hba2_percent_grady_hplc as number | null,
    hbs_percent_grady_hplc: raw.hbs_percent_grady_hplc as number | null,
    hbf_percent_d10_hplc: raw.hbf_percent_d10_hplc as number | null,
    hba_percent_d10_hplc: raw.hba_percent_d10_hplc as number | null,
    hbc_percent_d10_hplc: raw.hbc_percent_d10_hplc as number | null,
    hba2_percent_d10_hplc: raw.hba2_percent_d10_hplc as number | null,
    hbs_percent_d10_hplc: raw.hbs_percent_d10_hplc as number | null,
    hbf_percent_d10_fcell_ratio: raw.hbf_percent_d10_fcell_ratio as number | null,
    hbf_percent_grady_fcell_ratio: raw.hbf_percent_grady_fcell_ratio as number | null
  }
  
  return transformed;
}

export default async function EditSamplePage({ params }: PageProps) {
  try {
    // For Next.js 15, we need to await params before accessing properties
    const parameters = await params;
    const id = parameters.id;
    
    const rawSample = await getSampleData(id)

    if (!rawSample) {
      notFound()
    }

    // Transform the raw data to match the expected type
    const sample = transformToSampleData(rawSample);

    return (
      <DashboardLayout>
        <div className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <h1 className="text-2xl font-semibold text-gray-900">Edit Sample {rawSample.sample_id}</h1>
            <p className="mt-2 text-sm text-gray-700">
              Update sample information. All fields are optional unless marked as required.
            </p>
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="py-4">
              <SampleEntryForm initialData={sample} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  } catch (error) {
    // Add comprehensive error handling at the page level
    console.error("Error in EditSamplePage:", error);
    throw error; // Let Next.js error handling take over
  }
} 
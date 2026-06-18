export interface FormSectionProps {
  formData: SampleData
  isEditMode: boolean
  onInputChange: (field: keyof SampleData, value: string | number | boolean | null) => void
  disabled?: boolean
}

export interface SampleData {
  // Basic Info (Required on initial entry)
  subject_id: string
  sample_number: number
  lab_id: string | null
  date_of_collection: string | null
  age_at_collection: number | null
  sex: string | null
  genotype: string | null
  therapies: string | null
  days_to_processing: number | null
  steady_state: string | null
  transfusion_status: string | null
  transfusion_confirmed: string | null
  patient_mrn?: string | null

  // ADVIA Data (Optional, can be added later)
  date_advia: string | null
  rbc_advia: number | null
  hb_advia?: number | null
  hct_advia?: number | null
  mcv_advia?: number | null
  mch_advia?: number | null
  mchc_advia?: number | null
  rdw_advia?: number | null
  hdw_advia?: number | null
  plt_advia?: number | null
  mpv_advia?: number | null
  wbc_advia?: number | null
  neut_advia?: number | null
  retic_advia?: number | null
  chr_advia?: number | null
  hc41_v120_advia?: number | null
  hc41_v60_120_advia?: number | null
  hc41_v60_advia?: number | null
  drbc_advia?: number | null
  hyper_advia?: number | null
  nrbc_advia?: number | null
  qc_pass_advia?: 'Yes' | 'No' | 'Review' | null
  qc_notes_advia: string | null

  // DNA Data
  date_dna: string | null
  concentration_1_dna?: number | null
  purity_1_dna?: number | null
  concentration_2_dna?: number | null
  purity_2_dna?: number | null
  qc_pass_dna?: 'Yes' | 'No' | 'Review' | null
  qc_notes_dna: string | null

  // PBMC Data
  date_pmbc: string | null
  cell_number_1_pbmc?: number | null
  cell_number_2_pbmc?: number | null
  sent_to_gt_pbmc?: 'Yes' | 'No' | null
  qc_notes_pbmc: string | null

  // Plasma Data
  date_plasma: string | null
  vol_plasma_1?: number | null
  vol_plasma_2?: number | null
  vol_plasma_3?: number | null
  qc_notes_plasma: string | null

  // Lorrca Data
  date_lorrca: string | null
  ei_min_lorrca?: number | null
  ei_max_lorrca?: number | null
  ei_delta_lorrca?: number | null
  pos_lorrca?: number | null
  instrument_lorrca?: string | null
  qc_pass_lorrca?: 'Yes' | 'No' | 'Review' | null
  qc_notes_lorrca: string | null

  // Viscosity Data
  date_visc: string | null
  visc_45?: number | null
  visc_225?: number | null
  qc_pass_viscosity?: 'Yes' | 'No' | 'Review' | null
  qc_notes_viscosity: string | null

  // HVR Data
  date_hvr: string | null
  hvr_45?: number | null
  hvr_225?: number | null
  qc_pass_hvr?: 'Yes' | 'No' | 'Review' | null
  qc_notes_hvr: string | null

  // F-Cells Data
  date_f_cells: string | null
  percent_f_cells?: number | null
  stain_f_cells?: string | null
  cytometer_f_cells?: string | null
  qc_pass_f_cells?: 'Yes' | 'No' | 'Review' | null
  qc_notes_f_cells: string | null

  // Adhesion Data
  date_adhesion: string | null
  cells_adhered_adhesion?: number | null
  qc_pass_adhesion?: 'Yes' | 'No' | 'Review' | null
  qc_notes_adhesion: string | null

  // HPLC Data
  date_hplc: string | null
  hbf_percent_grady_hplc?: number | null
  hba_percent_grady_hplc?: number | null
  hbc_percent_grady_hplc?: number | null
  hba2_percent_grady_hplc?: number | null
  hbs_percent_grady_hplc?: number | null
  hbf_percent_d10_hplc?: number | null
  hba_percent_d10_hplc?: number | null
  hbc_percent_d10_hplc?: number | null
  hba2_percent_d10_hplc?: number | null
  hbs_percent_d10_hplc?: number | null
  hbf_percent_d10_fcell_ratio?: number | null
  hbf_percent_grady_fcell_ratio: number | null
} 
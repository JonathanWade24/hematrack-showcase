import { Decimal } from '@prisma/client/runtime/library'

export type QCStatus = 'Pass' | 'Fail' | 'Review'

export interface BaseOmicsResult {
  id: string
  subject_id: string
  sample_id: string
  date_of_collection: Date | null
  genotype: string | null
  age_at_collection?: Decimal | null
  qc_status?: QCStatus
  qc_notes?: string | null
  notes?: string | null
  created_at: Date
  updated_at: Date
}

export interface AdviaData {
  date_advia?: Date | null
  rbc_advia?: Decimal | null
  hb_advia?: Decimal | null
  hct_advia?: Decimal | null
  mcv_advia?: Decimal | null
  mch_advia?: Decimal | null
  mchc_advia?: Decimal | null
  rdw_advia?: Decimal | null
  plt_advia?: Decimal | null
  wbc_advia?: Decimal | null
  retic_advia?: Decimal | null
  qc_pass_advia?: string | null
  qc_notes_advia?: string | null
}

export interface DNAData {
  date_dna?: Date | null
  concentration_1_dna?: Decimal | null
  purity_1_dna?: Decimal | null
  concentration_2_dna?: Decimal | null
  purity_2_dna?: Decimal | null
  qc_pass_dna?: string | null
  qc_notes_dna?: string | null
}

export interface FCellsData {
  date_f_cells?: Date | null
  percent_f_cells?: Decimal | null
  stain_f_cells?: string | null
  cytometer_f_cells?: string | null
  qc_pass_f_cells?: string | null
  qc_notes_f_cells?: string | null
}

export interface PBMCData {
  date_pbmc?: Date | null
  cell_number_1_pbmc?: Decimal | null
  cell_number_2_pbmc?: Decimal | null
  sent_to_gt_pbmc?: string | null
  qc_notes_pbmc?: string | null
}

export interface AdhesionData {
  date_adhesion?: Date | null
  cells_adhered_adhesion?: Decimal | null
  qc_pass_adhesion?: string | null
  qc_notes_adhesion?: string | null
}

export interface LorrcaData {
  date_lorrca?: Date | null
  ei_min_lorrca?: Decimal | null
  ei_max_lorrca?: Decimal | null
  ei_delta_lorrca?: Decimal | null
  instrument_lorrca?: string | null
  qc_pass_lorrca?: string | null
  qc_notes_lorrca?: string | null
}

export interface ViscosityData {
  date_visc?: Date | null
  visc_45?: Decimal | null
  visc_225?: Decimal | null
  qc_pass_viscosity?: string | null
  qc_notes_viscosity?: string | null
}

export interface PlasmaData {
  date_plasma?: Date | null
  vol_plasma_1?: Decimal | null
  vol_plasma_2?: Decimal | null
  vol_plasma_3?: Decimal | null
  qc_notes_plasma?: string | null
}

export type OmicsResult = BaseOmicsResult &
  AdviaData &
  DNAData &
  FCellsData &
  PBMCData &
  AdhesionData &
  LorrcaData &
  ViscosityData &
  PlasmaData

export type AssayType =
  | 'ADVIA'
  | 'DNA'
  | 'F_CELLS'
  | 'PBMC'
  | 'ADHESION'
  | 'LORRCA'
  | 'VISCOSITY'
  | 'PLASMA'

export interface ValidationRule {
  min: number
  max: number
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface OmicsSubject {
  subject_id: string
  patient_mrn: string
  project: string
  created_at: Date
  updated_at: Date
}

export interface Patient {
  patient_mrn: string
  first_name?: string
  last_name?: string
  birth_date?: Date
  sex?: string
  race?: string
  ethnicity?: string
  created_at: Date
  updated_at: Date
}

export interface SampleIDSequence {
  subject_id: string
  last_sample_number: number
  created_at: Date
  updated_at: Date
} 
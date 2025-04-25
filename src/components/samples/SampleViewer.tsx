'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft, faVial, faCalendar, faFlask, faMicroscope, 
  faTint, faDna, faVials
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface Patient {
  first_name: string | null
  last_name: string | null
  birth_date: Date | null
  sex: string | null
  race: string | null
  ethnicity: string | null
}

interface OmicsSubject {
  subject_id: string
  patient_mrn: string
  project: string
  patients: Patient
}

interface OmicsResult {
  sample_id: string
  subject_id: string
  sample_number: number | null
  date_of_collection: string | null
  age_at_collection: number | null
  sex: string | null
  genotype: string | null
  
  // ADVIA Data
  date_advia: string | null
  rbc_advia: number | null
  hb_advia: number | null
  hct_advia: number | null
  mcv_advia: number | null
  mch_advia: number | null
  mchc_advia: number | null
  rdw_advia: number | null
  hdw_advia: number | null
  plt_advia: number | null
  mpv_advia: number | null
  wbc_advia: number | null
  neut_advia: number | null
  retic_advia: number | null
  chr_advia: number | null
  hc41_v120_advia: number | null
  hc41_v60_120_advia: number | null
  hc41_v60_advia: number | null
  drbc_advia: number | null
  hyper_advia: number | null
  nrbc_advia: number | null
  qc_pass_advia: string | null
  qc_notes_advia: string | null

  // DNA Data
  date_dna: string | null
  concentration_1_dna: number | null
  purity_1_dna: number | null
  concentration_2_dna: number | null
  purity_2_dna: number | null
  qc_pass_dna: string | null
  qc_notes_dna: string | null

  // PBMC Data
  date_pmbc: string | null
  cell_number_1_pbmc: number | null
  cell_number_2_pbmc: number | null
  sent_to_gt_pbmc: string | null
  qc_notes_pbmc: string | null

  // Plasma Data
  date_plasma: string | null
  vol_plasma_1: number | null
  vol_plasma_2: number | null
  vol_plasma_3: number | null
  qc_notes_plasma: string | null

  // Lorrca Data
  date_lorrca: string | null
  ei_min_lorrca: number | null
  ei_max_lorrca: number | null
  ei_delta_lorrca: number | null
  pos_lorrca: number | null
  instrument_lorrca: string | null
  qc_pass_lorrca: string | null
  qc_notes_lorrca: string | null

  // Viscosity Data
  date_visc: string | null
  visc_45: number | null
  visc_225: number | null
  qc_pass_viscosity: string | null
  qc_notes_viscosity: string | null

  // HVR Data
  date_hvr: string | null
  hvr_45: number | null
  hvr_225: number | null
  qc_pass_hvr: string | null
  qc_notes_hvr: string | null

  // F-Cells Data
  date_f_cells: string | null
  percent_f_cells: number | null
  stain_f_cells: string | null
  cytometer_f_cells: string | null
  qc_pass_f_cells: string | null
  qc_notes_f_cells: string | null

  // Adhesion Data
  date_adhesion: string | null
  cells_adhered_adhesion: number | null
  qc_pass_adhesion: string | null
  qc_notes_adhesion: string | null

  // HPLC Data
  date_hplc: string | null
  hbf_percent_grady_hplc: number | null
  hba_percent_grady_hplc: number | null
  hbc_percent_grady_hplc: number | null
  hba2_percent_grady_hplc: number | null
  hbs_percent_grady_hplc: number | null
  hbf_percent_d10_hplc: number | null
  hba_percent_d10_hplc: number | null
  hbc_percent_d10_hplc: number | null
  hba2_percent_d10_hplc: number | null
  hbs_percent_d10_hplc: number | null
  hbf_percent_d10_fcell_ratio: number | null
  hbf_percent_grady_fcell_ratio: number | null

  omics_subjects: OmicsSubject
}

interface SampleViewerProps {
  sample: OmicsResult
}

function AssayCard({ 
  title, 
  date, 
  icon, 
  qcStatus, 
  qcNotes,
  data 
}: { 
  title: string
  date: Date | null
  icon: IconDefinition
  qcStatus?: string | null
  qcNotes?: string | null
  data: { label: string; value: number | string | null }[]
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
              <FontAwesomeIcon icon={icon} />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-800">{title}</h3>
          </div>
          <div className="text-sm text-gray-500">
            {date ? new Date(date).toLocaleDateString() : 'Not available'}
          </div>
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          {data.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {value ?? 'Not available'}
              </dd>
            </div>
          ))}
        </div>
        {(qcStatus || qcNotes) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              {qcStatus && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">QC Status</dt>
                  <dd className={`mt-1 text-sm font-medium ${
                    qcStatus === 'Yes' ? 'text-green-600' :
                    qcStatus === 'No' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {qcStatus}
                  </dd>
                </div>
              )}
              {qcNotes && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">QC Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{qcNotes}</dd>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to display values
function displayValue(value: string | number | null | undefined): string | number {
  return value ?? 'Not available';
}

export function SampleViewer({ sample }: SampleViewerProps) {
  const hasAllComponents = 
    sample.concentration_1_dna !== null &&
    sample.cell_number_1_pbmc !== null &&
    sample.vol_plasma_1 !== null

  const hasAnyComponent =
    sample.concentration_1_dna !== null ||
    sample.cell_number_1_pbmc !== null ||
    sample.vol_plasma_1 !== null

  const processing_status = hasAllComponents ? 'Complete' : hasAnyComponent ? 'Partial' : 'Pending'
  
  const qc_status = 
    (sample.qc_pass_advia === 'No' || sample.qc_pass_lorrca === 'No')
      ? 'Failed'
      : (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review')
      ? 'Review'
      : 'Passed'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Back Link */}
        <div>
          <Link 
            href={`/subjects/${sample.subject_id}`}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Subject
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sample Details</h1>
          <p className="mt-2 text-sm text-gray-600">
            View detailed information for sample {sample.sample_id}
          </p>
        </div>

        {/* Sample Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow p-6 col-span-1 md:col-span-2 lg:col-span-3">
             <h3 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h3>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <div>
                 <dt className="text-sm font-medium text-gray-500">Sample ID</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.sample_id)}</dd>
               </div>
               <div>
                 <dt className="text-sm font-medium text-gray-500">Subject ID</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.subject_id)}</dd>
               </div>
               <div>
                 <dt className="text-sm font-medium text-gray-500">Sample Number</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.sample_number)}</dd>
               </div>
               <div>
                 <dt className="text-sm font-medium text-gray-500">Collection Date</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.date_of_collection ? new Date(sample.date_of_collection).toLocaleDateString() : null)}</dd>
               </div>
               <div>
                 <dt className="text-sm font-medium text-gray-500">Age at Collection</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.age_at_collection)}</dd>
               </div>
               <div>
                 <dt className="text-sm font-medium text-gray-500">Genotype</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.genotype)}</dd>
               </div>
                {/* Display patient info if available */}
               {sample.omics_subjects?.patients && (
                 <>
                   <div>
                     <dt className="text-sm font-medium text-gray-500">Patient Sex</dt>
                     <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.omics_subjects.patients.sex)}</dd>
                   </div>
                   {/* Add other patient fields here if needed */}
                 </>
               )}
             </div>
          </div>
          
          {/* Processing & QC Status Cards (Simplified) */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-center items-center">
             <p className="text-sm font-medium text-gray-500 mb-2">Processing Status</p>
             <p className="text-xl font-semibold text-gray-900">{processing_status}</p>
          </div>
           <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-center items-center">
             <p className="text-sm font-medium text-gray-500 mb-2">Overall QC Status</p>
             <p className={`text-xl font-semibold ${
               qc_status === 'Passed' ? 'text-green-600' :
               qc_status === 'Failed' ? 'text-red-600' :
               'text-yellow-600'
             }`}>{qc_status}</p>
          </div>
        </div>

        {/* Assay Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssayCard
            title="ADVIA"
            date={sample.date_advia ? new Date(sample.date_advia) : null}
            icon={faTint}
            qcStatus={sample.qc_pass_advia}
            qcNotes={sample.qc_notes_advia}
            data={[
              { label: 'RBC', value: sample.rbc_advia },
              { label: 'HB', value: sample.hb_advia },
              { label: 'HCT', value: sample.hct_advia },
              { label: 'MCV', value: sample.mcv_advia },
              { label: 'MCH', value: sample.mch_advia },
              { label: 'MCHC', value: sample.mchc_advia },
              { label: 'RDW', value: sample.rdw_advia },
              { label: 'HDW', value: sample.hdw_advia },
              { label: 'PLT', value: sample.plt_advia },
              { label: 'MPV', value: sample.mpv_advia },
              { label: 'WBC', value: sample.wbc_advia },
              { label: 'NEUT', value: sample.neut_advia },
              { label: 'RETIC', value: sample.retic_advia },
              { label: 'CHR', value: sample.chr_advia },
              // { label: 'HC41_V120', value: sample.hc41_v120_advia }, // Potentially hide very technical ones?
              // { label: 'HC41_V60_120', value: sample.hc41_v60_120_advia },
              // { label: 'HC41_V60', value: sample.hc41_v60_advia },
              { label: 'DRBC', value: sample.drbc_advia },
              { label: 'HYPER', value: sample.hyper_advia },
              { label: 'NRBC', value: sample.nrbc_advia },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />
  
          <AssayCard
            title="DNA"
            date={sample.date_dna ? new Date(sample.date_dna) : null}
            icon={faDna}
            qcStatus={sample.qc_pass_dna}
            qcNotes={sample.qc_notes_dna}
            data={[
              { label: 'Conc 1', value: sample.concentration_1_dna },
              { label: 'Purity 1', value: sample.purity_1_dna },
              { label: 'Conc 2', value: sample.concentration_2_dna },
              { label: 'Purity 2', value: sample.purity_2_dna },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />
  
          <AssayCard
            title="PBMC"
            date={sample.date_pmbc ? new Date(sample.date_pmbc) : null}
            icon={faFlask} 
            qcNotes={sample.qc_notes_pbmc}
            data={[
              { label: 'Cell #1', value: sample.cell_number_1_pbmc },
              { label: 'Cell #2', value: sample.cell_number_2_pbmc },
              { label: 'Sent to GT', value: sample.sent_to_gt_pbmc },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />
  
          <AssayCard
            title="Plasma"
            date={sample.date_plasma ? new Date(sample.date_plasma) : null}
            icon={faVial} 
            qcNotes={sample.qc_notes_plasma}
            data={[
              { label: 'Vol 1', value: sample.vol_plasma_1 },
              { label: 'Vol 2', value: sample.vol_plasma_2 },
              { label: 'Vol 3', value: sample.vol_plasma_3 },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />
  
          <AssayCard
            title="Lorrca"
            date={sample.date_lorrca ? new Date(sample.date_lorrca) : null}
            icon={faVials} 
            qcStatus={sample.qc_pass_lorrca}
            qcNotes={sample.qc_notes_lorrca}
            data={[
              { label: 'EI Min', value: sample.ei_min_lorrca },
              { label: 'EI Max', value: sample.ei_max_lorrca },
              { label: 'EI Delta', value: sample.ei_delta_lorrca },
              { label: 'Pos', value: sample.pos_lorrca },
              { label: 'Instrument', value: sample.instrument_lorrca },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />

          {/* NEW Assay Cards */}
          <AssayCard
            title="Viscosity"
            date={sample.date_visc ? new Date(sample.date_visc) : null}
            icon={faMicroscope} // Placeholder icon
            qcStatus={sample.qc_pass_viscosity}
            qcNotes={sample.qc_notes_viscosity}
            data={[
              { label: 'Visc 45', value: sample.visc_45 },
              { label: 'Visc 225', value: sample.visc_225 },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />

          <AssayCard
            title="HVR"
            date={sample.date_hvr ? new Date(sample.date_hvr) : null}
            icon={faMicroscope} // Placeholder icon
            qcStatus={sample.qc_pass_hvr}
            qcNotes={sample.qc_notes_hvr}
            data={[
              { label: 'HVR 45', value: sample.hvr_45 },
              { label: 'HVR 225', value: sample.hvr_225 },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />

          <AssayCard
            title="F-Cells"
            date={sample.date_f_cells ? new Date(sample.date_f_cells) : null}
            icon={faMicroscope} // Placeholder icon
            qcStatus={sample.qc_pass_f_cells}
            qcNotes={sample.qc_notes_f_cells}
            data={[
              { label: '% F-Cells', value: sample.percent_f_cells },
              { label: 'Stain', value: sample.stain_f_cells },
              { label: 'Cytometer', value: sample.cytometer_f_cells },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />

          <AssayCard
            title="Adhesion"
            date={sample.date_adhesion ? new Date(sample.date_adhesion) : null}
            icon={faMicroscope} // Placeholder icon
            qcStatus={sample.qc_pass_adhesion}
            qcNotes={sample.qc_notes_adhesion}
            data={[
              { label: 'Cells Adhered', value: sample.cells_adhered_adhesion },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />

          <AssayCard
            title="HPLC"
            date={sample.date_hplc ? new Date(sample.date_hplc) : null}
            icon={faFlask} // Placeholder icon
            // No specific QC for HPLC?
            data={[
              { label: '%HbF (Grady)', value: sample.hbf_percent_grady_hplc },
              { label: '%HbA (Grady)', value: sample.hba_percent_grady_hplc },
              { label: '%HbC (Grady)', value: sample.hbc_percent_grady_hplc },
              { label: '%HbA2 (Grady)', value: sample.hba2_percent_grady_hplc },
              { label: '%HbS (Grady)', value: sample.hbs_percent_grady_hplc },
              { label: '%HbF (D10)', value: sample.hbf_percent_d10_hplc },
              { label: '%HbA (D10)', value: sample.hba_percent_d10_hplc },
              { label: '%HbC (D10)', value: sample.hbc_percent_d10_hplc },
              { label: '%HbA2 (D10)', value: sample.hba2_percent_d10_hplc },
              { label: '%HbS (D10)', value: sample.hbs_percent_d10_hplc },
              { label: '%HbF/F-Cell (D10)', value: sample.hbf_percent_d10_fcell_ratio },
              { label: '%HbF/F-Cell (Grady)', value: sample.hbf_percent_grady_fcell_ratio },
            ].map(d => ({ label: d.label, value: displayValue(d.value) }))}
          />

        </div>
      </div>
    </div>
  )
} 
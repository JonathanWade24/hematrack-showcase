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
  date_of_collection: Date | null
  genotype: string | null
  age_at_collection: number | null
  
  // ADVIA Data
  date_advia: Date | null
  rbc_advia: number | null
  hb_advia: number | null
  hct_advia: number | null
  mcv_advia: number | null
  mch_advia: number | null
  mchc_advia: number | null
  rdw_advia: number | null
  plt_advia: number | null
  wbc_advia: number | null
  qc_pass_advia: string | null
  qc_notes_advia: string | null

  // DNA Data
  date_dna: Date | null
  concentration_1_dna: number | null
  purity_1_dna: number | null
  concentration_2_dna: number | null
  purity_2_dna: number | null
  qc_pass_dna: string | null
  qc_notes_dna: string | null

  // PBMC Data
  date_pmbc: Date | null
  cell_number_1_pbmc: number | null
  cell_number_2_pbmc: number | null
  sent_to_gt_pbmc: string | null
  qc_notes_pbmc: string | null

  // Plasma Data
  date_plasma: Date | null
  vol_plasma_1: number | null
  vol_plasma_2: number | null
  vol_plasma_3: number | null
  qc_notes_plasma: string | null

  // Lorrca Data
  date_lorrca: Date | null
  ei_min_lorrca: number | null
  ei_max_lorrca: number | null
  ei_delta_lorrca: number | null
  pos_lorrca: number | null
  instrument_lorrca: string | null
  qc_pass_lorrca: string | null
  qc_notes_lorrca: string | null

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

        {/* Sample Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FontAwesomeIcon icon={faVial} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sample ID</p>
                <p className="text-lg font-semibold text-gray-900">{sample.sample_id}</p>
              </div>
            </div>
          </div>

          {/* Collection Date */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FontAwesomeIcon icon={faCalendar} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Collection Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {sample.date_of_collection
                    ? new Date(sample.date_of_collection).toLocaleDateString()
                    : 'Not available'}
                </p>
              </div>
            </div>
          </div>

          {/* Processing Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${
                processing_status === 'Complete' ? 'bg-green-100 text-green-600' :
                processing_status === 'Partial' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                <FontAwesomeIcon icon={faFlask} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Processing Status</p>
                <p className="text-lg font-semibold text-gray-900">{processing_status}</p>
              </div>
            </div>
          </div>

          {/* QC Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${
                qc_status === 'Passed' ? 'bg-green-100 text-green-600' :
                qc_status === 'Failed' ? 'bg-red-100 text-red-600' :
                'bg-yellow-100 text-yellow-600'
              }`}>
                <FontAwesomeIcon icon={faMicroscope} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">QC Status</p>
                <p className="text-lg font-semibold text-gray-900">{qc_status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assay Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ADVIA Results */}
          <AssayCard
            title="ADVIA Results"
            date={sample.date_advia}
            icon={faTint}
            qcStatus={sample.qc_pass_advia}
            qcNotes={sample.qc_notes_advia}
            data={[
              { label: 'RBC', value: sample.rbc_advia },
              { label: 'Hemoglobin', value: sample.hb_advia },
              { label: 'Hematocrit', value: sample.hct_advia },
              { label: 'MCV', value: sample.mcv_advia },
              { label: 'MCH', value: sample.mch_advia },
              { label: 'MCHC', value: sample.mchc_advia },
              { label: 'RDW', value: sample.rdw_advia },
              { label: 'Platelets', value: sample.plt_advia },
              { label: 'WBC', value: sample.wbc_advia }
            ]}
          />

          {/* DNA Results */}
          <AssayCard
            title="DNA Results"
            date={sample.date_dna}
            icon={faDna}
            qcStatus={sample.qc_pass_dna}
            qcNotes={sample.qc_notes_dna}
            data={[
              { label: 'Concentration 1', value: sample.concentration_1_dna },
              { label: 'Purity 1', value: sample.purity_1_dna },
              { label: 'Concentration 2', value: sample.concentration_2_dna },
              { label: 'Purity 2', value: sample.purity_2_dna }
            ]}
          />

          {/* PBMC Results */}
          <AssayCard
            title="PBMC Results"
            date={sample.date_pmbc}
            icon={faFlask}
            qcNotes={sample.qc_notes_pbmc}
            data={[
              { label: 'Cell Number 1', value: sample.cell_number_1_pbmc },
              { label: 'Cell Number 2', value: sample.cell_number_2_pbmc },
              { label: 'Sent to GT', value: sample.sent_to_gt_pbmc }
            ]}
          />

          {/* Plasma Results */}
          <AssayCard
            title="Plasma Results"
            date={sample.date_plasma}
            icon={faVial}
            qcNotes={sample.qc_notes_plasma}
            data={[
              { label: 'Volume 1', value: sample.vol_plasma_1 },
              { label: 'Volume 2', value: sample.vol_plasma_2 },
              { label: 'Volume 3', value: sample.vol_plasma_3 }
            ]}
          />

          {/* Lorrca Results */}
          <AssayCard
            title="Lorrca Results"
            date={sample.date_lorrca}
            icon={faVials}
            qcStatus={sample.qc_pass_lorrca}
            qcNotes={sample.qc_notes_lorrca}
            data={[
              { label: 'EI Min', value: sample.ei_min_lorrca },
              { label: 'EI Max', value: sample.ei_max_lorrca },
              { label: 'EI Delta', value: sample.ei_delta_lorrca },
              { label: 'POS', value: sample.pos_lorrca },
              { label: 'Instrument', value: sample.instrument_lorrca }
            ]}
          />
        </div>
      </div>
    </div>
  )
} 
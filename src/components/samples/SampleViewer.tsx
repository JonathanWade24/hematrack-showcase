'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft, faVial, faCalendar, faFlask, faMicroscope, 
  faTint, faDna, faVials
} from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { 
  SampleWithAllResults, 
  ResultDna,
  ResultPlasma,
  ResultPbmc,
  ResultAdhesion,
  ResultAdvia,
  ResultFcells,
  ResultLorca,
  ResultViscosity,
} from '@/lib/db/queries'

interface SampleViewerProps {
  sample: SampleWithAllResults
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
  const dnaResults = sample.results_dnaInLaboratories?.[0];
  const pbmcResults = sample.results_pbmcInLaboratories?.[0];
  const plasmaResults = sample.results_plasmaInLaboratories?.[0];
  const adviaResults = sample.results_adviaInLaboratories?.[0];
  const lorcaResults = sample.results_lorrcaInLaboratories?.[0];

  const hasAllComponents = 
    dnaResults?.concentration_1_dna !== null &&
    pbmcResults?.cell_number_1_pbmc !== null &&
    plasmaResults?.vol_plasma_1 !== null

  const hasAnyComponent =
    dnaResults?.concentration_1_dna !== null ||
    pbmcResults?.cell_number_1_pbmc !== null ||
    plasmaResults?.vol_plasma_1 !== null

  const processing_status = hasAllComponents ? 'Complete' : hasAnyComponent ? 'Partial' : 'Pending'
  
  const qc_status = 
    (adviaResults?.qc_pass_advia === 'No' || lorcaResults?.qc_pass_lorrca === 'No')
      ? 'Failed'
      : (adviaResults?.qc_pass_advia === 'Review' || lorcaResults?.qc_pass_lorrca === 'Review')
      ? 'Review'
      : 'Passed'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Back Link */}
        <div>
          <Link 
            href={`/subjects/${sample.omics_subjectsInLaboratory?.subject_id}`}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Subject
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
        <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sample ID: {sample.sample_id}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Subject ID: {sample.omics_subjectsInLaboratory?.subject_id}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Collected: {sample.date_of_collection ? new Date(sample.date_of_collection).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Sample Overview Card */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Sample Overview</h3>
               </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Patient Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {sample.omics_subjectsInLaboratory?.patientsInClinical?.first_name && sample.omics_subjectsInLaboratory?.patientsInClinical?.last_name 
                    ? `${sample.omics_subjectsInLaboratory.patientsInClinical.first_name} ${sample.omics_subjectsInLaboratory.patientsInClinical.last_name}` 
                    : 'Not available'}
                </dd>
               </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">MRN</dt>
                <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.omics_subjectsInLaboratory?.patient_mrn)}</dd>
               </div>
              <div className="sm:col-span-1">
                 <dt className="text-sm font-medium text-gray-500">Age at Collection</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.age_at_collection)}</dd>
               </div>
              <div className="sm:col-span-1">
                 <dt className="text-sm font-medium text-gray-500">Genotype</dt>
                 <dd className="mt-1 text-sm text-gray-900">{displayValue(sample.genotype)}</dd>
               </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Processing Status</dt>
                <dd className={`mt-1 text-sm font-medium ${
                  processing_status === 'Complete' ? 'text-green-600' : 
                  processing_status === 'Partial' ? 'text-yellow-600' : 'text-red-600'
                }`}>{processing_status}</dd>
                   </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Overall QC Status</dt>
                 <dd className={`mt-1 text-sm font-medium ${
                  qc_status === 'Passed' ? 'text-green-600' : 
                  qc_status === 'Review' ? 'text-yellow-600' : 'text-red-600'
                }`}>{qc_status}</dd>
             </div>
            </dl>
          </div>
        </div>

        {/* Assay Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* DNA Card */}
          {dnaResults && (
          <AssayCard
            title="DNA"
              date={dnaResults.date_dna ? new Date(dnaResults.date_dna) : null}
            icon={faDna}
              qcStatus={dnaResults.qc_pass_dna}
              qcNotes={dnaResults.qc_notes_dna}
            data={[
                { label: 'Conc. 1 (ng/uL)', value: dnaResults.concentration_1_dna },
                { label: 'Purity 1 (260/280)', value: dnaResults.purity_1_dna },
                { label: 'Conc. 2 (ng/uL)', value: dnaResults.concentration_2_dna },
                { label: 'Purity 2 (260/280)', value: dnaResults.purity_2_dna },
              ]}
            />
          )}

          {/* PBMC Card */}
          {pbmcResults && (
          <AssayCard
            title="PBMC"
              date={pbmcResults.date_pbmc ? new Date(pbmcResults.date_pbmc) : null}
              icon={faVials}
              qcNotes={pbmcResults.qc_notes_pbmc}
            data={[
                { label: 'Cell Count 1 (x10^6)', value: pbmcResults.cell_number_1_pbmc },
                { label: 'Cell Count 2 (x10^6)', value: pbmcResults.cell_number_2_pbmc },
                { label: 'Sent to GT', value: pbmcResults.sent_to_gt_pbmc },
              ]}
            />
          )}

          {/* Plasma Card */}
          {plasmaResults && (
          <AssayCard
            title="Plasma"
              date={plasmaResults.date_plasma ? new Date(plasmaResults.date_plasma) : null}
              icon={faTint}
              qcNotes={plasmaResults.qc_notes_plasma}
            data={[
                { label: 'Volume 1 (mL)', value: plasmaResults.vol_plasma_1 },
                { label: 'Volume 2 (mL)', value: plasmaResults.vol_plasma_2 },
                { label: 'Volume 3 (mL)', value: plasmaResults.vol_plasma_3 },
              ]}
          />
          )}
          
          {/* ADVIA Card */}
          {adviaResults && (
          <AssayCard
              title="ADVIA Hematology"
              date={adviaResults.date_advia ? new Date(adviaResults.date_advia) : null}
              icon={faMicroscope}
              qcStatus={adviaResults.qc_pass_advia}
              qcNotes={adviaResults.qc_notes_advia}
            data={[
                { label: 'RBC (x10^12/L)', value: adviaResults.rbc_advia },
                { label: 'Hgb (g/dL)', value: adviaResults.hb_advia },
                { label: 'Hct (%)', value: adviaResults.hct_advia },
                { label: 'MCV (fL)', value: adviaResults.mcv_advia },
                { label: 'MCH (pg)', value: adviaResults.mch_advia },
                { label: 'MCHC (g/dL)', value: adviaResults.mchc_advia },
                { label: 'RDW (%)', value: adviaResults.rdw_advia },
                { label: 'PLT (x10^9/L)', value: adviaResults.plt_advia },
                { label: 'WBC (x10^9/L)', value: adviaResults.wbc_advia },
                { label: 'Retic (#/uL)', value: adviaResults.retic_advia },
              ]}
          />
          )}

          {/* Lorrca Card */}
          {lorcaResults && (
          <AssayCard
              title="LORRCA Oxychip"
              date={lorcaResults.date_lorrca ? new Date(lorcaResults.date_lorrca) : null}
              icon={faFlask}
              qcStatus={lorcaResults.qc_pass_lorrca}
              qcNotes={lorcaResults.qc_notes_lorrca}
            data={[
                { label: 'EI Min', value: lorcaResults.ei_min_lorrca },
                { label: 'EI Max', value: lorcaResults.ei_max_lorrca },
                { label: 'EI Delta', value: lorcaResults.ei_delta_lorrca },
                { label: 'POS', value: lorcaResults.pos_lorrca },
                { label: 'Instrument', value: lorcaResults.instrument_lorrca },
              ]}
            />
          )}

          {/* Viscosity Card */}
          {sample.results_viscosityInLaboratories?.[0] && (() => {
            const viscResults = sample.results_viscosityInLaboratories[0];
            return (
              <AssayCard
                title="Viscosity & HVR"
                date={viscResults.date_analysis ? new Date(viscResults.date_analysis) : null}
                icon={faFlask} 
                qcStatus={viscResults.qc_pass}
                qcNotes={viscResults.qc_notes}
                data={[
                  { label: 'Visc @ 45 s-1 (cP)', value: viscResults.visc_45 },
                  { label: 'Visc @ 225 s-1 (cP)', value: viscResults.visc_225 },
                  { label: 'HVR @ 45 s-1', value: viscResults.hvr_45 },
                  { label: 'HVR @ 225 s-1', value: viscResults.hvr_225 },
                ]}
              />
            );
          })()}

          {/* F-Cells Card */}
          {sample.results_fcellsInLaboratories?.[0] && (() => {
            const fcellResults = sample.results_fcellsInLaboratories[0];
            return (
          <AssayCard
            title="F-Cells"
                date={fcellResults.date_f_cells ? new Date(fcellResults.date_f_cells) : null}
                icon={faMicroscope}
                qcStatus={fcellResults.qc_pass_f_cells}
                qcNotes={fcellResults.qc_notes_f_cells}
            data={[
                  { label: '% F-Cells', value: fcellResults.percent_f_cells },
                  { label: 'Stain', value: fcellResults.stain_f_cells },
                  { label: 'Cytometer', value: fcellResults.cytometer_f_cells },
                ]}
              />
            );
          })()}
          
          {/* Adhesion Card */}
          {sample.results_adhesionInLaboratories?.[0] && (() => {
            const adhesionResults = sample.results_adhesionInLaboratories[0];
            return (
          <AssayCard
                title="Adhesion Assay"
                date={adhesionResults.date_adhesion ? new Date(adhesionResults.date_adhesion) : null}
                icon={faVial}
                qcStatus={adhesionResults.qc_pass_adhesion}
                qcNotes={adhesionResults.qc_notes_adhesion}
            data={[
                  { label: 'Cells Adhered', value: adhesionResults.cells_adhered_adhesion },
                ]}
              />
            );
          })()}

        </div>
      </div>
    </div>
  )
} 
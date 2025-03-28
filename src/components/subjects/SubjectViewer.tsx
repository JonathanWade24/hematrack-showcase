'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import SamplesTable from '../dashboard/SamplesTable'
import { OmicsCharts } from './OmicsCharts'
import { PHIMask } from '../ui/phi-mask'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

export interface Patient {
  id: string
  mrn: string
  first_name: string
  last_name: string
  dob: string
  // ... other patient fields ...
}

export interface OmicsResult {
  id: string
  subject_id: string
  sample_id: string
  date_of_collection: Date | string | null
  collection_date?: string
  genotype?: string | null
  qc_pass_advia?: string | null
  qc_pass_lorrca?: string | null
  qc_pass_dna?: string | null
  concentration_1_dna?: number | null
  cell_number_1_pbmc?: number | null
  vol_plasma_1?: number | null
  rbc_advia?: number | null
  hb_advia?: number | null
  hct_advia?: number | null
  mcv_advia?: number | null
  mch_advia?: number | null
  mchc_advia?: number | null
  rdw_advia?: number | null
  plt_advia?: number | null
  wbc_advia?: number | null
  qc_notes_advia?: string | null
  qc_notes_lorrca?: string | null
  qc_notes_dna?: string | null
  ei_min_lorrca?: number | null
  ei_max_lorrca?: number | null
  ei_delta_lorrca?: number | null
  processing_status?: 'Complete' | 'Partial' | 'Pending'
  qc_status?: 'Passed' | 'Failed' | 'Review'
  qc_notes?: string | null
  // Allow other properties with string | number | null | undefined values
  [key: string]: string | number | null | undefined | Date
}

export interface Subject {
  id: string
  subject_id: string
  created_at: string
  patient_mrn?: string | null
  omics_results?: OmicsResult[]
  patients?: Patient | null  // Make patients optional and nullable
}

interface SubjectViewerProps {
  subject: Subject
}

export function SubjectViewer({ subject }: SubjectViewerProps) {
  // Defensive check for missing fields
  if (!subject.omics_results) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subject Details</h1>
            <p className="mt-2 text-sm text-gray-600">
              Subject {subject.subject_id} has no sample results
            </p>
          </div>
          
          {/* Basic Subject Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FontAwesomeIcon icon={faUser} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Subject ID</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subject.subject_id}
                </p>
              </div>
            </div>
          </div>
          
          {/* Patient Details if available */}
          {subject.patients && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800">Patient Information</h3>
              </div>
              <div className="px-6 py-4">
                <p>Patient information is available but no sample data found.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Original component logic...
  // commented out as variables below are not currently used in this component
  /*
  const omicsResults = subject.omics_results;
  
  // Process samples - commented out as it's not used in the current component
  /*
  const samples = omicsResults.map(sample => {
  */

  const formatName = (patient?: Patient | null) => {
    if (!patient) return "Patient data unavailable";
    return `${patient.first_name} ${patient.last_name}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subject Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-1">
                <div className="text-sm font-medium">Subject ID</div>
                <div>{subject.subject_id}</div>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="text-sm font-medium">Patient Name</div>
                <div>
                  {subject.patients ? (
                    <PHIMask>
                      {formatName(subject.patients)}
                    </PHIMask>
                  ) : (
                    <span className="text-muted-foreground italic">
                      Not available for your role
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="text-sm font-medium">Patient MRN</div>
                <div>
                  {subject.patients ? (
                    <PHIMask type="mrn" value={subject.patients.mrn} />
                  ) : (
                    <span className="text-muted-foreground italic">
                      Not available for your role
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="text-sm font-medium">Date of Birth</div>
                <div>
                  {subject.patients ? (
                    <PHIMask type="birth_date" value={subject.patients.dob} />
                  ) : (
                    <span className="text-muted-foreground italic">
                      Not available for your role
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Sample Results</h2>
        {!subject.omics_results || subject.omics_results.length === 0 ? (
          <div className="p-4 border rounded-lg">
            <p className="text-center text-muted-foreground">
              No sample results available for this subject.
            </p>
          </div>
        ) : (
          <SamplesTable 
            samples={subject.omics_results.map(result => ({
              sample_id: result.sample_id,
              subject_id: result.subject_id,
              date_of_collection: result.date_of_collection instanceof Date 
                ? result.date_of_collection.toISOString() 
                : result.date_of_collection,
              genotype: result.genotype || null,
              processing_status: result.processing_status || 'Pending',
              qc_status: result.qc_status || 'Review'
            }))} 
          />
        )}
      </div>
      
      {/* Omics Charts if samples exist */}
      {subject.omics_results && subject.omics_results.length > 0 && (
        <OmicsCharts samples={subject.omics_results} />
      )}
    </div>
  )
} 
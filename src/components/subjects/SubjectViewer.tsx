'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faVial, faCalendar, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
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
  [key: string]: any // Allow additional properties
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
  const omicsResults = subject.omics_results;
  
  // Process samples to include processing and QC status
  const samples = omicsResults.map(sample => {
    // Check if ADVIA has any non-zero values
    const hasValidAdvia = [
      sample.rbc_advia,
      sample.hb_advia,
      sample.hct_advia,
      sample.mcv_advia,
      sample.mch_advia,
      sample.mchc_advia,
      sample.rdw_advia,
      sample.plt_advia,
      sample.wbc_advia
    ].some(value => value !== null && value !== 0)

    // Check other components for non-zero values
    const hasValidDNA = sample.concentration_1_dna !== null && sample.concentration_1_dna !== 0
    const hasValidPBMC = sample.cell_number_1_pbmc !== null && sample.cell_number_1_pbmc !== 0
    const hasValidPlasma = sample.vol_plasma_1 !== null && sample.vol_plasma_1 !== 0

    // Determine processing status
    let processing_status: 'Complete' | 'Partial' | 'Pending'
    if (!hasValidAdvia) {
      processing_status = 'Pending'
    } else if (hasValidDNA && hasValidPBMC && hasValidPlasma) {
      processing_status = 'Complete'
    } else {
      processing_status = 'Partial'
    }

    // Parse QC notes for detailed failure reasons
    const parseQCNotes = (status: string | null, notes: string | null) => {
      if (status !== 'No') return null
      return notes ? notes.split(',').map(note => note.trim()) : []
    }

    // Get specific QC failure reasons
    const adviaFailures = parseQCNotes(sample.qc_pass_advia, sample.qc_notes_advia)
    const lorrcaFailures = parseQCNotes(sample.qc_pass_lorrca, sample.qc_notes_lorrca)
    const dnaFailures = parseQCNotes(sample.qc_pass_dna, sample.qc_notes_dna)

    // Determine QC status with specific failure reasons
    let qc_status: 'Passed' | 'Failed' | 'Review'
    const qc_notes: string[] = []

    if (sample.qc_pass_advia === 'No') {
      qc_status = 'Failed'
      if (adviaFailures) qc_notes.push(...adviaFailures)
    } else if (sample.qc_pass_lorrca === 'No') {
      qc_status = 'Failed'
      if (lorrcaFailures) qc_notes.push(...lorrcaFailures.map(note => `Lorrca: ${note}`))
    } else if (sample.qc_pass_dna === 'No') {
      qc_status = 'Failed'
      if (dnaFailures) qc_notes.push(...dnaFailures.map(note => `DNA: ${note}`))
    } else if (sample.qc_pass_advia === 'Review' || sample.qc_pass_lorrca === 'Review' || sample.qc_pass_dna === 'Review') {
      qc_status = 'Review'
    } else {
      qc_status = 'Passed'
    }

    return {
      ...sample,
      processing_status,
      qc_status,
      qc_notes: qc_notes.length > 0 ? qc_notes.join(', ') : null,
      // Ensure date is properly formatted for the table
      date_of_collection: sample.date_of_collection ? 
        (typeof sample.date_of_collection === 'string' ? 
          sample.date_of_collection : 
          sample.date_of_collection.toISOString()
        ) : null
    }
  })

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not available'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

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
          <SamplesTable samples={subject.omics_results} />
        )}
      </div>
      
      {/* Omics Charts if samples exist */}
      {subject.omics_results && subject.omics_results.length > 0 && (
        <OmicsCharts samples={subject.omics_results} />
      )}
    </div>
  )
} 
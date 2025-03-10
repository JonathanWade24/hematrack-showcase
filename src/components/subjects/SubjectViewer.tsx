'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faVial, faCalendar, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { SamplesTable } from '../dashboard/SamplesTable'
import { OmicsCharts } from './OmicsCharts'
import { PHIMask } from '../ui/phi-mask'

interface Patient {
  first_name: string | null
  last_name: string | null
  birth_date: Date | null
  sex: string | null
  race: string | null
  ethnicity: string | null
}

interface OmicsResult {
  sample_id: string
  subject_id: string
  date_of_collection: Date | null
  genotype: string | null
  qc_pass_advia: string | null
  qc_pass_lorrca: string | null
  qc_pass_dna: string | null
  concentration_1_dna: number | null
  cell_number_1_pbmc: number | null
  vol_plasma_1: number | null
  rbc_advia: number | null
  hb_advia: number | null
  hct_advia: number | null
  mcv_advia: number | null
  mch_advia: number | null
  mchc_advia: number | null
  rdw_advia: number | null
  plt_advia: number | null
  wbc_advia: number | null
  qc_notes_advia: string | null
  qc_notes_lorrca: string | null
  qc_notes_dna: string | null
}

interface Subject {
  subject_id: string
  patient_mrn: string
  project: string
  patients: Patient
  omics_results: OmicsResult[]
}

interface SubjectViewerProps {
  subject: Subject
}

export function SubjectViewer({ subject }: SubjectViewerProps) {
  // Process samples to include processing and QC status
  const samples = subject.omics_results.map(sample => {
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
      date_of_collection: sample.date_of_collection ? sample.date_of_collection.toISOString() : null
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

  const formatName = (patient: Patient) => {
    if (!patient.first_name && !patient.last_name) return 'Not available'
    return [patient.first_name, patient.last_name].filter(Boolean).join(' ')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subject Details</h1>
          <p className="mt-2 text-sm text-gray-600">
            View detailed information and samples for subject {subject.subject_id}
          </p>
        </div>

        {/* Subject Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Basic Info */}
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

          {/* Sample Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <FontAwesomeIcon icon={faVial} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Samples</p>
                <p className="text-lg font-semibold text-gray-900">{samples.length}</p>
              </div>
            </div>
          </div>

          {/* Latest Collection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FontAwesomeIcon icon={faCalendar} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Latest Collection</p>
                <p className="text-lg font-semibold text-gray-900">
                  {samples[0]?.date_of_collection ? (
                    new Date(samples[0].date_of_collection).toLocaleDateString()
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FontAwesomeIcon icon={faInfoCircle} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Demographics</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subject.patients.sex || 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Patient Information</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <PHIMask
                    type="name"
                    value={`${subject.patients.first_name || ''} ${subject.patients.last_name || ''}`.trim() || 'Not available'}
                    showPartial={false}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Birth Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <PHIMask
                    type="birth_date"
                    value={subject.patients.birth_date || 'Not available'}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Race/Ethnicity</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <PHIMask type="race" value={subject.patients.race || 'Not available'} />{' - '}
                  <PHIMask type="ethnicity" value={subject.patients.ethnicity || 'Not available'} />
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* OMICs Charts */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Laboratory Trends</h3>
          </div>
          <div className="px-6 py-4">
            <OmicsCharts samples={subject.omics_results} />
          </div>
        </div>

        {/* Samples Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Sample History</h3>
          </div>
          <div className="overflow-x-auto">
            <SamplesTable samples={samples} />
          </div>
        </div>
      </div>
    </div>
  )
} 
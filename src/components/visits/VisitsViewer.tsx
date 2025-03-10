'use client'

import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendar, faStethoscope, faPills, faChartLine } from '@fortawesome/free-solid-svg-icons'
import { format } from 'date-fns'
import Timeline from '@/components/ui/timeline'
import { useRouter } from 'next/navigation'
import { ClinicalLabCharts } from './ClinicalLabCharts'

export interface Visit {
  id: string
  visit_id: string
  visit_type: string
  start_date: Date
  end_date: Date | null
  department: string | null
  icu_admission_yn: boolean | null
  vitals: {
    bp_systolic: number | null
    bp_diastolic: number | null
    weight_kg: number | null
    weight_lbs: number | null
  }
  diagnoses: {
    code: string
    description: string
  }[]
  medications: {
    name: string
    dosage?: string
    unit?: string
    frequency?: string
    status?: string
    taken_time?: string
  }[]
  labs: {
    name: string
    value: string
    unit: string
    reference_range?: string
    date: Date
  }[]
  omics_samples?: {
    sample_id: string
    date_of_collection: Date
    sample_type: string
    genotype: string | null
    steady_state: string | null
    transfusion_status: string | null
    lab_values: {
      hb: number | null
      hct: number | null
      wbc: number | null
      plt: number | null
      f_cells: number | null
    }
  }[]
}

interface VisitsViewerProps {
  visits: Visit[]
  patientInfo: {
    first_name: string | null
    last_name: string | null
    birth_date: Date | null
    sex: string | null
    race: string | null
    ethnicity: string | null
  }
}

export function VisitsViewer({ visits, patientInfo }: VisitsViewerProps) {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(visits[0] || null)
  const router = useRouter()

  // Collect all lab results across visits
  const allLabResults = useMemo(() => {
    console.log('Processing visits for lab results:', visits)
    const results = visits.flatMap(visit => visit.labs.map(lab => {
      // Extract unit from lab name if it's in parentheses
      const match = lab.name.match(/.*\((.*?)\)/)
      const extractedUnit = match ? match[1] : lab.unit

      return {
        ...lab,
        name: lab.name.replace(/\s*\([^)]*\)/, '').trim(), // Remove unit from name if present
        value: String(lab.value ?? ''), // Ensure value is a string
        unit: extractedUnit || lab.unit || '', // Use extracted unit, fallback to lab.unit
        date: new Date(lab.date) // Ensure date is a Date object
      }
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    console.log('Processed lab results:', results)
    return results
  }, [visits])

  const formatName = (info: typeof patientInfo) => {
    if (!info.first_name && !info.last_name) return 'Not available'
    return [info.first_name, info.last_name].filter(Boolean).join(' ')
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not available'
    return format(date, 'MMM d, yyyy')
  }

  // Create timeline events from visits
  const timelineEvents = visits.flatMap(visit => {
    const visitEvent = {
      id: visit.id,
      title: visit.visit_type === 'IP' ? 'Inpatient Stay' : 'Outpatient Visit',
      date: visit.start_date,
      endDate: visit.end_date,
      department: visit.department,
      type: visit.visit_type,
      isICU: visit.icu_admission_yn,
      diagnoses: visit.diagnoses,
      onClick: () => setSelectedVisit(visit)
    }

    // Create events for OMICs samples
    const sampleEvents = (visit.omics_samples || []).map(sample => ({
      id: sample.sample_id,
      title: 'OMICs Sample Collection',
      date: sample.date_of_collection,
      type: 'SAMPLE',
      isOmicsSample: true,
      sampleType: sample.sample_type,
      sampleData: {
        sample_id: sample.sample_id,
        genotype: sample.genotype,
        steady_state: sample.steady_state,
        transfusion_status: sample.transfusion_status,
        lab_values: sample.lab_values
      },
      onClick: () => router.push(`/samples/${sample.sample_id}`)
    }))

    return [visitEvent, ...sampleEvents]
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Information Card */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Patient Information</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatName(patientInfo)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Birth Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(patientInfo.birth_date)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Race/Ethnicity</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {patientInfo.race && patientInfo.ethnicity
                    ? `${patientInfo.race} - ${patientInfo.ethnicity}`
                    : 'Not available'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Visit Timeline</h3>
          </div>
          <div className="px-6 py-4">
            <Timeline events={timelineEvents} />
          </div>
        </div>

        {/* Selected Visit Details */}
        {selectedVisit && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">
                Visit Details - {selectedVisit.visit_type === 'IP' ? 'Inpatient Stay' : 'Outpatient Visit'}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {format(selectedVisit.start_date, 'MMM d, yyyy')}
                {selectedVisit.end_date && ` - ${format(selectedVisit.end_date, 'MMM d, yyyy')}`}
              </p>
            </div>
            
            <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vitals Section */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faChartLine} className="text-blue-500 mr-2" />
                  <h4 className="text-lg font-medium">Vitals</h4>
                </div>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Blood Pressure</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedVisit.vitals.bp_systolic && selectedVisit.vitals.bp_diastolic
                        ? `${selectedVisit.vitals.bp_systolic}/${selectedVisit.vitals.bp_diastolic}`
                        : 'Not recorded'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Weight</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedVisit.vitals.weight_kg
                        ? `${selectedVisit.vitals.weight_kg.toFixed(1)} kg (${selectedVisit.vitals.weight_lbs?.toFixed(1)} lbs)`
                        : 'Not recorded'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Diagnoses Section */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faStethoscope} className="text-green-500 mr-2" />
                  <h4 className="text-lg font-medium">Diagnoses</h4>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  {selectedVisit.diagnoses.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedVisit.diagnoses.map((diagnosis, index) => (
                        <li key={index} className="text-sm">
                          <div className="font-medium text-gray-900">{diagnosis.description}</div>
                          <div className="text-gray-500 text-xs">ICD Code: {diagnosis.code}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No diagnoses recorded</p>
                  )}
                </div>
              </div>

              {/* Medications Section */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faPills} className="text-red-500 mr-2" />
                  <h4 className="text-lg font-medium">Medications</h4>
                </div>
                {selectedVisit.medications && selectedVisit.medications.length > 0 ? (
                  <ul className="space-y-4">
                    {selectedVisit.medications.map((medication, index) => (
                      <li key={index} className="text-sm bg-white rounded-lg shadow p-4">
                        <div className="font-medium text-base text-gray-900">{medication.name}</div>
                        {medication.dosage && (
                          <div className="mt-1 text-gray-600">
                            <span className="font-medium">Dose:</span> {medication.dosage} {medication.unit}
                          </div>
                        )}
                        {medication.frequency && (
                          <div className="text-gray-600">
                            <span className="font-medium">Frequency:</span> {medication.frequency}
                          </div>
                        )}
                        {medication.taken_time && (
                          <div className="text-gray-500 text-xs mt-1">
                            Taken: {format(new Date(medication.taken_time), 'MMM d, yyyy h:mm a')}
                          </div>
                        )}
                        {medication.status && (
                          <div className="text-gray-500 text-xs mt-1">
                            Status: {medication.status}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 bg-white rounded-lg shadow p-4">No medications recorded for this visit</p>
                )}
              </div>

              {/* Labs Section */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faCalendar} className="text-purple-500 mr-2" />
                  <h4 className="text-lg font-medium">Laboratory Results</h4>
                </div>

                {/* Lab Trends Charts */}
                <div className="mb-6">
                  {allLabResults && allLabResults.length > 0 ? (
                    <ClinicalLabCharts labs={allLabResults} />
                  ) : (
                    <p className="text-sm text-gray-500 bg-white rounded-lg shadow p-4">No lab results available to display in charts</p>
                  )}
                </div>

                {/* Lab Results Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h5 className="text-sm font-medium text-gray-800">Visit-Specific Lab Results</h5>
                  </div>
                  <div className="overflow-x-auto">
                    {selectedVisit.labs && selectedVisit.labs.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Test</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedVisit.labs.map((lab, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900">{lab.name}</td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {lab.value} {lab.unit}
                                {lab.reference_range && (
                                  <span className="text-gray-500 text-xs ml-1">({lab.reference_range})</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {format(lab.date, 'MMM d, yyyy')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-gray-500 p-4">No lab results recorded for this visit</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
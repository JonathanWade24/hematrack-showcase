'use client'

import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendar, faStethoscope, faPills, faChartLine } from '@fortawesome/free-solid-svg-icons'
import { format } from 'date-fns'
import Timeline from '@/components/ui/Timeline'
import { useRouter } from 'next/navigation'
import { ClinicalLabCharts } from './ClinicalLabCharts'

// Import needed types from Timeline.tsx indirectly
// Use the interface from Timeline directly in our code
interface TimelineEvent {
  id: string
  title: string
  date: Date
  endDate?: Date | null
  department?: string | null
  type: string
  isICU?: boolean | null
  isOmicsSample?: boolean
  sampleType?: string
  sampleData?: {
    sample_id: string
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
  }
  diagnoses?: {
    code: string
    description: string
  }[]
  onClick?: () => void
}

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
    time?: string
    test?: string
  }[]
  samples?: {
    sample_id: string
    subject_id: string
    collection_date: string
    rbc?: number | null
    hb?: number | null
    hct?: number | null
    mcv?: number | null
    rdw?: number | null
    plt?: number | null
    wbc?: number | null
  }[]
}

interface Patient {
  first_name: string | null
  last_name: string | null
  birth_date: Date | null
  sex: string | null
  race: string | null
  ethnicity: string | null
}

interface VisitsViewerProps {
  patientMrn: string
  data: {
    patient: Patient | null
    visits: Visit[]
  }
}

export function VisitsViewer({ patientMrn, data }: VisitsViewerProps) {
  const router = useRouter()
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null)
  
  // Use useMemo for visits to ensure stable reference
  const visits = useMemo(() => data.visits || [], [data.visits])
  
  const patientInfo = useMemo(() => data.patient || {
    first_name: 'Unknown',
    last_name: 'Patient',
    birth_date: null,
    sex: null,
    race: null,
    ethnicity: null
  }, [data.patient])

  const currentVisit = activeVisit || (visits.length > 0 ? visits[0] : null)

  // Collect all lab results across visits
  const allLabResults = useMemo(() => {
    const results: Record<string, { values: number[], dates: Date[] }> = {}
    
    visits.forEach(visit => {
      visit.labs.forEach(lab => {
        const value = parseFloat(lab.value)
        if (!isNaN(value) && lab.name) {
          if (!results[lab.name]) {
            results[lab.name] = { values: [], dates: [] }
          }
          results[lab.name].values.push(value)
          results[lab.name].dates.push(lab.time ? new Date(lab.time) : new Date())
        }
      })
    })
    
    return results
  }, [visits])
  
  // Collect all OMICs results across visits
  const allOmicsResults = useMemo(() => {
    const results: Record<string, { values: number[], dates: Date[] }> = {
      'Hemoglobin': { values: [], dates: [] },
      'Hematocrit': { values: [], dates: [] },
      'WBC': { values: [], dates: [] },
      'Platelets': { values: [], dates: [] }
    }
    
    visits.forEach(visit => {
      (visit.samples || []).forEach(sample => {
        const date = new Date(sample.collection_date)
        
        if (sample.hb !== null && sample.hb !== undefined) {
          results['Hemoglobin'].values.push(sample.hb)
          results['Hemoglobin'].dates.push(date)
        }
        
        if (sample.hct !== null && sample.hct !== undefined) {
          results['Hematocrit'].values.push(sample.hct)
          results['Hematocrit'].dates.push(date)
        }
        
        if (sample.wbc !== null && sample.wbc !== undefined) {
          results['WBC'].values.push(sample.wbc)
          results['WBC'].dates.push(date)
        }
        
        if (sample.plt !== null && sample.plt !== undefined) {
          results['Platelets'].values.push(sample.plt)
          results['Platelets'].dates.push(date)
        }
      })
    })
    
    return results
  }, [visits])
  
  // Generate timeline events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = []
    
    // Create events for visits
    visits.forEach(visit => {
      events.push({
        id: visit.id,
        title: visit.visit_type === 'IP' ? 'Inpatient Admission' : 'Outpatient Visit',
        date: visit.start_date,
        endDate: visit.end_date,
        department: visit.department,
        type: visit.visit_type,
        isICU: visit.icu_admission_yn,
        diagnoses: visit.diagnoses,
        onClick: () => setActiveVisit(visit)
      })
      
      // Create events for OMICs samples
      const sampleEvents = (visit.samples || []).map(sample => ({
        id: sample.sample_id,
        title: 'OMICs Sample Collection',
        date: new Date(sample.collection_date),
        type: 'SAMPLE',
        isOmicsSample: true,
        sampleType: sample.subject_id,
        sampleData: {
          sample_id: sample.sample_id,
          genotype: null,
          steady_state: null,
          transfusion_status: null,
          lab_values: {
            hb: sample.hb ?? null,
            hct: sample.hct ?? null,
            wbc: sample.wbc ?? null,
            plt: sample.plt ?? null,
            f_cells: null
          }
        },
        onClick: () => router.push(`/samples/${sample.sample_id}`)
      }))
      
      events.push(...sampleEvents)
    })
    
    return events.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [visits, router])
  
  const formatName = (info: typeof patientInfo) => {
    if (!info.first_name && !info.last_name) return 'Unknown Patient'
    return `${info.first_name || ''} ${info.last_name || ''}`.trim()
  }
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown'
    return format(date, 'MMM d, yyyy')
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Patient Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{formatName(patientInfo)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">MRN</p>
                <p className="font-medium">{patientMrn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{formatDate(patientInfo.birth_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sex</p>
                <p className="font-medium">{patientInfo.sex || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Race</p>
                <p className="font-medium">{patientInfo.race || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ethnicity</p>
                <p className="font-medium">{patientInfo.ethnicity || 'Unknown'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Visit Timeline</h2>
            <Timeline events={timelineEvents} />
          </div>
        </div>
        
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Patient Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faCalendar} className="text-blue-500 text-2xl mb-2" />
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-xl font-bold">{visits.length}</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faStethoscope} className="text-green-500 text-2xl mb-2" />
                <p className="text-sm text-gray-500">Diagnoses</p>
                <p className="text-xl font-bold">
                  {new Set(visits.flatMap(v => v.diagnoses.map(d => d.code))).size}
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faPills} className="text-purple-500 text-2xl mb-2" />
                <p className="text-sm text-gray-500">Medications</p>
                <p className="text-xl font-bold">
                  {new Set(visits.flatMap(v => v.medications.map(m => m.name))).size}
                </p>
              </div>
            </div>
          </div>

          {/* Selected Visit Details */}
          {currentVisit && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800">
                  Visit Details - {currentVisit.visit_type === 'IP' ? 'Inpatient Stay' : 'Outpatient Visit'}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {format(currentVisit.start_date, 'MMM d, yyyy')}
                  {currentVisit.end_date && ` - ${format(currentVisit.end_date, 'MMM d, yyyy')}`}
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">Visit Info</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Department</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {currentVisit.department || 'Not specified'}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">ICU Admission</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {currentVisit.icu_admission_yn ? 'Yes' : 'No'}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Blood Pressure</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {currentVisit.vitals.bp_systolic && currentVisit.vitals.bp_diastolic
                            ? `${currentVisit.vitals.bp_systolic}/${currentVisit.vitals.bp_diastolic}`
                            : 'Not recorded'}
                        </dd>
                      </div>
                      
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Weight</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {currentVisit.vitals.weight_kg
                            ? `${currentVisit.vitals.weight_kg.toFixed(1)} kg (${currentVisit.vitals.weight_lbs?.toFixed(1)} lbs)`
                            : 'Not recorded'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-4">
                    {currentVisit.diagnoses.length > 0 ? (
                      <ul className="space-y-2">
                        {currentVisit.diagnoses.map((diagnosis, index) => (
                          <li key={index} className="text-sm">
                            <div className="font-medium text-gray-900">{diagnosis.description}</div>
                            <div className="text-xs text-gray-500">{diagnosis.code}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No diagnoses recorded
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <FontAwesomeIcon icon={faPills} className="text-gray-400 mr-2" />
                    <h4 className="text-lg font-medium">Medications</h4>
                  </div>
                  {currentVisit.medications && currentVisit.medications.length > 0 ? (
                    <ul className="space-y-4">
                      {currentVisit.medications.map((medication, index) => (
                        <li key={index} className="text-sm bg-white rounded-lg shadow p-4">
                          <div className="font-medium text-base text-gray-900">{medication.name}</div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-500">
                            {medication.dosage && (
                              <div>
                                <span className="font-medium">Dosage:</span> {medication.dosage} {medication.unit || ''}
                              </div>
                            )}
                            {medication.frequency && (
                              <div>
                                <span className="font-medium">Frequency:</span> {medication.frequency}
                              </div>
                            )}
                            {medication.status && (
                              <div>
                                <span className="font-medium">Status:</span> {medication.status}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-4 text-gray-500 bg-white rounded-lg shadow">
                      No medications recorded
                    </div>
                  )}
                </div>
                
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <FontAwesomeIcon icon={faChartLine} className="text-gray-400 mr-2" />
                    <h4 className="text-lg font-medium">Laboratory Results</h4>
                  </div>
                  <div className="overflow-x-auto">
                    {currentVisit.labs && currentVisit.labs.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Test Name
                            </th>
                            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Result
                            </th>
                            <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date/Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {currentVisit.labs.map((lab, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900">{lab.name}</td>
                              <td className="px-3 py-2 text-sm text-gray-900">{lab.value}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">{lab.time || 'Unknown'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-4 text-gray-500 bg-white rounded-lg shadow">
                        No lab results recorded
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Lab Value Trends */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Laboratory Trends</h3>
            </div>
            <div className="p-6">
              <ClinicalLabCharts labResults={allLabResults} omicsResults={allOmicsResults} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { format } from 'date-fns'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHospital, faUserDoctor, faHeartPulse, faVial } from '@fortawesome/free-solid-svg-icons'
import { useRef } from 'react'

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

interface TimelineProps {
  events: TimelineEvent[]
}

export function Timeline({ events }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)

  const getEventIcon = (event: TimelineEvent) => {
    if (event.isOmicsSample) {
      return faVial
    }
    if (event.type === 'IP') {
      return event.isICU ? faHeartPulse : faHospital
    }
    return faUserDoctor
  }

  const getEventIconColor = (event: TimelineEvent) => {
    if (event.isOmicsSample) {
      return 'text-purple-500'
    }
    if (event.type === 'IP') {
      return event.isICU ? 'text-yellow-500' : 'text-red-500'
    }
    return 'text-blue-500'
  }

  const handleEventClick = (event: TimelineEvent) => {
    if (event.onClick) {
      event.onClick()
    }
  }

  return (
    <div className="relative" ref={timelineRef}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

      {/* Events */}
      <div className="space-y-8 relative">
        {events.map(event => (
          <div
            key={event.id}
            className="relative pl-12 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
            onClick={() => handleEventClick(event)}
          >
            {/* Event dot */}
            <div className="absolute left-2.5 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-4 border-white shadow"></div>

            {/* Event content */}
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <FontAwesomeIcon
                  icon={getEventIcon(event)}
                  className={getEventIconColor(event)}
                  size="lg"
                />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                    {event.isICU && (
                      <span className="text-xs text-yellow-600 font-medium">ICU Admission</span>
                    )}
                    {event.isOmicsSample && (
                      <span className="text-xs text-purple-600 font-medium">
                        {event.sampleType} Sample Collection
                      </span>
                    )}
                  </div>
                  <time className="text-sm text-gray-500">
                    {format(event.date, 'MMM d, yyyy')}
                    {event.endDate && ` - ${format(event.endDate, 'MMM d, yyyy')}`}
                  </time>
                </div>
                {event.department && (
                  <p className="mt-1 text-sm text-gray-600">{event.department}</p>
                )}
                {event.diagnoses && event.diagnoses.length > 0 && !event.isOmicsSample && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500">Diagnoses:</p>
                    <ul className="mt-1 space-y-1">
                      {event.diagnoses.slice(0, 2).map((diagnosis, idx) => (
                        <li key={idx} className="text-sm text-gray-600">
                          {diagnosis.code} - {diagnosis.description}
                        </li>
                      ))}
                      {event.diagnoses.length > 2 && (
                        <li className="text-sm text-gray-500">
                          +{event.diagnoses.length - 2} more diagnoses
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Timeline 
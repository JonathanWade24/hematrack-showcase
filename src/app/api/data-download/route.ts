import { NextResponse } from 'next/server'
import { prisma } from '@/db'
import type { FilterCriteria, GroupCriteria } from '@/components/data/DataDownload'
import { Prisma } from '@prisma/client'

type WhereClause = Prisma.omics_resultsWhereInput
type IncludeClause = Prisma.omics_resultsInclude

interface ProcessedData {
  [key: string]: string | number | boolean | Date | Prisma.Decimal | null
}

// Helper function to build where clause for a group
function buildGroupWhereClause(group: GroupCriteria): WhereClause {
  if (!group.conditions || group.conditions.length === 0) {
    return {}
  }
  
  return {
    AND: group.conditions.map(condition => {
      const [table, field] = condition.field.split('.')
      
      // Special handling for age field
      if (table === 'patients' && field === 'age') {
        return {
          omics_subjects: {
            patients: {
              demographics: {
                some: {
                  age: buildOperatorClause(field, condition)
                }
              }
            }
          }
        } as WhereClause
      }

      // Handle other patient fields
      if (table === 'patients') {
        return {
          omics_subjects: {
            patients: {
              [field]: buildOperatorClause(field, condition)
            }
          }
        } as WhereClause
      }

      // Handle direct fields on omics_results
      return {
        [field]: buildOperatorClause(field, condition)
      }
    })
  }
}

// Helper function to build operator clause
function buildOperatorClause(field: string, condition: GroupCriteria['conditions'][0]) {
  switch (condition.operator) {
    case 'equals':
      return condition.value
    case 'not_equals':
      return {
        not: condition.value
      }
    case 'greater_than':
      return {
        gt: condition.value
      }
    case 'less_than':
      return {
        lt: condition.value
      }
    case 'between':
      const [min, max] = condition.value as number[]
      return {
        gte: min,
        lte: max
      }
    case 'in':
      return {
        in: condition.value as string[]
      }
    default:
      return {}
  }
}

// Helper function to build include clause based on selected variables
function buildIncludeClause(variables: FilterCriteria['variables']): IncludeClause {
  const hasLabs = variables.clinical.labs.length > 0
  const hasMeds = variables.clinical.medications.length > 0
  const hasVitals = variables.clinical.vitals.length > 0

  return {
    omics_subjects: {
      include: {
        patients: hasLabs || hasMeds || hasVitals
          ? {
              include: {
                labs: hasLabs,
                op_medications: hasMeds,
                unified_visits: hasVitals
              }
            }
          : true
      }
    }
  }
}

// Helper function to get clinical lab results within time window
async function getClinicalData(
  mrn: string,
  collectionDate: Date,
  timeWindow: FilterCriteria['timeWindow'],
  variables: FilterCriteria['variables']
) {
  const { start, end } = timeWindow.type === 'relative' 
    ? {
        start: new Date(collectionDate.getTime() - (timeWindow.relativeDays || 30) * 24 * 60 * 60 * 1000),
        end: new Date(collectionDate.getTime() + (timeWindow.relativeDays || 30) * 24 * 60 * 60 * 1000)
      }
    : {
        start: timeWindow.start!,
        end: timeWindow.end!
      }

  const clinicalData: ProcessedData = {}

  // Fetch lab results
  if (variables.clinical.labs.length > 0) {
    const labResults = await prisma.labs.findMany({
      where: {
        patient_mrn: mrn,
        result_time: {
          gte: start,
          lte: end
        },
        OR: variables.clinical.labs.map(lab => ({
          lab_component_description: {
            equals: lab.component_id,
            mode: 'insensitive'
          }
        }))
      },
      orderBy: {
        result_time: 'desc'
      }
    })

    // Group lab results by component
    variables.clinical.labs.forEach(lab => {
      const result = labResults.find(r => 
        r.lab_component_description?.toLowerCase() === lab.component_id.toLowerCase()
      )
      clinicalData[lab.name] = result?.lab_result_value || null
      clinicalData[`${lab.name}_date`] = result?.result_time || null
    })
  }

  // Fetch medications
  if (variables.clinical.medications.length > 0) {
    const medications = await prisma.op_medications.findMany({
      where: {
        patient_mrn: mrn,
        order_dttm: {
          gte: start,
          lte: end
        },
        OR: variables.clinical.medications.flatMap(med => 
          med.generic_description.map(term => ({
            generic_description: {
              contains: term,
              mode: 'insensitive'
            }
          }))
        )
      }
    })

    variables.clinical.medications.forEach(med => {
      const hasMatch = medications.some(m => 
        med.generic_description.some(term => 
          m.generic_description?.toLowerCase().includes(term.toLowerCase())
        )
      )
      clinicalData[med.name] = hasMatch
    })
  }

  // Fetch vitals
  if (variables.clinical.vitals.length > 0) {
    const visits = await prisma.unified_visits.findMany({
      where: {
        patient_mrn: mrn,
        start_date: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        start_date: 'desc'
      }
    })

    if (visits.length > 0) {
      const latestVisit = visits[0]
      variables.clinical.vitals.forEach(vitalName => {
        clinicalData[vitalName] = latestVisit[vitalName as keyof typeof latestVisit] || null
      })
    }
  }

  return clinicalData
}

export async function POST(request: Request) {
  try {
    const filters = await request.json() as FilterCriteria
    
    // Process each group
    let results = []
    
    if (filters.groups && filters.groups.length > 0) {
      results = await Promise.all(filters.groups.map(async group => {
        const whereClause = buildGroupWhereClause(group)
        const includeClause = buildIncludeClause(filters.variables)

        try {
          const groupResults = await prisma.omics_results.findMany({
            where: whereClause,
            include: includeClause,
            take: 100 // Limit results for safety
          })
          
          // Process results
          const processedResults = await Promise.all(groupResults.map(async result => {
            const processedResult: ProcessedData = {
              group_name: group.name,
              sample_id: result.sample_id
            }

            // Add omics variables
            Object.entries(filters.variables.omics).forEach(([, variables]) => {
              variables.forEach(varName => {
                const value = result[varName as keyof typeof result]
                if (typeof value === 'string' || typeof value === 'number' || 
                    value instanceof Date || value === null || 
                    value instanceof Prisma.Decimal || typeof value === 'boolean') {
                  processedResult[varName] = value
                }
              })
            })

            // Add demographics variables
            filters.variables.demographics.forEach(varName => {
              const value = result[varName as keyof typeof result]
              if (typeof value === 'string' || typeof value === 'number' || 
                  value instanceof Date || value === null || 
                  value instanceof Prisma.Decimal || typeof value === 'boolean') {
                processedResult[varName] = value
              }
            })

            // Add clinical data
            if (result.omics_subjects?.patient_mrn && result.date_of_collection) {
              const clinicalData = await getClinicalData(
                result.omics_subjects.patient_mrn,
                result.date_of_collection,
                filters.timeWindow,
                filters.variables
              )
              Object.assign(processedResult, clinicalData)
            }

            return processedResult
          }))
          
          return processedResults
        } catch (error) {
          console.error(`Error processing group ${group.name}:`, error)
          return [] // Return empty array for this group
        }
      }))
    } else {
      // No groups defined, get recent samples
      try {
        const results = await prisma.omics_results.findMany({
          take: 100, // Limit results for safety
          orderBy: {
            date_of_collection: 'desc'
          },
          include: {
            omics_subjects: true
          }
        })
        
        // Process results
        const processedResults = await Promise.all(results.map(async result => {
          const processedResult: ProcessedData = {
            group_name: 'Recent Samples',
            sample_id: result.sample_id
          }

          // Add omics variables
          Object.entries(filters.variables.omics).forEach(([, variables]) => {
            variables.forEach(varName => {
              const value = result[varName as keyof typeof result]
              if (typeof value === 'string' || typeof value === 'number' || 
                  value instanceof Date || value === null || 
                  value instanceof Prisma.Decimal || typeof value === 'boolean') {
                processedResult[varName] = value
              }
            })
          })

          // Add demographics variables
          filters.variables.demographics.forEach(varName => {
            const value = result[varName as keyof typeof result]
            if (typeof value === 'string' || typeof value === 'number' || 
                value instanceof Date || value === null || 
                value instanceof Prisma.Decimal || typeof value === 'boolean') {
              processedResult[varName] = value
            }
          })

          // Add clinical data
          if (result.omics_subjects?.patient_mrn && result.date_of_collection) {
            const clinicalData = await getClinicalData(
              result.omics_subjects.patient_mrn,
              result.date_of_collection,
              filters.timeWindow,
              filters.variables
            )
            Object.assign(processedResult, clinicalData)
          }

          return processedResult
        }))
        
        return processedResults
      } catch (error) {
        console.error('Error fetching results:', error)
        return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
      }
    }
    
    // Flatten results and convert to CSV
    const flatResults = results.flat()
    if (flatResults.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 })
    }

    // Get all column names
    const columns = Array.from(new Set(flatResults.flatMap(r => Object.keys(r))))

    // Convert to CSV
    const csv = [
      columns.join(','),
      ...flatResults.map(row => 
        columns.map(col => {
          const value = row[col]
          if (value === null || value === undefined) return ''
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
          return value
        }).join(',')
      )
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="data.csv"'
      }
    })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/db'
import type { FilterCriteria } from '@/components/data/DataDownload'

export async function POST(request: Request) {
  try {
    const filters = await request.json() as FilterCriteria
    
    // Get a sample of omics results (limit to 10 for preview)
    const sampleSize = 10
    
    // Build a basic query to get sample data
    const omicsResults = await prisma.omics_results.findMany({
      take: sampleSize,
      orderBy: {
        date_of_collection: 'desc'
      },
      include: {
        omics_subjects: true
      }
    })
    
    if (omicsResults.length === 0) {
      return NextResponse.json({ 
        headers: ['No Data'],
        rows: [['No data available']]
      })
    }
    
    // Start building our result set
    const processedResults = []
    
    // Process each omics result
    for (const result of omicsResults) {
      const processedRow = {
        sample_id: result.sample_id,
        subject_id: result.subject_id,
        date_of_collection: result.date_of_collection,
        genotype: result.genotype
      }
      
      // Add omics variables
      Object.entries(filters.variables.omics).forEach(([category, variables]) => {
        variables.forEach(varName => {
          if (varName in result) {
            processedRow[varName] = result[varName as keyof typeof result]
          }
        })
      })
      
      // Add demographics variables
      filters.variables.demographics.forEach(varName => {
        if (varName in result) {
          processedRow[varName] = result[varName as keyof typeof result]
        }
      })
      
      // Add clinical data if we have a patient MRN
      if (result.omics_subjects?.patient_mrn && result.date_of_collection) {
        // For labs
        if (filters.variables.clinical.labs.length > 0) {
          try {
            // Get lab results for this patient within the time window
            const labResults = await prisma.labs.findMany({
              where: {
                patient_mrn: result.omics_subjects.patient_mrn,
                lab_component_description: {
                  in: filters.variables.clinical.labs.map(lab => lab.component_id)
                }
              },
              take: 1,
              orderBy: {
                result_time: 'desc'
              }
            })
            
            // Add lab results to the processed row
            filters.variables.clinical.labs.forEach(lab => {
              const labResult = labResults.find(r => 
                r.lab_component_description?.toLowerCase() === lab.component_id.toLowerCase()
              )
              processedRow[lab.name] = labResult?.lab_result_value || null
            })
          } catch (error) {
            console.error('Error fetching lab data:', error)
          }
        }
        
        // For medications (simplified)
        if (filters.variables.clinical.medications.length > 0) {
          try {
            // Get medication data for this patient
            const medications = await prisma.op_medications.findMany({
              where: {
                patient_mrn: result.omics_subjects.patient_mrn
              },
              take: 10
            })
            
            // Add medication data to the processed row
            filters.variables.clinical.medications.forEach(med => {
              const hasMed = medications.some(m => 
                m.generic_description && med.generic_description.some(term => 
                  m.generic_description.toLowerCase().includes(term.toLowerCase())
                )
              )
              processedRow[med.name] = hasMed ? 'Yes' : 'No'
            })
          } catch (error) {
            console.error('Error fetching medication data:', error)
          }
        }
      }
      
      processedResults.push(processedRow)
    }
    
    // Get all headers from all results
    const allHeaders = Array.from(
      new Set(
        processedResults.flatMap(result => Object.keys(result))
      )
    )
    
    // Convert objects to arrays in the order of headers
    const rowsAsArrays = processedResults.map(result => 
      allHeaders.map(header => 
        result[header] !== undefined ? result[header] : null
      )
    )
    
    return NextResponse.json({
      headers: allHeaders,
      rows: rowsAsArrays
    })
  } catch (error) {
    console.error('Error generating preview:', error)
    return NextResponse.json({ 
      headers: ['Error'],
      rows: [['Failed to generate preview: ' + (error instanceof Error ? error.message : 'Unknown error')]]
    })
  }
} 
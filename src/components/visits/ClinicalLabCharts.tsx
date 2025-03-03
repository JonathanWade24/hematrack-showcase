'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'

interface LabResult {
  name: string
  value: string
  unit: string
  reference_range?: string
  date: Date
}

interface ClinicalLabChartsProps {
  labs: LabResult[]
}

// Define lab categories and their components
const LAB_CATEGORIES = {
  CBC: [
    'Hemoglobin',
    'Hematocrit',
    'WBC',
    'Platelets',
    'MCV',
    'MCH',
    'MCHC',
    'RDW',
    'Neutrophils',
    'Lymphocytes',
    'Monocytes',
    'Eosinophils',
    'Basophils'
  ],
  CHEMISTRY: [
    'Sodium',
    'Potassium',
    'Chloride',
    'CO2',
    'BUN',
    'Creatinine',
    'Glucose',
    'Calcium',
    'Total Protein',
    'Albumin',
    'Total Bilirubin',
    'AST',
    'ALT',
    'Alkaline Phosphatase'
  ],
  IRON_STUDIES: [
    'Ferritin',
    'Iron',
    'TIBC',
    'Transferrin Saturation'
  ]
} as const

export function ClinicalLabCharts({ labs }: ClinicalLabChartsProps) {
  console.log('ClinicalLabCharts received labs:', labs)

  // Process and categorize lab data
  const categorizedData = useMemo(() => {
    const categories = new Map<string, Map<string, LabResult[]>>()
    
    // Initialize categories
    Object.entries(LAB_CATEGORIES).forEach(([category, tests]) => {
      categories.set(category, new Map())
      tests.forEach(test => {
        categories.get(category)!.set(test, [])
      })
    })

    // Categorize labs
    labs.forEach(lab => {
      console.log('Processing lab:', lab)
      for (const [category, tests] of Object.entries(LAB_CATEGORIES)) {
        const test = tests.find(t => lab.name.toLowerCase().includes(t.toLowerCase()))
        if (test) {
          console.log(`Found matching test '${test}' in category '${category}' for lab '${lab.name}'`)
          categories.get(category)!.get(test)!.push(lab)
          break
        }
      }
    })

    return categories
  }, [labs])

  // Convert lab value string to number, handling common unit conversions
  const parseLabValue = (value: string | null | undefined): number | null => {
    if (!value) return null
    
    // Handle non-string values
    if (typeof value !== 'string') {
      const num = Number(value)
      return isNaN(num) ? null : num
    }
    
    // Remove any non-numeric characters except decimal points and negative signs
    const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''))
    console.log('Parsed lab value:', { original: value, parsed: numericValue })
    return isNaN(numericValue) ? null : numericValue
  }

  // Create chart data for a category
  const createChartData = (categoryLabs: Map<string, LabResult[]>) => {
    const allDates = new Set<string>()
    const testData = new Map<string, Map<string, number>>()
    const testUnits = new Map<string, string>() // Store units for each test

    // Collect all dates and organize data by test and date
    categoryLabs.forEach((results, testName) => {
      if (results.length > 0) {
        console.log(`Processing test '${testName}' with ${results.length} results`)
        testData.set(testName, new Map())
        // Store the unit for this test
        testUnits.set(testName, results[0].unit)
        results.forEach(result => {
          if (!result.date) return // Skip if no date
          const dateStr = format(result.date, 'MMM d, yyyy')
          allDates.add(dateStr)
          const value = parseLabValue(result.value)
          if (value !== null) {
            testData.get(testName)!.set(dateStr, value)
          }
        })
      }
    })

    // Create the chart data array
    const chartData = Array.from(allDates).sort().map(date => {
      const dataPoint: Record<string, string | number> = { date }
      testData.forEach((dateValues, testName) => {
        if (dateValues.has(date)) {
          const unit = testUnits.get(testName) || ''
          const label = unit ? `${testName} (${unit})` : testName
          dataPoint[label] = dateValues.get(date)!
        }
      })
      return dataPoint
    })

    console.log('Created chart data:', chartData)
    return { chartData, testUnits }
  }

  return (
    <div className="space-y-8">
      {Array.from(categorizedData.entries()).map(([category, categoryLabs]) => {
        const { chartData, testUnits } = createChartData(categoryLabs)
        if (chartData.length === 0) return null

        console.log(`Rendering chart for category '${category}' with data:`, chartData)

        return (
          <div key={category} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-800">{category} Trends</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Array.from(categoryLabs.entries()).map(([testName, results], index) => {
                    if (results.length === 0) return null
                    const unit = testUnits.get(testName) || ''
                    const label = unit ? `${testName} (${unit})` : testName
                    return (
                      <Line
                        key={testName}
                        type="monotone"
                        dataKey={label}
                        stroke={`hsl(${index * 30}, 70%, 50%)`}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
} 
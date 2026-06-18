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

interface OmicsResult {
  date_of_collection: Date | string | null | undefined
  hb_advia?: number | null | undefined
  hct_advia?: number | null | undefined
  wbc_advia?: number | null | undefined
  plt_advia?: number | null | undefined
  mcv_advia?: number | null | undefined
  ei_min_lorrca?: number | null | undefined
  ei_max_lorrca?: number | null | undefined
  ei_delta_lorrca?: number | null | undefined
  [key: string]: Date | string | number | boolean | null | undefined
}

interface OmicsChartsProps {
  samples: OmicsResult[]
}

export function OmicsCharts({ samples }: OmicsChartsProps) {
  // Process data for charts
  const chartData = useMemo(() => {
    return samples
      .filter(sample => sample.date_of_collection)
      .sort((a, b) => {
        if (!a.date_of_collection || !b.date_of_collection) return 0
        const dateA = a.date_of_collection instanceof Date ? a.date_of_collection : new Date(a.date_of_collection)
        const dateB = b.date_of_collection instanceof Date ? b.date_of_collection : new Date(b.date_of_collection)
        return dateA.getTime() - dateB.getTime()
      })
      .map(sample => {
        const date = sample.date_of_collection instanceof Date 
          ? sample.date_of_collection 
          : new Date(sample.date_of_collection!)
        
        return {
          date: format(date, 'MMM d, yyyy'),
          'Hemoglobin (g/dL)': sample.hb_advia,
          'Hematocrit (%)': sample.hct_advia,
          'WBC (K/µL)': sample.wbc_advia,
          'Platelets (K/µL)': sample.plt_advia,
          'MCV (fL)': sample.mcv_advia,
          'EI Min': sample.ei_min_lorrca,
          'EI Max': sample.ei_max_lorrca,
          'EI Delta': sample.ei_delta_lorrca
        }
      })
  }, [samples])

  return (
    <div className="space-y-8">
      {/* Hemoglobin and Hematocrit Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Hemoglobin, Hematocrit, and MCV Trends</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={[0, 'auto']} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} />
              <YAxis yAxisId="mcv" orientation="right" domain={[0, 'auto']} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Hemoglobin (g/dL)"
                stroke="#8884d8"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Hematocrit (%)"
                stroke="#82ca9d"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="mcv"
                type="monotone"
                dataKey="MCV (fL)"
                stroke="#9c27b0"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* WBC and Platelets Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">WBC and Platelet Counts</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="WBC (K/µL)"
                stroke="#ffa726"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Platelets (K/µL)"
                stroke="#ef5350"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lorrca Values Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Lorrca Measurements</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="EI Min"
                stroke="#2196f3"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="EI Max"
                stroke="#4caf50"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="EI Delta"
                stroke="#ff9800"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
} 
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

interface LabResultsData {
  [key: string]: {
    values: number[]
    dates: Date[]
  }
}

interface ClinicalLabChartsProps {
  labResults: LabResultsData
  omicsResults: LabResultsData
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

export function ClinicalLabCharts({ labResults, omicsResults }: ClinicalLabChartsProps) {
  // Combine lab and omics results for charting
  const combinedResults = useMemo(() => {
    const combined = { ...labResults };
    
    // Add omics results to the combined data
    Object.entries(omicsResults).forEach(([key, data]) => {
      if (combined[key]) {
        // If the key already exists in lab results, merge the data
        combined[key] = {
          values: [...combined[key].values, ...data.values],
          dates: [...combined[key].dates, ...data.dates]
        };
      } else {
        // Otherwise just add the omics data
        combined[key] = data;
      }
    });
    
    return combined;
  }, [labResults, omicsResults]);
  
  // Create chart data for each lab category
  const chartData = useMemo(() => {
    const cbcData: any[] = [];
    const chemistryData: any[] = [];
    const liverData: any[] = [];
    const specialData: any[] = [];
    
    // Process each lab test
    Object.entries(combinedResults).forEach(([testName, data]) => {
      // Skip if no data
      if (data.values.length === 0) return;
      
      // Pair dates and values
      const pairedData = data.values.map((value, index) => ({
        value,
        date: data.dates[index]
      })).sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Create chart points
      const chartPoints = pairedData.map(point => ({
        date: format(point.date, 'MMM d, yyyy'),
        [testName]: point.value,
        rawDate: point.date
      }));
      
      // Add to appropriate category
      if (LAB_CATEGORIES.CBC.includes(testName)) {
        cbcData.push(...chartPoints);
      } else if (LAB_CATEGORIES.CHEMISTRY?.includes(testName)) {
        chemistryData.push(...chartPoints);
      } else if (LAB_CATEGORIES.LIVER?.includes(testName)) {
        liverData.push(...chartPoints);
      } else {
        specialData.push(...chartPoints);
      }
    });
    
    // Group data by date for each category
    const groupByDate = (data: any[]) => {
      const groupedData: Record<string, any> = {};
      
      data.forEach(item => {
        const dateStr = item.date;
        if (!groupedData[dateStr]) {
          groupedData[dateStr] = { date: dateStr, rawDate: item.rawDate };
        }
        
        // Add the lab value to the grouped object
        Object.keys(item).forEach(key => {
          if (key !== 'date' && key !== 'rawDate') {
            groupedData[dateStr][key] = item[key];
          }
        });
      });
      
      // Convert back to array and sort by date
      return Object.values(groupedData)
        .sort((a: any, b: any) => a.rawDate.getTime() - b.rawDate.getTime());
    };
    
    return {
      cbc: groupByDate(cbcData),
      chemistry: groupByDate(chemistryData),
      liver: groupByDate(liverData),
      special: groupByDate(specialData)
    };
  }, [combinedResults]);
  
  // Generate a color for each lab test
  const getLineColor = (index: number) => {
    const colors = [
      '#2563eb', '#9f1239', '#15803d', '#7e22ce', 
      '#0891b2', '#ea580c', '#4338ca', '#0369a1',
      '#a16207', '#be123c', '#1e3a8a', '#166534'
    ];
    return colors[index % colors.length];
  };
  
  // If no data, show message
  if (Object.keys(combinedResults).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No laboratory data available to display</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* CBC Chart */}
      {chartData.cbc.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Complete Blood Count</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.cbc}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(chartData.cbc[0] || {})
                  .filter(key => key !== 'date' && key !== 'rawDate')
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={getLineColor(index)}
                      activeDot={{ r: 8 }}
                      connectNulls
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Other charts follow the same pattern */}
      {chartData.chemistry.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Chemistry</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.chemistry}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Object.keys(chartData.chemistry[0] || {})
                  .filter(key => key !== 'date' && key !== 'rawDate')
                  .map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={getLineColor(index)}
                      activeDot={{ r: 8 }}
                      connectNulls
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
} 
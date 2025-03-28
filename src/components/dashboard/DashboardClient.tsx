'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { SearchBar } from './SearchBar'
import SamplesTable, { Sample } from './SamplesTable'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faVial, faCheckCircle, faCalendarCheck, faDna,
  faPlus, faFileExport, faChartPie
} from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

// Define types for the props we expect
interface DashboardClientProps {
  patients?: unknown[];
  totalSamples?: number;
  totalSubjects?: number;
  initialData?: {
    recentSamples?: Sample[];
    qcPassedSamples?: number;
    fullyProcessedSamples?: number;
    partiallyProcessedSamples?: number;
    pendingSamples?: number;
    totalSamples?: number;
    subjectCounts?: {
      complete?: number;
      partial?: number;
      pending?: number;
    };
  };
}

export default function DashboardClient(props: DashboardClientProps) {
  // Create a safe version of initialData
  const initialData = props.initialData || {};
  
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Sample[]>(initialData.recentSamples || [])
  const [loading, setLoading] = useState(false)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      handleSearch(debouncedSearchQuery)
    } else {
      setResults(initialData.recentSamples || [])
    }
  }, [debouncedSearchQuery, initialData.recentSamples])

  const handleSearch = async (query: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/samples/search?q=${query}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Function to handle exporting data to CSV
  const handleExportData = () => {
    try {
      // Generate CSV content
      const headers = [
        'Sample ID', 
        'Subject ID', 
        'Date of Collection', 
        'Genotype', 
        'Processing Status', 
        'QC Status'
      ];
      
      const csvContent = [
        headers.join(','),
        ...(results || []).map((sample: Sample) => [
          sample.sample_id || '',
          sample.subject_id || '',
          sample.date_of_collection || '',
          sample.genotype || '',
          sample.processing_status || '',
          sample.qc_status || ''
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set up download attributes
      link.setAttribute('href', url);
      link.setAttribute('download', `samples_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Calculate QC pass percentage
  const qcPassPercentage = (((initialData.qcPassedSamples || 0) / (initialData.totalSamples || 1)) * 100).toFixed(1)
  
  // Calculate processing percentage
  const processedPercentage = (((initialData.fullyProcessedSamples || 0) / (props.totalSamples || 1)) * 100).toFixed(1)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage omics sample data
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          loading={loading}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <FontAwesomeIcon icon={faDna} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Subjects</p>
                <p className="text-2xl font-semibold text-gray-800">{props.totalSubjects}</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-gray-500 text-sm font-medium flex items-center">
                Subject processing status
              </span>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-600">Complete:</span>
                  <span className="text-xs font-semibold">{initialData.subjectCounts?.complete || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-yellow-600">Partial:</span>
                  <span className="text-xs font-semibold">{initialData.subjectCounts?.partial || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Pending:</span>
                  <span className="text-xs font-semibold">{initialData.subjectCounts?.pending || 0}</span>
                </div>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${((initialData.subjectCounts?.complete || 0) / (props.totalSubjects || 1)) * 100}%`, float: 'left' }} />
                <div className="h-full bg-yellow-500" style={{ width: `${((initialData.subjectCounts?.partial || 0) / (props.totalSubjects || 1)) * 100}%`, float: 'left' }} />
                <div className="h-full bg-gray-400" style={{ width: `${((initialData.subjectCounts?.pending || 0) / (props.totalSubjects || 1)) * 100}%`, float: 'left' }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <FontAwesomeIcon icon={faVial} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Samples</p>
                <p className="text-2xl font-semibold text-gray-800">{props.totalSamples || 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-gray-500 text-sm font-medium flex items-center">
                {initialData.fullyProcessedSamples || 0} fully processed
              </span>
              <span className="text-xs text-green-500">{processedPercentage}% complete</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FontAwesomeIcon icon={faCalendarCheck} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Processing Status</p>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Complete:</span>
                    <span className="text-sm font-semibold">{initialData.fullyProcessedSamples || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-600">Partial:</span>
                    <span className="text-sm font-semibold">{initialData.partiallyProcessedSamples || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pending:</span>
                    <span className="text-sm font-semibold">{initialData.pendingSamples || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-gray-500 text-sm font-medium flex items-center">
                Processing breakdown
              </span>
              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${((initialData.fullyProcessedSamples || 0) / (props.totalSamples || 1)) * 100}%`, float: 'left' }} />
                <div className="h-full bg-yellow-500" style={{ width: `${((initialData.partiallyProcessedSamples || 0) / (props.totalSamples || 1)) * 100}%`, float: 'left' }} />
                <div className="h-full bg-gray-400" style={{ width: `${((initialData.pendingSamples || 0) / (props.totalSamples || 1)) * 100}%`, float: 'left' }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FontAwesomeIcon icon={faCheckCircle} className="text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">QC Status</p>
                <p className="text-2xl font-semibold text-gray-800">{qcPassPercentage}%</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-gray-500 text-sm font-medium flex items-center">
                {initialData.qcPassedSamples} passed QC
              </span>
              <span className="text-xs text-green-500">High quality rate</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-4">
          <Link href="/data-entry/individual" className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
            <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add New Sample
          </Link>
          <button 
            onClick={handleExportData}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md">
            <FontAwesomeIcon icon={faFileExport} className="mr-2" /> Export Data
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
            <FontAwesomeIcon icon={faChartPie} className="mr-2" /> Generate Report
          </button>
        </div>

        {/* Recent Samples Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Recent Samples</h3>
            <Link 
              href="/samples" 
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <SamplesTable samples={results} />
        </div>
      </div>
    </div>
  )
} 
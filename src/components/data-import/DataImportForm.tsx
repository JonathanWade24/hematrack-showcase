'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faSpinner, faUpload } from '@fortawesome/free-solid-svg-icons'
import { PreviewTable } from './PreviewTable'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface FileUpload {
  file: File | null
  status: 'pending' | 'uploading' | 'success' | 'error'
  message?: string
  progress?: number
}

interface ImportFiles {
  demographics: FileUpload
  bonemarrow: FileUpload
  ipadmissions: FileUpload
  opavsmeds: FileUpload
  opvisits: FileUpload
  ipmeds: FileUpload
  labs: FileUpload
}

interface ImportResult {
  type: string
  error?: string
  result?: string
}

const DATA_TYPES = [
  { id: 'demographics', label: 'Demographics & Social History', description: 'Patient demographics and social history data (e.g., MRN, name, DOB, etc.)' },
  { id: 'bonemarrow', label: 'Bone Marrow Results', description: 'Bone marrow test results and components' },
  { id: 'ipadmissions', label: 'Inpatient Admissions', description: 'Hospital admission records and diagnoses' },
  { id: 'opavsmeds', label: 'Outpatient AVS Medications', description: 'Outpatient medication orders and prescriptions' },
  { id: 'opvisits', label: 'Outpatient Visits', description: 'Clinic visits and diagnoses' },
  { id: 'ipmeds', label: 'Inpatient Medications', description: 'In-hospital medication administration' },
  { id: 'labs', label: 'Laboratory Results', description: 'Clinical laboratory test results' }
] as const

const INITIAL_FILES: ImportFiles = {
  demographics: { file: null, status: 'pending' },
  bonemarrow: { file: null, status: 'pending' },
  ipadmissions: { file: null, status: 'pending' },
  opavsmeds: { file: null, status: 'pending' },
  opvisits: { file: null, status: 'pending' },
  ipmeds: { file: null, status: 'pending' },
  labs: { file: null, status: 'pending' }
}

export function DataImportForm() {
  const [files, setFiles] = useState<ImportFiles>(INITIAL_FILES)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleFileChange = (type: keyof ImportFiles, file: File | null) => {
    if (file && !file.name.endsWith('.csv')) {
      setFiles(prev => ({
        ...prev,
        [type]: {
          file: null,
          status: 'error',
          message: 'Only .csv files are allowed'
        }
      }))
      return
    }

    setFiles(prev => ({
      ...prev,
      [type]: {
        file,
        status: 'pending',
        progress: 0
      }
    }))
  }

  const handleImport = async () => {
    // Check if at least one file is selected
    const hasFiles = Object.values(files).some(f => f.file !== null)
    if (!hasFiles) {
      alert('Please select at least one file to import')
      return
    }

    setIsImporting(true)

    try {
      const formData = new FormData()

      // Append files and their types to FormData
      Object.entries(files).forEach(([type, { file }]) => {
        if (file) {
          formData.append('files', file)
          formData.append('dataTypes', type)
        }
      })

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          // Update progress for all uploading files
          setFiles(prev => {
            const newFiles = { ...prev }
            Object.keys(newFiles).forEach(key => {
              if (newFiles[key as keyof ImportFiles].file) {
                newFiles[key as keyof ImportFiles] = {
                  ...newFiles[key as keyof ImportFiles],
                  status: 'uploading',
                  progress: progress
                }
              }
            })
            return newFiles
          })
        }
      }

      // Create a promise to handle the XHR request
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
      })

      // Configure and send the request
      xhr.open('POST', '/api/data-import')
      xhr.send(formData)

      // Wait for the upload to complete
      const response = await uploadPromise
      const results = response as { results: ImportResult[] }

      // Update status for each file based on results
      const newFiles = { ...files }
      results.results.forEach((result) => {
        const type = result.type as keyof ImportFiles
        if (newFiles[type].file) {
          newFiles[type] = {
            ...newFiles[type],
            status: result.error ? 'error' : 'success',
            message: result.error || result.result,
            progress: 100
          }
        }
      })
      setFiles(newFiles)

      // Show preview for the first successfully imported file type
      const successfulType = results.results.find(r => !r.error)?.type
      if (successfulType) {
        setPreviewType(successfulType)
      }
    } catch (error) {
      // Update all uploading files to error state
      setFiles(prev => {
        const newFiles = { ...prev }
        Object.keys(newFiles).forEach(key => {
          if (newFiles[key as keyof ImportFiles].status === 'uploading') {
            newFiles[key as keyof ImportFiles] = {
              ...newFiles[key as keyof ImportFiles],
              status: 'error',
              message: error instanceof Error ? error.message : 'Upload failed',
              progress: 0
            }
          }
        })
        return newFiles
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusIcon = (status: FileUpload['status']) => {
    switch (status) {
      case 'success':
        return <FontAwesomeIcon icon={faCheck} className="text-green-500" />
      case 'error':
        return <FontAwesomeIcon icon={faXmark} className="text-red-500" />
      case 'uploading':
        return <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
        <p className="font-medium">CSV File Format Requirements</p>
        <p className="text-sm mt-1">
          Please ensure all files are in CSV format with headers. Column names should match the expected format
          (case-insensitive). Download the templates below for the correct format.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {DATA_TYPES.map(({ id, label, description }) => (
          <div key={id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
                {label}
                {getStatusIcon(files[id as keyof ImportFiles].status)}
              </label>
              <p className="text-sm text-gray-600">{description}</p>
              <div className="flex items-center gap-2">
                <Input
                  id={id}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(id as keyof ImportFiles, e.target.files?.[0] || null)}
                  disabled={isImporting}
                  className="flex-1"
                />
                {files[id as keyof ImportFiles].file?.name && (
                  <div className="text-sm text-gray-600">
                    {files[id as keyof ImportFiles].file?.name}
                  </div>
                )}
              </div>
              {files[id as keyof ImportFiles].message && (
                <p className={`text-sm ${
                  files[id as keyof ImportFiles].status === 'error' ? 'text-red-500' : 'text-green-500'
                }`}>
                  {files[id as keyof ImportFiles].message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => {/* TODO: Add template download handler */}}
          className="gap-2"
        >
          <FontAwesomeIcon icon={faUpload} className="rotate-180" />
          Download Templates
        </Button>

        <Button
          onClick={handleImport}
          disabled={isImporting || !Object.values(files).some(f => f.file)}
          isLoading={isImporting}
          className="gap-2"
        >
          {isImporting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faUpload} />
              Import Data
            </>
          )}
        </Button>
      </div>

      {/* Preview Table */}
      {previewType && (
        <PreviewTable
          type={previewType}
          onClose={() => setPreviewType(null)}
        />
      )}
    </div>
  )
} 
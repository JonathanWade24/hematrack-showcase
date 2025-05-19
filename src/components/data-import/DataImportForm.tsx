'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faSpinner, faUpload } from '@fortawesome/free-solid-svg-icons'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useToast } from '@/hooks/use-toast'
import { importDataAction, type ImportResult } from '@/app/data-import/actions'

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
  const { toast } = useToast()
  const [files, setFiles] = useState<ImportFiles>(INITIAL_FILES)
  const [isImporting, setIsImporting] = useState(false)

  const handleFileChange = (type: keyof ImportFiles, file: File | null) => {
    if (file && !file.name.endsWith('.txt')) {
      setFiles(prev => ({
        ...prev,
        [type]: {
          file: null,
          status: 'error',
          message: 'Only .txt files are allowed'
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
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to import",
        variant: "destructive"
      })
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

      // Update all files to uploading state
      setFiles(prev => {
        const newFiles = { ...prev }
        Object.keys(newFiles).forEach(key => {
          if (newFiles[key as keyof ImportFiles].file) {
            newFiles[key as keyof ImportFiles] = {
              ...newFiles[key as keyof ImportFiles],
              status: 'uploading',
              progress: 0
            }
          }
        })
        return newFiles
      })

      // Call the server action
      const { results } = await importDataAction(formData)

      // Update status for each file based on results
      const newFiles = { ...files }
      results.forEach((result) => {
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

      // Show toast for overall result
      const hasErrors = results.some(r => r.error)
      if (hasErrors) {
        toast({
          title: "Import Completed with Errors",
          description: "Some files failed to import. Check the status below for details.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Import Successful",
          description: "All files were imported successfully.",
          variant: "default"
        })
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

      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import files",
        variant: "destructive"
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

  const calculateOverallProgress = () => {
    const filesWithProgress = Object.values(files).filter(f => f.file && f.progress !== undefined);
    if (filesWithProgress.length === 0) return 0;
    
    const totalProgress = filesWithProgress.reduce((sum, file) => sum + (file.progress || 0), 0);
    return totalProgress / filesWithProgress.length;
  };

  return (
    <div className="space-y-6">
      {isImporting && (
        <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-lg font-medium mb-2">Import Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${calculateOverallProgress()}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {Math.round(calculateOverallProgress())}% complete
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Text File Format Requirements</p>
        <p className="text-sm mt-1">
          Please ensure all files are in text format with headers. Column names should match the expected format
          (case-insensitive). The system will automatically parse and import the data into the appropriate tables.
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
                  accept=".txt"
                  onChange={(e) => handleFileChange(id as keyof ImportFiles, e.target.files?.[0] || null)}
                  disabled={isImporting}
                  className="flex-1"
                />
                {files[id as keyof ImportFiles].file?.name && (
                  <span className="text-sm text-gray-500">
                    {files[id as keyof ImportFiles].file?.name}
                  </span>
                )}
              </div>
              {files[id as keyof ImportFiles].message && (
                <p className={`text-sm ${files[id as keyof ImportFiles].status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                  {files[id as keyof ImportFiles].message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleImport}
          disabled={isImporting || !Object.values(files).some(f => f.file !== null)}
          className="w-full sm:w-auto"
        >
          {isImporting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Importing...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Import Files
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 
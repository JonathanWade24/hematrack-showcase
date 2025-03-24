'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faDownload, faSpinner, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { parseCSV, validateCSV, generateCSV } from '@/lib/utils/csvParser'
import { v4 as uuidv4 } from 'uuid'

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null)
  
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setUploadStatus('idle')
      setErrorMessage('')
      setUploadResults(null)
    }
  }

  const downloadTemplate = () => {
    // Template headers based on actual database structure
    const headers = [
      'subject_id', 
      'sample_number', 
      'date_of_collection', 
      'age_at_collection', 
      'genotype', 
      'sex',
      'therapies',
      'steady_state',
      'transfusion_status',
      // ADVIA data
      'date_advia',
      'rbc_advia',
      'hb_advia',
      'hct_advia',
      'mcv_advia',
      'mch_advia',
      'mchc_advia',
      'rdw_advia',
      'hdw_advia',
      'plt_advia',
      'mpv_advia',
      'wbc_advia',
      'neut_advia',
      'retic_advia',
      'chr_advia',
      'hc41_v120_advia',
      'hc41_v60_120_advia',
      'hc41_v60_advia',
      'drbc_advia',
      'hyper_advia',
      'nrbc_advia',
      'qc_pass_advia',
      'qc_notes_advia',
      // Lorrca data
      'date_lorrca',
      'ei_min_lorrca',
      'ei_max_lorrca',
      'ei_delta_lorrca',
      'pos_lorrca',
      'instrument_lorrca',
      'qc_pass_lorrca',
      'qc_notes_lorrca',
      // Viscosity data
      'date_visc',
      'visc_45',
      'visc_225',
      'qc_pass_viscosity',
      'qc_notes_viscosity',
      // HVR data
      'date_hvr',
      'hvr_45',
      'hvr_225',
      'qc_pass_hvr',
      'qc_notes_hvr',
      // DNA data
      'date_dna',
      'concentration_1_dna',
      'purity_1_dna',
      'concentration_2_dna',
      'purity_2_dna',
      'qc_pass_dna',
      'qc_notes_dna',
      // PBMC data
      'date_pmbc',
      'cell_number_1_pbmc',
      'cell_number_2_pbmc',
      'sent_to_gt_pbmc',
      'qc_notes_pbmc',
      // Plasma data
      'date_plasma',
      'vol_plasma_1',
      'vol_plasma_2',
      'vol_plasma_3',
      'qc_notes_plasma',
      // F-cells data
      'date_f_cells',
      'percent_f_cells',
      'stain_f_cells',
      'cytometer_f_cells',
      'qc_pass_f_cells',
      'qc_notes_f_cells',
      // Adhesion data
      'date_adhesion',
      'cells_adhered_adhesion',
      'qc_pass_adhesion',
      'qc_notes_adhesion',
      // HPLC data
      'date_hplc',
      'hbf_percent_grady_hplc',
      'hba_percent_grady_hplc',
      'hbc_percent_grady_hplc',
      'hba2_percent_grady_hplc',
      'hbs_percent_grady_hplc',
      'hbf_percent_d10_hplc',
      'hba_percent_d10_hplc',
      'hbc_percent_d10_hplc',
      'hba2_percent_d10_hplc',
      'hbs_percent_d10_hplc',
      'hbf_percent_d10_fcell_ratio',
      'hbf_percent_grady_fcell_ratio'
    ]
    
    // Example data with realistic values
    const exampleData = [{ 
      subject_id: 'OMI001', 
      sample_number: 1, 
      date_of_collection: '2023-01-01', 
      age_at_collection: 25,
      genotype: 'HbSS',
      sex: 'Female',
      therapies: 'Hydroxyurea',
      steady_state: 'Yes',
      transfusion_status: 'No',
      // ADVIA data
      date_advia: '2023-01-02',
      rbc_advia: 2.5,
      hb_advia: 8.5,
      hct_advia: 25.0,
      mcv_advia: 100.0,
      mch_advia: 34.0,
      mchc_advia: 34.0,
      rdw_advia: 18.0,
      hdw_advia: 3.5,
      plt_advia: 350.0,
      mpv_advia: 9.0,
      wbc_advia: 10.0,
      neut_advia: 6.0,
      retic_advia: 10.0,
      chr_advia: 28.5,
      hc41_v120_advia: 15.2,
      hc41_v60_120_advia: 45.6,
      hc41_v60_advia: 39.2,
      drbc_advia: 0.5,
      hyper_advia: 1.2,
      nrbc_advia: 0.1,
      qc_pass_advia: 'Yes',
      qc_notes_advia: '',
      // Lorrca data
      date_lorrca: '2023-01-03',
      ei_min_lorrca: 0.1,
      ei_max_lorrca: 0.6,
      ei_delta_lorrca: 0.5,
      pos_lorrca: 3,
      instrument_lorrca: 'Lorrca MaxSis',
      qc_pass_lorrca: 'Yes',
      qc_notes_lorrca: '',
      // Viscosity data
      date_visc: '2023-01-03',
      visc_45: 4.5,
      visc_225: 22.5,
      qc_pass_viscosity: 'Yes',
      qc_notes_viscosity: '',
      // HVR data
      date_hvr: '2023-01-03',
      hvr_45: 4.5,
      hvr_225: 22.5,
      qc_pass_hvr: 'Yes',
      qc_notes_hvr: '',
      // DNA data
      date_dna: '2023-01-02',
      concentration_1_dna: 50.0,
      purity_1_dna: 1.8,
      concentration_2_dna: 48.0,
      purity_2_dna: 1.9,
      qc_pass_dna: 'Yes',
      qc_notes_dna: '',
      // PBMC data
      date_pmbc: '2023-01-02',
      cell_number_1_pbmc: 5000000,
      cell_number_2_pbmc: 4800000,
      sent_to_gt_pbmc: 'Yes',
      qc_notes_pbmc: '',
      // Plasma data
      date_plasma: '2023-01-02',
      vol_plasma_1: 1.5,
      vol_plasma_2: 1.4,
      vol_plasma_3: 1.3,
      qc_notes_plasma: '',
      // F-cells data
      date_f_cells: '2023-01-04',
      percent_f_cells: 15.5,
      stain_f_cells: 'Anti-HbF-FITC',
      cytometer_f_cells: 'BD FACSCanto II',
      qc_pass_f_cells: 'Yes',
      qc_notes_f_cells: '',
      // Adhesion data
      date_adhesion: '2023-01-04',
      cells_adhered_adhesion: 250,
      qc_pass_adhesion: 'Yes',
      qc_notes_adhesion: '',
      // HPLC data
      date_hplc: '2023-01-03',
      hbf_percent_grady_hplc: 15.0,
      hba_percent_grady_hplc: 0.0,
      hbc_percent_grady_hplc: 0.0,
      hba2_percent_grady_hplc: 3.5,
      hbs_percent_grady_hplc: 81.5,
      hbf_percent_d10_hplc: 14.8,
      hba_percent_d10_hplc: 0.0,
      hbc_percent_d10_hplc: 0.0,
      hba2_percent_d10_hplc: 3.6,
      hbs_percent_d10_hplc: 81.6,
      hbf_percent_d10_fcell_ratio: 0.95,
      hbf_percent_grady_fcell_ratio: 0.97
    }]
    
    // Generate CSV content
    const csvContent = generateCSV(exampleData, { headers })
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'results_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleUpload = async () => {
    if (!file) return
    
    setUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')
    
    try {
      // Read the file
      const text = await file.text()
      
      // Parse CSV using our utility
      const parsedData = parseCSV(text)
      
      if (parsedData.length === 0) {
        throw new Error('File appears to be empty or missing data rows')
      }
      
      // Process each row
      const results = {
        total: parsedData.length,
        successful: 0,
        failed: 0,
        errors: [] as Array<{ row: number; message: string }>
      }
      
      // Validate required fields
      const requiredFields = ['subject_id', 'sample_number', 'date_of_collection']
      const validation = validateCSV(parsedData, requiredFields)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }
      
      for (let i = 0; i < parsedData.length; i++) {
        try {
          const data = parsedData[i]
          
          // Check for required fields in each row
          const missingFields = requiredFields.filter(field => !data[field])
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
          }
          
          // First check if the subject exists
          const { data: subjectData, error: subjectError } = await supabase
            .from('omics_subjects')
            .select('subject_id')
            .eq('subject_id', data.subject_id)
            .single()

          if (subjectError || !subjectData) {
            // Subject doesn't exist, first create a patient record
            const patientMrn = `TEMP-${data.subject_id}`
            
            // Check if patient exists
            const { data: patientData, error: patientCheckError } = await supabase
              .schema('phi')
              .from('patients')
              .select('patient_mrn')
              .eq('patient_mrn', patientMrn)
              .single()
            
            if (patientCheckError || !patientData) {
              // Create patient record first
              const { error: patientError } = await supabase
                .schema('phi')
                .from('patients')
                .insert([{
                  patient_mrn: patientMrn,
                  first_name: 'Temporary',
                  last_name: 'User',
                  birth_date: null,
                  sex: null,
                  race: null,
                  ethnicity: null
                }])
              
              if (patientError) {
                throw new Error(`Failed to create patient record: ${patientError.message}`)
              }
            }
            
            // Now create the subject with the patient MRN
            const { error: createError } = await supabase
              .from('omics_subjects')
              .insert([{
                subject_id: data.subject_id,
                patient_mrn: patientMrn,
                project: 'OMI' // Default project
              }])

            if (createError) {
              throw new Error(`Failed to create subject ${data.subject_id}: ${createError.message}`)
            }
          }

          // Now insert the results
          const { error } = await supabase
            .from('omics_results')
            .insert([{
              id: uuidv4(),
              subject_id: data.subject_id,
              sample_number: parseInt(data.sample_number),
              sample_id: `${data.subject_id}-${data.sample_number}`,
              date_of_collection: data.date_of_collection,
              age_at_collection: data.age_at_collection ? parseFloat(data.age_at_collection) : null,
              genotype: data.genotype || null,
              sex: data.sex || null,
              therapies: data.therapies || null,
              steady_state: data.steady_state === 'Yes' ? true : null,
              transfusion_status: data.transfusion_status === 'Yes' ? true : null,
              // ADVIA data
              date_advia: data.date_advia || null,
              rbc_advia: data.rbc_advia ? parseFloat(data.rbc_advia) : null,
              hb_advia: data.hb_advia ? parseFloat(data.hb_advia) : null,
              hct_advia: data.hct_advia ? parseFloat(data.hct_advia) : null,
              mcv_advia: data.mcv_advia ? parseFloat(data.mcv_advia) : null,
              mch_advia: data.mch_advia ? parseFloat(data.mch_advia) : null,
              mchc_advia: data.mchc_advia ? parseFloat(data.mchc_advia) : null,
              rdw_advia: data.rdw_advia ? parseFloat(data.rdw_advia) : null,
              hdw_advia: data.hdw_advia ? parseFloat(data.hdw_advia) : null,
              plt_advia: data.plt_advia ? parseFloat(data.plt_advia) : null,
              mpv_advia: data.mpv_advia ? parseFloat(data.mpv_advia) : null,
              wbc_advia: data.wbc_advia ? parseFloat(data.wbc_advia) : null,
              neut_advia: data.neut_advia ? parseFloat(data.neut_advia) : null,
              retic_advia: data.retic_advia ? parseFloat(data.retic_advia) : null,
              chr_advia: data.chr_advia ? parseFloat(data.chr_advia) : null,
              hc41_v120_advia: data.hc41_v120_advia ? parseFloat(data.hc41_v120_advia) : null,
              hc41_v60_120_advia: data.hc41_v60_120_advia ? parseFloat(data.hc41_v60_120_advia) : null,
              hc41_v60_advia: data.hc41_v60_advia ? parseFloat(data.hc41_v60_advia) : null,
              drbc_advia: data.drbc_advia ? parseFloat(data.drbc_advia) : null,
              hyper_advia: data.hyper_advia ? parseFloat(data.hyper_advia) : null,
              nrbc_advia: data.nrbc_advia ? parseFloat(data.nrbc_advia) : null,
              qc_pass_advia: data.qc_pass_advia === 'Yes' ? true : null,
              qc_notes_advia: data.qc_notes_advia || null,
              // Lorrca data
              date_lorrca: data.date_lorrca || null,
              ei_min_lorrca: data.ei_min_lorrca ? parseFloat(data.ei_min_lorrca) : null,
              ei_max_lorrca: data.ei_max_lorrca ? parseFloat(data.ei_max_lorrca) : null,
              ei_delta_lorrca: data.ei_delta_lorrca ? parseFloat(data.ei_delta_lorrca) : null,
              pos_lorrca: data.pos_lorrca ? parseFloat(data.pos_lorrca) : null,
              instrument_lorrca: data.instrument_lorrca || null,
              qc_pass_lorrca: data.qc_pass_lorrca === 'Yes' ? true : null,
              qc_notes_lorrca: data.qc_notes_lorrca || null,
              // Viscosity data
              date_visc: data.date_visc || null,
              visc_45: data.visc_45 ? parseFloat(data.visc_45) : null,
              visc_225: data.visc_225 ? parseFloat(data.visc_225) : null,
              qc_pass_viscosity: data.qc_pass_viscosity === 'Yes' ? true : null,
              qc_notes_viscosity: data.qc_notes_viscosity || null,
              // HVR data
              date_hvr: data.date_hvr || null,
              hvr_45: data.hvr_45 ? parseFloat(data.hvr_45) : null,
              hvr_225: data.hvr_225 ? parseFloat(data.hvr_225) : null,
              qc_pass_hvr: data.qc_pass_hvr === 'Yes' ? true : null,
              qc_notes_hvr: data.qc_notes_hvr || null,
              // DNA data
              date_dna: data.date_dna || null,
              concentration_1_dna: data.concentration_1_dna ? parseFloat(data.concentration_1_dna) : null,
              purity_1_dna: data.purity_1_dna ? parseFloat(data.purity_1_dna) : null,
              concentration_2_dna: data.concentration_2_dna ? parseFloat(data.concentration_2_dna) : null,
              purity_2_dna: data.purity_2_dna ? parseFloat(data.purity_2_dna) : null,
              qc_pass_dna: data.qc_pass_dna === 'Yes' ? true : null,
              qc_notes_dna: data.qc_notes_dna || null,
              // PBMC data
              date_pmbc: data.date_pmbc || null,
              cell_number_1_pbmc: data.cell_number_1_pbmc ? parseInt(data.cell_number_1_pbmc) : null,
              cell_number_2_pbmc: data.cell_number_2_pbmc ? parseInt(data.cell_number_2_pbmc) : null,
              sent_to_gt_pbmc: data.sent_to_gt_pbmc === 'Yes' ? true : null,
              qc_notes_pbmc: data.qc_notes_pbmc || null,
              // Plasma data
              date_plasma: data.date_plasma || null,
              vol_plasma_1: data.vol_plasma_1 ? parseFloat(data.vol_plasma_1) : null,
              vol_plasma_2: data.vol_plasma_2 ? parseFloat(data.vol_plasma_2) : null,
              vol_plasma_3: data.vol_plasma_3 ? parseFloat(data.vol_plasma_3) : null,
              qc_notes_plasma: data.qc_notes_plasma || null,
              // F-cells data
              date_f_cells: data.date_f_cells || null,
              percent_f_cells: data.percent_f_cells ? parseFloat(data.percent_f_cells) : null,
              stain_f_cells: data.stain_f_cells || null,
              cytometer_f_cells: data.cytometer_f_cells || null,
              qc_pass_f_cells: data.qc_pass_f_cells === 'Yes' ? true : null,
              qc_notes_f_cells: data.qc_notes_f_cells || null,
              // Adhesion data
              date_adhesion: data.date_adhesion || null,
              cells_adhered_adhesion: data.cells_adhered_adhesion ? parseFloat(data.cells_adhered_adhesion) : null,
              qc_pass_adhesion: data.qc_pass_adhesion === 'Yes' ? true : null,
              qc_notes_adhesion: data.qc_notes_adhesion || null,
              // HPLC data
              date_hplc: data.date_hplc || null,
              hbf_percent_grady_hplc: data.hbf_percent_grady_hplc ? parseFloat(data.hbf_percent_grady_hplc) : null,
              hba_percent_grady_hplc: data.hba_percent_grady_hplc ? parseFloat(data.hba_percent_grady_hplc) : null,
              hbc_percent_grady_hplc: data.hbc_percent_grady_hplc ? parseFloat(data.hbc_percent_grady_hplc) : null,
              hba2_percent_grady_hplc: data.hba2_percent_grady_hplc ? parseFloat(data.hba2_percent_grady_hplc) : null,
              hbs_percent_grady_hplc: data.hbs_percent_grady_hplc ? parseFloat(data.hbs_percent_grady_hplc) : null,
              hbf_percent_d10_hplc: data.hbf_percent_d10_hplc ? parseFloat(data.hbf_percent_d10_hplc) : null,
              hba_percent_d10_hplc: data.hba_percent_d10_hplc ? parseFloat(data.hba_percent_d10_hplc) : null,
              hbc_percent_d10_hplc: data.hbc_percent_d10_hplc ? parseFloat(data.hbc_percent_d10_hplc) : null,
              hba2_percent_d10_hplc: data.hba2_percent_d10_hplc ? parseFloat(data.hba2_percent_d10_hplc) : null,
              hbs_percent_d10_hplc: data.hbs_percent_d10_hplc ? parseFloat(data.hbs_percent_d10_hplc) : null,
              hbf_percent_d10_fcell_ratio: data.hbf_percent_d10_fcell_ratio ? parseFloat(data.hbf_percent_d10_fcell_ratio) : null,
              hbf_percent_grady_fcell_ratio: data.hbf_percent_grady_fcell_ratio ? parseFloat(data.hbf_percent_grady_fcell_ratio) : null
            }])
          
          if (error) {
            throw new Error(error.message)
          }
          
          results.successful++
        } catch (error) {
          results.failed++
          results.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      setUploadResults(results)
      setUploadStatus(results.failed === 0 ? 'success' : 'error')
      setErrorMessage(results.failed > 0 ? `Upload completed with ${results.failed} errors` : '')
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Data Upload</h1>
            <p className="mt-1 text-sm text-gray-600">
              Upload multiple results at once using a CSV file. Subjects will be created automatically if they don&apos;t exist.
            </p>
          </div>
          <Link
            href="/data-entry"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Data Entry
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Download Template</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col">
                  <button
                    onClick={() => downloadTemplate()}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                    Results Template
                  </button>
                  <p className="mt-1 text-xs text-gray-500">Download the template with all required fields</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Data</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                  ${!file || uploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {uploading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUpload} className="mr-2" />
                    Upload File
                  </>
                )}
              </button>

              {/* Status Messages */}
              {uploadStatus === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                  <div className="flex">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 mr-2" />
                    <p>{errorMessage || 'Upload completed successfully!'}</p>
                  </div>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                  <div className="flex">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="h-5 w-5 mr-2" />
                    <p>{errorMessage || 'An error occurred during upload.'}</p>
                  </div>
                </div>
              )}

              {/* Upload Results */}
              {uploadResults && (
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-2">Upload Results</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Rows</p>
                        <p className="text-lg font-medium">{uploadResults.total}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Successful</p>
                        <p className="text-lg font-medium text-green-600">{uploadResults.successful}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-lg font-medium text-red-600">{uploadResults.failed}</p>
                      </div>
                    </div>

                    {uploadResults.errors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Errors</h4>
                        <div className="max-h-60 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {uploadResults.errors.map((error, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{error.row}</td>
                                  <td className="px-3 py-2 text-sm text-red-600">{error.message}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
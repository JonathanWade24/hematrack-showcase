'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faFileUpload, faDownload, faEdit, faSearch } from '@fortawesome/free-solid-svg-icons'
import { generateCSV } from '@/lib/utils/csvParser'
import { Button } from '@/components/ui/button'

export default function DataEntryPage() {
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

  return (
    <DashboardLayout>
      <div className="py-10">
        <header className="mb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Data Entry Options</h1>
            <p className="mt-2 text-lg text-gray-600">
              Choose how you want to enter or manage sample data.
            </p>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1: New Individual Sample */}
              <div className="overflow-hidden rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md bg-indigo-500 p-3">
                      <FontAwesomeIcon icon={faPlus} className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">New Individual Sample</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Enter data for a single sample using a step-by-step form.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/data-entry/individual"
                      className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Start New Entry
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 2: Continue / Search Sample */}
              <div className="overflow-hidden rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md bg-sky-500 p-3">
                      <FontAwesomeIcon icon={faSearch} className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Continue / Search</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Find an existing sample by ID to continue data entry or view its details.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/data-entry/continue"
                      className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    >
                      Find Sample
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 3: Bulk Upload */}
              <div className="overflow-hidden rounded-lg bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 rounded-md bg-emerald-500 p-3">
                      <FontAwesomeIcon icon={faFileUpload} className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Bulk Upload from CSV</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Upload multiple sample records at once using a CSV file.
                  </p>
                  <div className="mt-6 flex space-x-3">
                    <Link
                      href="/data-entry/bulk-upload" // Assuming this is the target page
                      className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Upload CSV
                    </Link>
                    <Button 
                      variant="outline"
                      onClick={downloadTemplate}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <FontAwesomeIcon icon={faDownload} className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  )
} 
'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faFileUpload, faDownload } from '@fortawesome/free-solid-svg-icons'
import { generateCSV } from '@/lib/utils/csvParser'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface RecentEntry {
  id: string;
  subject_id: string;
  sample_number: number;
  date_of_collection: string | null;
  genotype: string | null;
  created_at: string;
}

export default function DataEntryPage() {
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRecentEntries() {
      setLoading(true)
      const { data, error } = await supabase
        .from('omics_results')
        .select('id, subject_id, sample_number, date_of_collection, genotype, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setRecentEntries(data)
      }
      setLoading(false)
    }

    fetchRecentEntries()
  }, [supabase])

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

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Entry</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter new sample data or upload data in bulk
            </p>
          </div>

          {/* Entry Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Individual Entry */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900">Individual Sample Entry</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter data for a single sample. You can save partially completed entries
                and return to add more data later.
              </p>
              <div className="mt-6 space-y-4">
                <Link
                  href="/data-entry/individual"
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  New Sample
                </Link>
                <Link
                  href="/data-entry/continue"
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Update Existing Entry
                </Link>
              </div>
            </div>

            {/* Bulk Upload */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900">Bulk Data Upload</h2>
              <p className="mt-2 text-sm text-gray-600">
                Upload multiple samples at once using our template format.
                Download the template below.
              </p>
              <div className="mt-6 space-y-4">
                <Link
                  href="/data-entry/bulk-upload"
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FontAwesomeIcon icon={faFileUpload} className="mr-2" />
                  Upload Data
                </Link>
                <button
                  onClick={() => downloadTemplate()}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FontAwesomeIcon icon={faDownload} className="mr-2" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          {/* Recent Entries */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Recent Entries</h3>
            </div>
            <div className="px-6 py-4">
              {loading ? (
                <p className="text-sm text-gray-600">Loading recent entries...</p>
              ) : recentEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sample #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Collection Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Genotype
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                            <Link href={`/data-entry/individual/${entry.id}`}>
                              {entry.subject_id}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.sample_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(entry.date_of_collection)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.genotype || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No recent entries found. Start by adding a new sample or uploading data.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 
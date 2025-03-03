'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/Button'
import { BasicInfoSection } from './form-sections/BasicInfoSection'
import { AdviaSection } from './form-sections/AdviaSection'
import { DNASection } from './form-sections/DNASection'
import { PBMCSection } from './form-sections/PBMCSection'
import { PlasmaSection } from './form-sections/PlasmaSection'
import { LorrcaSection } from './form-sections/LorrcaSection'
import { ViscositySection } from './form-sections/ViscositySection'
import { HVRSection } from './form-sections/HVRSection'
import { FCellsSection } from './form-sections/FCellsSection'
import { AdhesionSection } from './form-sections/AdhesionSection'
import { HPLCSection } from './form-sections/HPLCSection'
import { SampleData } from './form-sections/types'

const defaultFormData: SampleData = {
  subject_id: '',
  sample_number: 1,
  date_of_collection: new Date().toISOString().split('T')[0],
  age_at_collection: null,
  sex: null,
  genotype: null,
  date_advia: null,
  rbc_advia: null,
  hb_advia: null,
  hct_advia: null,
  mcv_advia: null,
  mch_advia: null,
  mchc_advia: null,
  rdw_advia: null,
  hdw_advia: null,
  plt_advia: null,
  mpv_advia: null,
  wbc_advia: null,
  neut_advia: null,
  retic_advia: null,
  chr_advia: null,
  hc41_v120_advia: null,
  hc41_v60_120_advia: null,
  hc41_v60_advia: null,
  drbc_advia: null,
  hyper_advia: null,
  nrbc_advia: null,
  qc_pass_advia: null,
  qc_notes_advia: null,
  date_dna: null,
  concentration_1_dna: null,
  purity_1_dna: null,
  concentration_2_dna: null,
  purity_2_dna: null,
  qc_pass_dna: null,
  qc_notes_dna: null,
  date_pmbc: null,
  cell_number_1_pbmc: null,
  cell_number_2_pbmc: null,
  sent_to_gt_pbmc: null,
  qc_notes_pbmc: null,
  date_plasma: null,
  vol_plasma_1: null,
  vol_plasma_2: null,
  vol_plasma_3: null,
  qc_notes_plasma: null,
  date_lorrca: null,
  ei_min_lorrca: null,
  ei_max_lorrca: null,
  ei_delta_lorrca: null,
  pos_lorrca: null,
  instrument_lorrca: null,
  qc_pass_lorrca: null,
  qc_notes_lorrca: null,
  date_visc: null,
  visc_45: null,
  visc_225: null,
  qc_pass_viscosity: null,
  qc_notes_viscosity: null,
  date_hvr: null,
  hvr_45: null,
  hvr_225: null,
  qc_pass_hvr: null,
  qc_notes_hvr: null,
  date_f_cells: null,
  percent_f_cells: null,
  stain_f_cells: null,
  cytometer_f_cells: null,
  qc_pass_f_cells: null,
  qc_notes_f_cells: null,
  date_adhesion: null,
  cells_adhered_adhesion: null,
  qc_pass_adhesion: null,
  qc_notes_adhesion: null,
  date_hplc: null,
  hbf_percent_grady_hplc: null,
  hba_percent_grady_hplc: null,
  hbc_percent_grady_hplc: null,
  hba2_percent_grady_hplc: null,
  hbs_percent_grady_hplc: null,
  hbf_percent_d10_hplc: null,
  hba_percent_d10_hplc: null,
  hbc_percent_d10_hplc: null,
  hba2_percent_d10_hplc: null,
  hbs_percent_d10_hplc: null,
  hbf_percent_d10_fcell_ratio: null,
  hbf_percent_grady_fcell_ratio: null
}

interface SampleEntryFormProps {
  initialData?: SampleData
}

type FormSection = 'basic' | 'advia' | 'dna' | 'pbmc' | 'plasma' | 'lorrca' | 'viscosity' | 'hvr' | 'fcells' | 'adhesion' | 'hplc'

export function SampleEntryForm({ initialData }: SampleEntryFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<SampleData>(initialData || defaultFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNewSubjectConfirm, setShowNewSubjectConfirm] = useState(false)
  const [showSubjectIdWarning, setShowSubjectIdWarning] = useState(false)
  const [activeSection, setActiveSection] = useState<FormSection>('basic')

  const isEditMode = !!initialData

  const handleInputChange = (field: keyof SampleData, value: string | number | boolean | null) => {
    if (isEditMode && field === 'subject_id' && value !== initialData.subject_id) {
      setShowSubjectIdWarning(true)
    }
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (forceCreateSubject: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // Validate required fields based on active section
      if (activeSection === 'basic') {
        if (!formData.subject_id || !formData.date_of_collection) {
          setError('Subject ID and Collection Date are required')
          return
        }
      }

      const response = await fetch('/api/omics', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          force_create_subject: forceCreateSubject
        })
      })

      const data: { status?: string; message?: string; error?: string } = await response.json()

      if (response.status === 409 && data.status === 'new_subject') {
        setShowNewSubjectConfirm(true)
        setError(data.message || 'New subject confirmation required')
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save sample data')
      }

      setSuccess(data.message || `Sample data ${isEditMode ? 'updated' : 'saved'} successfully`)
      
      if (!isEditMode && activeSection === 'basic') {
        // Keep the same subject_id but increment sample_number for new entries
        setFormData(prev => ({
          ...defaultFormData,
          subject_id: prev.subject_id,
          sample_number: prev.sample_number + 1,
          date_of_collection: new Date().toISOString().split('T')[0]
        }))
      } else if (isEditMode) {
        // Redirect to sample view after successful update
        router.push(`/samples/${formData.subject_id}-${formData.sample_number}`)
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Render section tabs
  const renderTabs = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {['basic', 'advia', 'dna', 'pbmc', 'plasma', 'lorrca', 'viscosity', 'hvr', 'fcells', 'adhesion', 'hplc'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section as FormSection)}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeSection === section
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {section.toUpperCase()}
          </button>
        ))}
      </nav>
    </div>
  )

  const renderActiveSection = () => {
    const commonProps = {
      formData,
      isEditMode,
      onInputChange: handleInputChange
    }

    switch (activeSection) {
      case 'basic':
        return <BasicInfoSection {...commonProps} />
      case 'advia':
        return <AdviaSection {...commonProps} />
      case 'dna':
        return <DNASection {...commonProps} />
      case 'pbmc':
        return <PBMCSection {...commonProps} />
      case 'plasma':
        return <PlasmaSection {...commonProps} />
      case 'lorrca':
        return <LorrcaSection {...commonProps} />
      case 'viscosity':
        return <ViscositySection {...commonProps} />
      case 'hvr':
        return <HVRSection {...commonProps} />
      case 'fcells':
        return <FCellsSection {...commonProps} />
      case 'adhesion':
        return <AdhesionSection {...commonProps} />
      case 'hplc':
        return <HPLCSection {...commonProps} />
      default:
        return <div>Section under development</div>
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {showSubjectIdWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-yellow-700 font-medium">Warning: Changing Subject ID</p>
          <p className="text-yellow-600">
            You are about to change the Subject ID. This will affect data relationships and should only be done if absolutely necessary.
            Please double-check that this change is intended.
          </p>
        </div>
      )}

      {renderTabs()}

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        {renderActiveSection()}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-600">
            {success}
          </div>
        )}

        {showNewSubjectConfirm ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-700">
                This will create a new subject in the database. The subject will be flagged as pending until a matching MRN is provided through clinical data integration.
              </p>
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                isLoading={loading}
              >
                Confirm New Subject
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowNewSubjectConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            isLoading={loading}
          >
            {activeSection === 'basic' ? 'Save Initial Sample Data' : 'Update Sample Data'}
          </Button>
        )}
      </form>
    </div>
  )
} 
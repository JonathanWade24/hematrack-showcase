'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
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
import { saveSampleInfoAction, BasicSampleState } from '@/app/data-entry/actions'
import { useFormStatus } from 'react-dom'

const defaultFormData: Omit<SampleData, 'sample_id'> & { lab_id: string | null } = {
  subject_id: '',
  sample_number: 1,
  lab_id: null,
  date_of_collection: new Date().toISOString().split('T')[0],
  age_at_collection: null,
  sex: null,
  genotype: null,
  therapies: null,
  days_to_processing: null,
  steady_state: null,
  transfusion_status: null,
  transfusion_confirmed: null,
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
  initialData?: Omit<SampleData, 'sample_id'> & { lab_id?: string | null };
  isEditing?: boolean;
}

type FormSection = 'basic' | 'advia' | 'dna' | 'pbmc' | 'plasma' | 'lorrca' | 'viscosity' | 'hvr' | 'fcells' | 'adhesion' | 'hplc'

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving Basic Info...' : 'Save Basic Info'}
    </Button>
  );
}

export function SampleEntryForm({ initialData, isEditing = false }: SampleEntryFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<Omit<SampleData, 'sample_id'> & { lab_id: string | null }>( 
    initialData 
      ? { ...initialData, lab_id: initialData.lab_id ?? null }
      : defaultFormData
  )
  const [sampleIdSaved, setSampleIdSaved] = useState<string | null>(initialData?.lab_id ?? null);
  const [needsSubjectConfirmation, setNeedsSubjectConfirmation] = useState(false);
  const [subjectIdToConfirm, setSubjectIdToConfirm] = useState<string | null>(null);
  
  const initialState: BasicSampleState = { message: null, errors: {} };
  const [state, dispatch] = useActionState(saveSampleInfoAction, initialState);

  useEffect(() => {
    if (state?.message && !state.errors && state.created_sample_id) {
      setSampleIdSaved(state.created_sample_id);
      setNeedsSubjectConfirmation(false);
      setSubjectIdToConfirm(null);
      console.log(`Basic info saved for sample: ${state.created_sample_id}`);
      if (!isEditing) {
         setFormData(prev => ({
           ...defaultFormData,
           subject_id: prev.subject_id,
           sample_number: (prev.sample_number ?? 0) + 1,
           lab_id: null,
         }));
      }
    } else if (state?.requires_subject_confirmation && state.subject_id_to_confirm) {
        setNeedsSubjectConfirmation(true);
        setSubjectIdToConfirm(state.subject_id_to_confirm);
    } else if (state?.errors) {
        setNeedsSubjectConfirmation(false);
        setSubjectIdToConfirm(null);
    }
  }, [state, isEditing]);

  const handleInputChange = (field: keyof (Omit<SampleData, 'sample_id'> & { lab_id: string | null }), value: string | number | boolean | null) => {
    if (field === 'subject_id' && needsSubjectConfirmation) {
        setNeedsSubjectConfirmation(false);
        setSubjectIdToConfirm(null);
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form action={dispatch} className="space-y-6">
      <BasicInfoSection 
        formData={formData as SampleData & { lab_id: string | null }}
        isEditMode={isEditing || !!sampleIdSaved}
        onInputChange={handleInputChange as any}
        disabled={!!sampleIdSaved || needsSubjectConfirmation}
      />
      
      {(state?.message || state?.errors?._form) && (
        <div aria-live="polite" className={`text-sm ${state?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
          <p>{state.message || state?.errors?._form?.[0]}</p>
        </div>
      )}
      {state?.errors?.subject_id && (
          <div aria-live="polite" className="text-sm text-red-600 mt-1">
              {state.errors.subject_id.map((error: string) => <p key={error}>{error}</p>)}
          </div>
      )} 

      {needsSubjectConfirmation && subjectIdToConfirm && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md space-y-3">
          <p className="text-yellow-800 font-medium">Confirm New Subject</p>
          <p className="text-sm text-yellow-700">
            Subject ID "{subjectIdToConfirm}" was not found. 
            Do you want to create this new subject along with saving the sample info?
            {formData.patient_mrn && <span> Will be linked to MRN: {formData.patient_mrn}.</span>}
            {!formData.patient_mrn && <span className="block text-xs text-yellow-600">No MRN was provided; a temporary one will be generated if you proceed. You can add an MRN via the main form if available.</span>}
          </p>
          {/* Hidden fields to re-submit original data along with confirmation */}
          <Input type="hidden" name="subject_id" value={formData.subject_id || ''} />
          <Input type="hidden" name="sample_number" value={formData.sample_number?.toString() || ''} />
          <Input type="hidden" name="lab_id" value={formData.lab_id || ''} />
          <Input type="hidden" name="date_of_collection" value={formData.date_of_collection || ''} />
          <Input type="hidden" name="age_at_collection" value={formData.age_at_collection?.toString() || ''} />
          <Input type="hidden" name="genotype" value={formData.genotype || ''} />
          <Input type="hidden" name="steady_state" value={formData.steady_state || ''} />
          <Input type="hidden" name="transfusion_status" value={formData.transfusion_status || ''} />
          <Input type="hidden" name="transfusion_confirmed" value={formData.transfusion_confirmed || ''} />
          <Input type="hidden" name="patient_mrn" value={formData.patient_mrn || ''} />
          
          <Input type="hidden" name="confirm_new_subject" value="true" />
          <div className="flex space-x-3">
            <SubmitButton /> 
            <Button type="button" variant="outline" onClick={() => setNeedsSubjectConfirmation(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!needsSubjectConfirmation && !sampleIdSaved && (
          <div>
              <SubmitButton />
          </div>
      )}
      
      {sampleIdSaved && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Assay Data Entry (Sample: {sampleIdSaved})</h2>
          <p className="text-gray-600 mb-6">Basic sample information saved. You can now enter data for specific assays below.</p>
        </div>
      )}
    </form>
  )
} 
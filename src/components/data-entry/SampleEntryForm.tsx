'use client'

import { useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BasicInfoSection } from './form-sections/BasicInfoSection'
import { AdviaSection } from './form-sections/AdviaSection'
import { DNASection } from './form-sections/DNASection'
import { PBMCSection } from './form-sections/PBMCSection'
import { PlasmaSection } from './form-sections/PlasmaSection'
import { LorrcaSection } from './form-sections/LorrcaSection'
import { ViscositySection } from './form-sections/ViscositySection'
import { FCellsSection } from './form-sections/FCellsSection'
import { AdhesionSection } from './form-sections/AdhesionSection'
import { SampleData } from './form-sections/types'
import { 
    saveSampleInfoAction, BasicSampleState, 
    saveAdviaAction, AdviaState,
    saveDnaAction, DnaState,
    savePBMCAction, PBMCState,
    savePlasmaAction, PlasmaState,
    saveLorrcaAction, LorrcaState,
    saveViscosityAction, ViscosityState,
    saveFCellsAction, FCellsState,
    saveAdhesionAction, AdhesionState
} from '@/app/data-entry/actions'
import { useFormStatus } from 'react-dom'

const defaultFormData: SampleData = {
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
  patient_mrn: null,
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
  hbf_percent_grady_fcell_ratio: null,
}

interface SampleEntryFormProps {
  initialData?: Partial<SampleData>;
  isEditing?: boolean;
}

function SubmitButton({label = "Save Basic Info"}: {label?: string}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-4">
      {pending ? 'Saving...' : label}
    </Button>
  );
}

export function SampleEntryForm({ initialData, isEditing = false }: SampleEntryFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<SampleData>(() => {
    return { ...defaultFormData, ...(initialData || {}) };
  });

  const [currentTab, setCurrentTab] = useState("basic-info");
  const [sampleIdSaved, setSampleIdSaved] = useState<string | null>(initialData?.lab_id ?? null);
  const [needsSubjectConfirmation, setNeedsSubjectConfirmation] = useState(false);
  const [subjectIdToConfirm, setSubjectIdToConfirm] = useState<string | null>(null);
  const [patientMrnForSubject, setPatientMrnForSubject] = useState<string | null>(initialData?.patient_mrn ?? null);
  
  const initialBasicState: BasicSampleState = { message: null, errors: {} };
  const [basicState, dispatchBasicForm] = useActionState(saveSampleInfoAction, initialBasicState);

  const initialAdviaState: AdviaState = { message: null, errors: {} };
  const [adviaState, dispatchAdviaForm] = useActionState(saveAdviaAction, initialAdviaState);

  const initialDnaState: DnaState = { message: null, errors: {}, success: false };
  const [dnaState, dispatchDnaForm] = useActionState(saveDnaAction, initialDnaState);

  const initialPBMCState: PBMCState = { message: null, errors: {}, success: false };
  const [pbmcState, dispatchPBMCForm] = useActionState(savePBMCAction, initialPBMCState);

  const initialPlasmaState: PlasmaState = { message: null, errors: {}, success: false };
  const [plasmaState, dispatchPlasmaForm] = useActionState(savePlasmaAction, initialPlasmaState);

  const initialLorrcaState: LorrcaState = { message: null, errors: {}, success: false };
  const [lorrcaState, dispatchLorrcaForm] = useActionState(saveLorrcaAction, initialLorrcaState);

  const initialViscosityState: ViscosityState = { message: null, errors: {}, success: false };
  const [viscosityState, dispatchViscosityForm] = useActionState(saveViscosityAction, initialViscosityState);

  const initialFCellsState: FCellsState = { message: null, errors: {}, success: false };
  const [fcellsState, dispatchFCellsForm] = useActionState(saveFCellsAction, initialFCellsState);

  const initialAdhesionState: AdhesionState = { message: null, errors: {}, success: false };
  const [adhesionState, dispatchAdhesionForm] = useActionState(saveAdhesionAction, initialAdhesionState);

  useEffect(() => {
    if (basicState?.created_sample_id && (!basicState.errors || Object.keys(basicState.errors).length === 0)) {
      const savedLabId = basicState.created_sample_id;
      setSampleIdSaved(savedLabId);
      setFormData(prev => ({ ...prev, lab_id: savedLabId })); 
      if (basicState.patient_mrn_for_subject) setPatientMrnForSubject(basicState.patient_mrn_for_subject);
      setNeedsSubjectConfirmation(false);
      setSubjectIdToConfirm(null);
      console.log(`Basic info saved successfully for sample: ${savedLabId}`);
      if (!isEditing) {
         setFormData(prev => ({
           ...defaultFormData,
           subject_id: prev.subject_id, 
           sample_number: (Number(prev.sample_number) ?? 0) + 1, 
           lab_id: null,
           patient_mrn: patientMrnForSubject ?? null, 
         }));
         setCurrentTab("advia-results");
      } else {
          console.log("Basic info potentially updated in edit mode.");
      }
    } else if (basicState?.requires_subject_confirmation && basicState.subject_id_to_confirm) {
        setNeedsSubjectConfirmation(true);
        setSubjectIdToConfirm(basicState.subject_id_to_confirm);
        setSampleIdSaved(null); 
    } else if (basicState?.message || (basicState?.errors && Object.keys(basicState.errors).length > 0)){
        if (!basicState.requires_subject_confirmation) {
             setNeedsSubjectConfirmation(false);
        }
         setSampleIdSaved(null); 
         console.error("Basic info save failed: ", basicState.message, basicState.errors);
    }
  }, [basicState, isEditing, patientMrnForSubject]);

  useEffect(() => {
    if (adviaState.success === true) {
        console.log('Advia Save Success:', adviaState.message);
        if (!isEditing) setCurrentTab("dna-results"); 
    } else if (adviaState.errors && Object.keys(adviaState.errors).length > 0) {
        console.error('Advia Save Failed (Validation/Action Error):', adviaState.message, 'Validation Errors:', adviaState.errors);
    } else if (adviaState.success === false && adviaState.message) {
         console.error('Advia Save Failed (General Error):', adviaState.message);
    }
  }, [adviaState, isEditing]);

  useEffect(() => {
    if (dnaState.success === true) {
        console.log('DNA Save Success:', dnaState.message);
        if (!isEditing) setCurrentTab("pbmc-results"); 
    } else if (dnaState.errors && Object.keys(dnaState.errors).length > 0) {
        console.error('DNA Save Failed (Validation/Action Error):', dnaState.message, 'Validation Errors:', dnaState.errors);
    } else if (dnaState.success === false && dnaState.message) {
         console.error('DNA Save Failed (General Error):', dnaState.message);
    }
  }, [dnaState, isEditing]);

  useEffect(() => {
    if (pbmcState.success === true) {
        console.log('PBMC Save Success:', pbmcState.message);
        if (!isEditing) setCurrentTab("plasma-results"); 
    } else if (pbmcState.errors && Object.keys(pbmcState.errors).length > 0) {
        console.error('PBMC Save Failed (Validation/Action Error):', pbmcState.message, 'Validation Errors:', pbmcState.errors);
    } else if (pbmcState.success === false && pbmcState.message) {
         console.error('PBMC Save Failed (General Error):', pbmcState.message);
    }
  }, [pbmcState, isEditing]);

  useEffect(() => {
    if (plasmaState.success === true) {
        console.log('Plasma Save Success:', plasmaState.message);
        if (!isEditing) setCurrentTab("lorrca-results"); 
    } else if (plasmaState.errors && Object.keys(plasmaState.errors).length > 0) {
        console.error('Plasma Save Failed (Validation/Action Error):', plasmaState.message, 'Validation Errors:', plasmaState.errors);
    } else if (plasmaState.success === false && plasmaState.message) {
         console.error('Plasma Save Failed (General Error):', plasmaState.message);
    }
  }, [plasmaState, isEditing]);

  useEffect(() => {
    if (lorrcaState.success === true) {
        console.log('Lorrca Save Success:', lorrcaState.message);
        if (!isEditing) setCurrentTab("viscosity-results"); 
    } else if (lorrcaState.errors && Object.keys(lorrcaState.errors).length > 0) {
        console.error('Lorrca Save Failed (Validation/Action Error):', lorrcaState.message, 'Validation Errors:', lorrcaState.errors);
    } else if (lorrcaState.success === false && lorrcaState.message) {
         console.error('Lorrca Save Failed (General Error):', lorrcaState.message);
    }
  }, [lorrcaState, isEditing]);

  useEffect(() => {
    if (viscosityState.success === true) {
        console.log('Viscosity/HVR Save Success:', viscosityState.message);
        if (!isEditing) setCurrentTab("fcells-results"); 
    } else if (viscosityState.errors && Object.keys(viscosityState.errors).length > 0) {
        console.error('Viscosity/HVR Save Failed (Validation/Action Error):', viscosityState.message, 'Validation Errors:', viscosityState.errors);
    } else if (viscosityState.success === false && viscosityState.message) {
         console.error('Viscosity/HVR Save Failed (General Error):', viscosityState.message);
    }
  }, [viscosityState, isEditing]);

  useEffect(() => {
    if (fcellsState.success === true) {
        console.log('F-Cells Save Success:', fcellsState.message);
        if (!isEditing) setCurrentTab("adhesion-results"); 
    } else if (fcellsState.errors && Object.keys(fcellsState.errors).length > 0) {
        console.error('F-Cells Save Failed (Validation/Action Error):', fcellsState.message, 'Validation Errors:', fcellsState.errors);
    } else if (fcellsState.success === false && fcellsState.message) {
         console.error('F-Cells Save Failed (General Error):', fcellsState.message);
    }
  }, [fcellsState, isEditing]);

  useEffect(() => {
    if (adhesionState.success === true) {
        console.log('Adhesion Save Success:', adhesionState.message);
        if (!isEditing) {
            console.log('All assay sections completed for new entry.');
        }
    } else if (adhesionState.errors && Object.keys(adhesionState.errors).length > 0) {
        console.error('Adhesion Save Failed (Validation/Action Error):', adhesionState.message, 'Validation Errors:', adhesionState.errors);
    } else if (adhesionState.success === false && adhesionState.message) {
         console.error('Adhesion Save Failed (General Error):', adhesionState.message);
    }
  }, [adhesionState, isEditing]);

  const handleInputChange = (field: keyof SampleData, value: any) => {
    if (field === 'subject_id' && needsSubjectConfirmation) {
        setNeedsSubjectConfirmation(false);
        setSubjectIdToConfirm(null);
    }
    if (field === 'date_pmbc') { 
        setFormData(prev => ({ ...prev, date_pmbc: value }))
    } else {
        setFormData(prev => ({ ...prev, [field]: value }))
    }
  };

  const renderSampleIdInput = () => sampleIdSaved ? <input type="hidden" name="sample_id" value={sampleIdSaved} /> : null;

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog for New Subject */}
      {needsSubjectConfirmation && subjectIdToConfirm && (
        <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
          <form action={dispatchBasicForm} className="space-y-4">
            <p className="font-semibold">Subject Confirmation Needed</p>
            <p>{basicState.message}</p>
            <p className="mt-2">Please provide an MRN for the new subject if available.</p>
            <Input 
              name="patient_mrn" 
              placeholder="Patient MRN (Optional)"
              defaultValue={patientMrnForSubject ?? ""}
              className="mt-2"
              onChange={(e) => setPatientMrnForSubject(e.target.value)}
            />
            <input type="hidden" name="confirm_new_subject" value="true" />
            <input type="hidden" name="subject_id" value={subjectIdToConfirm ?? formData.subject_id} />
            <input type="hidden" name="sample_number" value={String(formData.sample_number ?? "")} />
            <input type="hidden" name="lab_id" value={formData.lab_id ?? ""} />
            <input type="hidden" name="date_of_collection" value={formData.date_of_collection ?? ""} />
            <input type="hidden" name="age_at_collection" value={String(formData.age_at_collection ?? "")} />
            <input type="hidden" name="genotype" value={formData.genotype ?? ""} />
            <input type="hidden" name="steady_state" value={formData.steady_state ?? ""} />
            <input type="hidden" name="transfusion_status" value={formData.transfusion_status ?? ""} />
            <input type="hidden" name="transfusion_confirmed" value={formData.transfusion_confirmed ?? ""} />
            <SubmitButton label="Confirm & Save Basic Info" />
          </form>
        </div>
      )}

      {/* Button to view sample - shown if sampleIdSaved is available */}
      {sampleIdSaved && (
        <div className="my-4">
          <Link href={`/samples/${sampleIdSaved}`} passHref legacyBehavior>
            <Button variant="outline">View Sample {sampleIdSaved}</Button>
          </Link>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 mb-4">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="advia-results" disabled={!sampleIdSaved && !isEditing}>Advia</TabsTrigger>
          <TabsTrigger value="dna-results" disabled={!sampleIdSaved && !isEditing}>DNA</TabsTrigger>
          <TabsTrigger value="pbmc-results" disabled={!sampleIdSaved && !isEditing}>PBMC</TabsTrigger>
          <TabsTrigger value="plasma-results" disabled={!sampleIdSaved && !isEditing}>Plasma</TabsTrigger>
          <TabsTrigger value="lorrca-results" disabled={!sampleIdSaved && !isEditing}>Lorrca</TabsTrigger>
          <TabsTrigger value="viscosity-results" disabled={!sampleIdSaved && !isEditing}>Viscosity/HVR</TabsTrigger>
          <TabsTrigger value="fcells-results" disabled={!sampleIdSaved && !isEditing}>F-Cells</TabsTrigger>
          <TabsTrigger value="adhesion-results" disabled={!sampleIdSaved && !isEditing}>Adhesion</TabsTrigger>
        </TabsList>

        <TabsContent value="basic-info">
          <form action={dispatchBasicForm} className="space-y-6">
            <BasicInfoSection 
              formData={formData}
              isEditMode={isEditing || !!sampleIdSaved}
              onInputChange={handleInputChange}
              disabled={isEditing && !!sampleIdSaved && !needsSubjectConfirmation}
            />
            {(basicState?.message || basicState?.errors?._form) && (
                <div aria-live="polite" className={`mt-2 text-sm ${basicState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{basicState.message || basicState?.errors?._form?.[0]}</p>
                </div>
            )}
            {(!sampleIdSaved || (isEditing && !needsSubjectConfirmation)) && !needsSubjectConfirmation && <SubmitButton label={isEditing ? "Update Basic Info" : "Save Basic Info"} />}
          </form>
        </TabsContent>

        <TabsContent value="advia-results">
          <form action={dispatchAdviaForm} className="space-y-4">
            {renderSampleIdInput()} 
            <AdviaSection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false}
            />
            {(adviaState?.message || adviaState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${adviaState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{adviaState.message || adviaState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save Advia Data" />
          </form>
        </TabsContent>

        <TabsContent value="dna-results">
          <form action={dispatchDnaForm} className="space-y-4">
            {renderSampleIdInput()}
            <DNASection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(dnaState?.message || dnaState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${dnaState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{dnaState.message || dnaState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save DNA Data" />
          </form>
        </TabsContent>

        <TabsContent value="pbmc-results">
          <form action={dispatchPBMCForm} className="space-y-4">
            {renderSampleIdInput()}
            <PBMCSection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(pbmcState?.message || pbmcState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${pbmcState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{pbmcState.message || pbmcState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save PBMC Data" />
          </form>
        </TabsContent>
        <TabsContent value="plasma-results">
          <form action={dispatchPlasmaForm} className="space-y-4">
            {renderSampleIdInput()}
            <PlasmaSection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(plasmaState?.message || plasmaState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${plasmaState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{plasmaState.message || plasmaState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save Plasma Data" />
          </form>
        </TabsContent>
        <TabsContent value="lorrca-results">
          <form action={dispatchLorrcaForm} className="space-y-4">
            {renderSampleIdInput()}
            <LorrcaSection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(lorrcaState?.message || lorrcaState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${lorrcaState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{lorrcaState.message || lorrcaState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save Lorrca Data" />
          </form>
        </TabsContent>
        <TabsContent value="viscosity-results">
          <form action={dispatchViscosityForm} className="space-y-4">
            {renderSampleIdInput()}
            <ViscositySection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(viscosityState?.message || viscosityState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${viscosityState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{viscosityState.message || viscosityState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save Viscosity/HVR Data" />
          </form>
        </TabsContent>
        <TabsContent value="fcells-results">
          <form action={dispatchFCellsForm} className="space-y-4">
            {renderSampleIdInput()}
            <FCellsSection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(fcellsState?.message || fcellsState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${fcellsState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{fcellsState.message || fcellsState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save F-Cells Data" />
          </form>
        </TabsContent>
        <TabsContent value="adhesion-results">
          <form action={dispatchAdhesionForm} className="space-y-4">
            {renderSampleIdInput()}
            <AdhesionSection 
              formData={formData} 
              onInputChange={handleInputChange} 
              isEditMode={isEditing} 
              disabled={false} 
            />
            {(adhesionState?.message || adhesionState?.errors?._form) && (
              <div aria-live="polite" className={`mt-2 text-sm ${adhesionState?.errors?._form ? 'text-red-600' : 'text-green-600'}`}>
                  <p>{adhesionState.message || adhesionState?.errors?._form?.[0]}</p>
              </div>
            )}
            <SubmitButton label="Save Adhesion Data" />
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
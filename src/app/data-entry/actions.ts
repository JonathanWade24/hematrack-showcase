'use server'

import { z } from 'zod' // For validation
import { revalidatePath } from 'next/cache' // To potentially update related views
import { redirect } from 'next/navigation' // Optional for redirecting after save

import { auth } from '@/app/api/auth/[...nextauth]/route' // Use the exported auth function
import { db } from '@/lib/db' // Drizzle instance
import { 
    omics_subjectsInLaboratory,
    patientsInClinical,
    samplesInLaboratory // Use this directly
} from '@/lib/db/schema' // Sample table schema
import { eq } from "drizzle-orm";

// Define roles allowed for data entry
const DATA_ENTRY_ROLES = ['admin', 'editor']; // Adjust as needed

// --- Define Zod Schema for Basic Sample Info Validation ---
const BasicSampleSchema = z.object({
    subject_id: z.string().min(1, "Subject ID is required."),
    sample_number: z.coerce.number().int().positive("Sample Number must be a positive integer."),
    lab_id: z.string().min(1, "Lab ID is required."), // This will map to sample_id in the DB
    date_of_collection: z.string().optional().nullable(),
    age_at_collection: z.coerce.number().nullable().optional(),
    genotype: z.string().nullable().optional(),
    steady_state: z.string().nullable().optional(),
    transfusion_status: z.string().nullable().optional(),
    transfusion_confirmed: z.string().nullable().optional(),
    patient_mrn: z.string().optional().nullable(),
});

// (Ensure this is the ONLY definition of BasicSampleState)
export type BasicSampleState = {
    message?: string | null;
    errors?: {
        subject_id?: string[];
        sample_number?: string[];
        lab_id?: string[];
        patient_mrn?: string[];
        date_of_collection?: string[];
        _form?: string[];
    };
    requires_subject_confirmation?: boolean;
    confirmed_subject_creation_handled?: boolean; 
    subject_id_to_confirm?: string | null;
    created_sample_id?: string | null; // This will hold the lab_id (sample_id from DB)
    show_assay_sections?: boolean; 
};

// --- Server Action: Save Basic Sample Info ---
export async function saveSampleInfoAction(
    prevState: BasicSampleState,
    formData: FormData
): Promise<BasicSampleState> {
    console.log("[Action saveSampleInfoAction] Raw FormData entries:", Object.fromEntries(formData.entries())); // Log all form data
    console.log("[Action saveSampleInfoAction] PrevState:", prevState);

    const initialState: BasicSampleState = {
        message: null,
        errors: {},
        requires_subject_confirmation: false,
        subject_id_to_confirm: null,
        created_sample_id: null,
        show_assay_sections: false,
        confirmed_subject_creation_handled: false,
    };

    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized", errors: { _form: ["Unauthorized"] } };
    }

    const subjectId = formData.get('subject_id') as string | null ?? '';
    const sampleNumberStr = formData.get('sample_number') as string | null ?? '';
    const labId = formData.get('lab_id') as string | null ?? '';
    const confirmedNewSubject = formData.get('confirm_new_subject') === 'true';
    const patientMrn = formData.get('patient_mrn') as string | null;

    const validatedFields = BasicSampleSchema.safeParse({
        subject_id: subjectId,
        sample_number: sampleNumberStr,
        lab_id: labId,
        date_of_collection: formData.get('date_of_collection'),
        age_at_collection: formData.get('age_at_collection'),
        genotype: formData.get('genotype'),
        steady_state: formData.get('steady_state'),
        transfusion_status: formData.get('transfusion_status'),
        transfusion_confirmed: formData.get('transfusion_confirmed'),
        patient_mrn: patientMrn,
    });

    if (!validatedFields.success) {
        console.error("[Action saveSampleInfoAction] Validation errors:", validatedFields.error.flatten().fieldErrors);
        return {
            ...initialState,
            message: "Validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            requires_subject_confirmation: prevState?.requires_subject_confirmation,
            subject_id_to_confirm: prevState?.subject_id_to_confirm,
            confirmed_subject_creation_handled: prevState?.confirmed_subject_creation_handled
        };
    }

    const dataToSave = validatedFields.data;
    let subjectIdToUse = dataToSave.subject_id;

    try {
        const existingSubject = await db.query.omics_subjectsInLaboratory.findFirst({
            where: eq(omics_subjectsInLaboratory.subject_id, dataToSave.subject_id),
        });

        if (!existingSubject) {
            if (!confirmedNewSubject && !prevState?.confirmed_subject_creation_handled) {
                console.log(`[Action saveSampleInfoAction] Subject ${dataToSave.subject_id} not found. Requesting confirmation.`);
                return {
                    ...initialState,
                    requires_subject_confirmation: true,
                    subject_id_to_confirm: dataToSave.subject_id,
                    message: `Subject ID ${dataToSave.subject_id} does not exist. Please confirm to create it. You may need to provide an MRN.`,
                    errors: { _form: [`Subject ID ${dataToSave.subject_id} does not exist. Please confirm to create it. You may need to provide an MRN.`] }
                };
            } else if (confirmedNewSubject || prevState?.confirmed_subject_creation_handled) {
                console.log(`[Action saveSampleInfoAction] Creating new subject ${dataToSave.subject_id} after confirmation.`);
                const patientMrnForNewSubject = dataToSave.patient_mrn || `TEMP-MRN-${dataToSave.subject_id}-${Date.now()}`;

                if (!dataToSave.patient_mrn) {
                     console.warn(`Creating subject ${dataToSave.subject_id} with a temporary MRN: ${patientMrnForNewSubject}. Consider adding MRN to the form.`);
                }

                const patientExists = await db.query.patientsInClinical.findFirst({
                    where: eq(patientsInClinical.patient_mrn, patientMrnForNewSubject),
                });

                if (!patientExists) {
                    await db.insert(patientsInClinical).values({
                        patient_mrn: patientMrnForNewSubject,
                        first_name: dataToSave.patient_mrn ? 'Auto-created' : 'Temporary',
                        last_name: dataToSave.patient_mrn ? `Patient for ${dataToSave.subject_id}` : `Subject ${dataToSave.subject_id}`,
                    }).onConflictDoNothing();
                    console.log(`Patient ${patientMrnForNewSubject} created or already existed.`);
                }
                
                await db.insert(omics_subjectsInLaboratory).values({
                    subject_id: dataToSave.subject_id,
                    patient_mrn: patientMrnForNewSubject,
                }).onConflictDoNothing();
                console.log(`Omics Subject (${dataToSave.subject_id}) created/existed, linked to patient (${patientMrnForNewSubject}).`);
            }
        } else {
            subjectIdToUse = existingSubject.subject_id;
            console.log(`[Action saveSampleInfoAction] Using existing subject ${subjectIdToUse}.`);
        }
        
        console.log(`Attempting to save sample with Lab ID: ${dataToSave.lab_id}, Subject ID: ${subjectIdToUse}, Sample Number: ${dataToSave.sample_number}`);

        const newSampleResult = await db.insert(samplesInLaboratory).values({
            sample_id: dataToSave.lab_id, 
            subject_id: subjectIdToUse,
            sample_number: dataToSave.sample_number,
            date_of_collection: dataToSave.date_of_collection,
            age_at_collection: dataToSave.age_at_collection !== null && dataToSave.age_at_collection !== undefined 
                                ? dataToSave.age_at_collection.toString() 
                                : null,
            genotype: dataToSave.genotype,
            steady_state: dataToSave.steady_state,
            transfusion_status: dataToSave.transfusion_status,
            transfusion_confirmed: dataToSave.transfusion_confirmed,
        }).returning({ insertedId: samplesInLaboratory.sample_id });

        if (newSampleResult && newSampleResult.length > 0 && newSampleResult[0].insertedId) {
            console.log(`Sample ${newSampleResult[0].insertedId} saved successfully.`);
            revalidatePath('/data-entry/individual');
            revalidatePath('/samples'); 
            revalidatePath(`/samples/${newSampleResult[0].insertedId}`);

            return {
                ...initialState,
                message: `Basic info for sample ${newSampleResult[0].insertedId} saved successfully! You can now fill assay details.`,
                created_sample_id: newSampleResult[0].insertedId,
                show_assay_sections: true,
                confirmed_subject_creation_handled: prevState?.requires_subject_confirmation, 
            };
        } else {
            console.error("Sample insertion did not return the expected ID or failed silently.");
            return { 
                ...initialState, 
                message: "Error: Sample could not be saved. No ID returned.", 
                errors: { _form: ["Sample could not be saved. No ID returned."] },
                requires_subject_confirmation: prevState?.requires_subject_confirmation,
                subject_id_to_confirm: prevState?.subject_id_to_confirm,
                confirmed_subject_creation_handled: prevState?.confirmed_subject_creation_handled 
            };
        }

    } catch (error: any) {
        console.error("[Action saveSampleInfoAction] Error during DB operation:", error);
        let specificErrorMessage = "Error saving sample basic info.";
        const returnState: BasicSampleState = { 
            ...initialState, 
            message: specificErrorMessage, 
            errors: { _form: [specificErrorMessage] },
            requires_subject_confirmation: prevState?.requires_subject_confirmation,
            subject_id_to_confirm: prevState?.subject_id_to_confirm,
            confirmed_subject_creation_handled: prevState?.confirmed_subject_creation_handled
        };

        if (error.code === '23505') { 
            if (error.constraint === 'samples_pkey') {
                specificErrorMessage = `Error: Lab ID ${dataToSave.lab_id} already exists. Please use a unique Lab ID.`;
                returnState.errors = { ...returnState.errors, lab_id: [specificErrorMessage] };
            } else if (error.constraint === 'samples_subject_id_sample_number_key') {
                specificErrorMessage = `Error: A sample with number ${dataToSave.sample_number} already exists for subject ${subjectIdToUse}.`;
                returnState.errors = { ...returnState.errors, sample_number: [specificErrorMessage] };
            } else if (error.constraint === 'omics_subjects_pkey') {
                specificErrorMessage = `Error: Subject ID ${dataToSave.subject_id} already exists. This should have been caught earlier.`;
                 returnState.errors = { ...returnState.errors, subject_id: [specificErrorMessage] };
            } else {
                 specificErrorMessage = `Error: A data conflict occurred. Constraint: ${error.constraint || 'Unknown constraint'}`;
            }
        } else {
            specificErrorMessage = error.message || "An unknown database error occurred.";
        }
        
        returnState.message = specificErrorMessage;
        if (returnState.errors?._form) {
            returnState.errors._form = [...returnState.errors._form, specificErrorMessage].filter(m => m !== "Error saving sample basic info." || specificErrorMessage !== "Error saving sample basic info.");
             if (returnState.errors._form.length === 0 && specificErrorMessage !== "Error saving sample basic info.") {
                returnState.errors._form = [specificErrorMessage];
            } else if (returnState.errors._form.length > 1 && returnState.errors._form[0] === "Error saving sample basic info.") {
                 returnState.errors._form.shift();
            }
        } else if (returnState.errors) {
            returnState.errors._form = [specificErrorMessage];
        } else {
            returnState.errors = { _form: [specificErrorMessage]};
        }
        
        return returnState;
    }
}

// --- Placeholder Actions for Assays ---
// Example:
// export async function saveDnaResultsAction(sampleId: string, data: DnaData) { ... } 
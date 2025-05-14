'use server'

import { z } from 'zod' // For validation
import { revalidatePath } from 'next/cache' // To potentially update related views
import { redirect } from 'next/navigation' // Optional for redirecting after save
import { eq, like, or, desc, sql, inArray } from "drizzle-orm"; // Added like, or, desc, inArray

import { auth } from '@/app/api/auth/[...nextauth]/route' // Use the exported auth function
import { db } from '@/lib/db' // Drizzle instance
import { 
    omics_subjectsInLaboratory,
    patientsInClinical,
    samplesInLaboratory,
    results_adviaInLaboratory,
    results_dnaInLaboratory,
    results_pbmcInLaboratory,
    results_plasmaInLaboratory,
    results_lorrcaInLaboratory,
    results_viscosityInLaboratory,
    results_fcellsInLaboratory,
    results_adhesionInLaboratory
} from '@/lib/db/schema' // Sample table schema
import { ASSAY_CONFIGS } from "@/config/assayConfigs"; // Import ASSAY_CONFIGS

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
    patient_mrn_for_subject?: string | null; // Added to carry over MRN
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

// --- Advia Action and State ---
const adviaFieldsFromSampleData = {
    date_advia: z.string().nullable().optional(),
    rbc_advia: z.coerce.number().nullable().optional(),
    hb_advia: z.coerce.number().nullable().optional(),
    hct_advia: z.coerce.number().nullable().optional(),
    mcv_advia: z.coerce.number().nullable().optional(),
    mch_advia: z.coerce.number().nullable().optional(),
    mchc_advia: z.coerce.number().nullable().optional(),
    rdw_advia: z.coerce.number().nullable().optional(),
    hdw_advia: z.coerce.number().nullable().optional(),
    plt_advia: z.coerce.number().nullable().optional(),
    mpv_advia: z.coerce.number().nullable().optional(),
    wbc_advia: z.coerce.number().nullable().optional(),
    neut_advia: z.coerce.number().nullable().optional(),
    retic_advia: z.coerce.number().nullable().optional(),
    chr_advia: z.coerce.number().nullable().optional(),
    hc41_v120_advia: z.coerce.number().nullable().optional(),
    hc41_v60_120_advia: z.coerce.number().nullable().optional(),
    hc41_v60_advia: z.coerce.number().nullable().optional(),
    drbc_advia: z.coerce.number().nullable().optional(),
    hyper_advia: z.coerce.number().nullable().optional(),
    nrbc_advia: z.coerce.number().nullable().optional(),
    qc_pass_advia: z.enum(['Yes', 'No', 'Review']).nullable().optional(),
    qc_notes_advia: z.string().nullable().optional(),
};

const AdviaSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save Advia data."),
    ...adviaFieldsFromSampleData
});

export type AdviaState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof AdviaSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function saveAdviaAction(
    prevState: AdviaState,
    formData: FormData
): Promise<AdviaState> {
    const initialState: AdviaState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for Advia save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = AdviaSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "Advia validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...adviaData } = validatedFields.data;

    try {
        // Ensure numeric fields are correctly formatted (Drizzle expects string for numeric types)
        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(
                Object.entries(adviaData).map(([key, value]) => [
                    key,
                    typeof value === 'number' ? value.toString() :
                    value === null || value === undefined ? null : value // Keep nulls/undefined as is, or handle strings for enum
                ])
            )
        } as typeof results_adviaInLaboratory.$inferInsert; // Cast to ensure type compatibility
        
        // Remove undefined keys explicitly, as Drizzle might not like them
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                delete dataToUpsert[typedKey];
            }
        });

        await db.insert(results_adviaInLaboratory)
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_adviaInLaboratory.sample_id, // Assuming sample_id is unique constraint or PK for this table
                set: dataToUpsert // Update all fields provided
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "Advia data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action saveAdviaAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save Advia data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- DNA Action and State ---
const dnaFieldsFromSampleData = {
    date_dna: z.string().nullable().optional(),
    concentration_1_dna: z.coerce.number().nullable().optional(),
    purity_1_dna: z.coerce.number().nullable().optional(),
    concentration_2_dna: z.coerce.number().nullable().optional(),
    purity_2_dna: z.coerce.number().nullable().optional(),
    qc_pass_dna: z.enum(['Yes', 'No', 'Review']).nullable().optional(),
    qc_notes_dna: z.string().nullable().optional(),
};

const DnaSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save DNA data."),
    ...dnaFieldsFromSampleData
});

export type DnaState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof DnaSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function saveDnaAction(
    prevState: DnaState,
    formData: FormData
): Promise<DnaState> {
    const initialState: DnaState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for DNA save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = DnaSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "DNA validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...dnaData } = validatedFields.data;

    try {
        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(
                Object.entries(dnaData).map(([key, value]) => [
                    key,
                    typeof value === 'number' ? value.toString() :
                    value === null || value === undefined ? null : value
                ])
            )
        } as unknown as typeof results_dnaInLaboratory.$inferInsert; // Using unknown first then cast
        
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                delete dataToUpsert[typedKey];
            }
        });

        // Ensure results_dnaInLaboratory is imported
        // import { results_dnaInLaboratory } from '@/lib/db/schema' needs to be at the top
        await db.insert(results_dnaInLaboratory) 
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_dnaInLaboratory.sample_id, 
                set: dataToUpsert
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "DNA data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action saveDnaAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save DNA data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- PBMC Action and State ---
const pbmcFieldsFromSampleData = {
    date_pbmc: z.string().nullable().optional(), // Note: SampleData uses date_pmbc, schema results_pbmc.date_pbmc. Align if needed.
    cell_number_1_pbmc: z.coerce.number().nullable().optional(),
    cell_number_2_pbmc: z.coerce.number().nullable().optional(),
    sent_to_gt_pbmc: z.preprocess(
        (val) => {
            if (val === 'Yes') return 1;
            if (val === 'No') return 0;
            // For null, undefined, or already numeric values, pass them through for further validation.
            // Zod will then check if it's a valid number, null, or undefined based on the schema.
            if (val === null || val === undefined || typeof val === 'number') return val; 
            return NaN; // Make it fail validation if it's some other string
        },
        z.coerce.number().int().min(0).max(1).nullable().optional()
    ),
    qc_notes_pbmc: z.string().nullable().optional(),
};

const PBMCSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save PBMC data."),
    ...pbmcFieldsFromSampleData
});

export type PBMCState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof PBMCSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function savePBMCAction(
    prevState: PBMCState,
    formData: FormData
): Promise<PBMCState> {
    const initialState: PBMCState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for PBMC save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    // Correct date field name if schema is date_pbmc but form sends date_pmbc
    if (rawFormData.date_pmbc && !rawFormData.date_pbmc) {
        rawFormData.date_pbmc = rawFormData.date_pmbc;
        delete rawFormData.date_pmbc;
    }
    const validatedFields = PBMCSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "PBMC validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...pbmcData } = validatedFields.data;

    try {
        // Smarter data preparation for Drizzle
        const dataToUpsertEntries = Object.entries(pbmcData).map(([key, value]) => {
            // For 'sent_to_gt_pbmc', it's already a number (0 or 1) or null due to preprocessing.
            // For other numeric fields like cell_number_1_pbmc, they are numbers or null from coerce.
            // Drizzle expects actual numbers for numeric columns, not strings.
            // All other fields (dates, qc_notes) are strings or null.
            if (value === undefined) { // Remove undefined properties explicitly for Drizzle
                return [key, null]; // Or handle as per Drizzle's expectation for missing optional fields
            }
            return [key, value];
        });

        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(dataToUpsertEntries.filter(([_, value]) => value !== undefined)) // Filter out undefined if any persisted
        } as unknown as typeof results_pbmcInLaboratory.$inferInsert;
        
        // Explicitly delete undefined keys if any remain, Drizzle might not like them.
        // This step might be redundant if the filter above and Zod's optional handling is sufficient.
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                // This case should ideally be handled by Zod making optional fields null or not present
                // If a field is truly optional and not provided, it shouldn't be in pbmcData if not in formData
                // If it was in formData as empty string and Zod made it undefined, then null is better for DB.
                (dataToUpsert as any)[typedKey] = null; 
            }
        });

        // Ensure results_pbmcInLaboratory is imported at the top of actions.ts
        await db.insert(results_pbmcInLaboratory)
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_pbmcInLaboratory.sample_id, 
                set: dataToUpsert
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "PBMC data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action savePBMCAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save PBMC data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- Plasma Action and State ---
const plasmaFieldsFromSampleData = {
    date_plasma: z.string().nullable().optional(),
    vol_plasma_1: z.coerce.number().nullable().optional(),
    vol_plasma_2: z.coerce.number().nullable().optional(),
    vol_plasma_3: z.coerce.number().nullable().optional(),
    qc_notes_plasma: z.string().nullable().optional(),
};

const PlasmaSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save Plasma data."),
    ...plasmaFieldsFromSampleData
});

export type PlasmaState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof PlasmaSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function savePlasmaAction(
    prevState: PlasmaState,
    formData: FormData
): Promise<PlasmaState> {
    const initialState: PlasmaState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for Plasma save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = PlasmaSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "Plasma validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...plasmaData } = validatedFields.data;

    try {
        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(
                Object.entries(plasmaData).map(([key, value]) => [
                    key,
                    typeof value === 'number' ? value.toString() :
                    value === null || value === undefined ? null : value
                ])
            )
        } as unknown as typeof results_plasmaInLaboratory.$inferInsert;
        
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                delete dataToUpsert[typedKey];
            }
        });

        // Ensure results_plasmaInLaboratory is imported at the top
        await db.insert(results_plasmaInLaboratory) 
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_plasmaInLaboratory.sample_id, 
                set: dataToUpsert
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "Plasma data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action savePlasmaAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save Plasma data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- Lorrca Action and State ---
const lorrcaFieldsFromSampleData = {
    date_lorrca: z.string().nullable().optional(),
    ei_min_lorrca: z.coerce.number().nullable().optional(),
    ei_max_lorrca: z.coerce.number().nullable().optional(),
    ei_delta_lorrca: z.coerce.number().nullable().optional(),
    pos_lorrca: z.coerce.number().nullable().optional(), // Schema is varchar, SampleData is number|null. Coerce here.
    instrument_lorrca: z.string().nullable().optional(),
    qc_pass_lorrca: z.enum(['Yes', 'No', 'Review']).nullable().optional(),
    qc_notes_lorrca: z.string().nullable().optional(),
};

const LorrcaSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save Lorrca data."),
    ...lorrcaFieldsFromSampleData
});

export type LorrcaState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof LorrcaSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function saveLorrcaAction(
    prevState: LorrcaState,
    formData: FormData
): Promise<LorrcaState> {
    const initialState: LorrcaState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for Lorrca save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = LorrcaSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "Lorrca validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...lorrcaData } = validatedFields.data;

    try {
        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(
                Object.entries(lorrcaData).map(([key, value]) => [
                    key,
                    // Convert numbers (including pos_lorrca) to string for Drizzle numeric/varchar columns
                    typeof value === 'number' ? value.toString() :
                    value === null || value === undefined ? null : value
                ])
            )
        } as unknown as typeof results_lorrcaInLaboratory.$inferInsert;
        
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                delete dataToUpsert[typedKey];
            }
        });

        // Ensure results_lorrcaInLaboratory is imported at the top
        await db.insert(results_lorrcaInLaboratory)
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_lorrcaInLaboratory.sample_id, 
                set: dataToUpsert
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "Lorrca data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action saveLorrcaAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save Lorrca data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- Viscosity/HVR Action and State ---
const viscosityFieldsFromSampleData = {
    date_visc: z.string().nullable().optional(),
    visc_45: z.coerce.number().nullable().optional(),
    visc_225: z.coerce.number().nullable().optional(),
    qc_pass_viscosity: z.enum(['Yes', 'No', 'Review']).nullable().optional(),
    qc_notes_viscosity: z.string().nullable().optional(),
    // HVR fields are part of the same table/section
    date_hvr: z.string().nullable().optional(), // SampleData has date_hvr, but DB likely uses date_analysis
    hvr_45: z.coerce.number().nullable().optional(),
    hvr_225: z.coerce.number().nullable().optional(),
    qc_pass_hvr: z.enum(['Yes', 'No', 'Review']).nullable().optional(), // SampleData has qc_pass_hvr
    qc_notes_hvr: z.string().nullable().optional(), // SampleData has qc_notes_hvr
};

const ViscositySchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save Viscosity/HVR data."),
    ...viscosityFieldsFromSampleData
});

export type ViscosityState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof ViscositySchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function saveViscosityAction(
    prevState: ViscosityState,
    formData: FormData
): Promise<ViscosityState> {
    const initialState: ViscosityState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for Viscosity/HVR save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    // Map form field names to DB column names if they differ
    // DB schema (results_viscosityInLaboratory) uses date_analysis, visc_45, visc_225, hvr_45, hvr_225, qc_pass, qc_notes
    // SampleData/Form uses date_visc, visc_45, visc_225, qc_pass_viscosity, qc_notes_viscosity, 
    //                      date_hvr, hvr_45, hvr_225, qc_pass_hvr, qc_notes_hvr
    
    const mappedData: Record<string, any> = { sample_id: rawFormData.sample_id };
    mappedData.date_analysis = rawFormData.date_visc ?? rawFormData.date_hvr ?? null; // Use either date
    mappedData.visc_45 = rawFormData.visc_45 ?? null;
    mappedData.visc_225 = rawFormData.visc_225 ?? null;
    mappedData.hvr_45 = rawFormData.hvr_45 ?? null;
    mappedData.hvr_225 = rawFormData.hvr_225 ?? null;
    mappedData.qc_pass = rawFormData.qc_pass_viscosity ?? rawFormData.qc_pass_hvr ?? null; // Use either QC pass
    mappedData.qc_notes = rawFormData.qc_notes_viscosity ?? rawFormData.qc_notes_hvr ?? null; // Use either QC notes

    // Validate the source fields (even though we map them)
    const validatedSourceFields = ViscositySchema.safeParse(rawFormData);
    if (!validatedSourceFields.success) {
         return {
            ...initialState,
            message: "Viscosity/HVR validation failed on source fields.",
            errors: validatedSourceFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    // Construct the object for the database using mapped names
    const dataToUpsert = {
        sample_id: mappedData.sample_id,
        date_analysis: mappedData.date_analysis,
        visc_45: typeof mappedData.visc_45 === 'number' ? mappedData.visc_45.toString() : mappedData.visc_45, // Stringify numbers
        visc_225: typeof mappedData.visc_225 === 'number' ? mappedData.visc_225.toString() : mappedData.visc_225,
        hvr_45: typeof mappedData.hvr_45 === 'number' ? mappedData.hvr_45.toString() : mappedData.hvr_45,
        hvr_225: typeof mappedData.hvr_225 === 'number' ? mappedData.hvr_225.toString() : mappedData.hvr_225,
        qc_pass: mappedData.qc_pass,
        qc_notes: mappedData.qc_notes,
    } as unknown as typeof results_viscosityInLaboratory.$inferInsert;
    
     Object.keys(dataToUpsert).forEach(key => {
        const typedKey = key as keyof typeof dataToUpsert;
        if (dataToUpsert[typedKey] === undefined || dataToUpsert[typedKey] === null) { // Remove nulls too for upsert
            delete dataToUpsert[typedKey];
        }
    });
     // Ensure sample_id is always present
     dataToUpsert.sample_id = mappedData.sample_id;

    try {
        // Ensure results_viscosityInLaboratory is imported at the top
        await db.insert(results_viscosityInLaboratory)
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_viscosityInLaboratory.sample_id,
                set: dataToUpsert // Update only provided fields
            });

        revalidatePath(`/samples/${dataToUpsert.sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "Viscosity/HVR data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action saveViscosityAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save Viscosity/HVR data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- F-Cells Action and State ---
const fcellsFieldsFromSampleData = {
    date_f_cells: z.string().nullable().optional(),
    percent_f_cells: z.coerce.number().nullable().optional(),
    stain_f_cells: z.string().nullable().optional(),
    cytometer_f_cells: z.string().nullable().optional(),
    qc_pass_f_cells: z.enum(['Yes', 'No', 'Review']).nullable().optional(),
    qc_notes_f_cells: z.string().nullable().optional(),
};

const FCellsSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save F-Cells data."),
    ...fcellsFieldsFromSampleData
});

export type FCellsState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof FCellsSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function saveFCellsAction(
    prevState: FCellsState,
    formData: FormData
): Promise<FCellsState> {
    const initialState: FCellsState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for F-Cells save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = FCellsSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "F-Cells validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...fcellsData } = validatedFields.data;

    try {
        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(
                Object.entries(fcellsData).map(([key, value]) => [
                    key,
                    typeof value === 'number' ? value.toString() :
                    value === null || value === undefined ? null : value
                ])
            )
        } as unknown as typeof results_fcellsInLaboratory.$inferInsert;
        
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                delete dataToUpsert[typedKey];
            }
        });

        // Ensure results_fcellsInLaboratory is imported at the top
        await db.insert(results_fcellsInLaboratory)
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_fcellsInLaboratory.sample_id,
                set: dataToUpsert
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "F-Cells data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action saveFCellsAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save F-Cells data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- Adhesion Action and State ---
const adhesionFieldsFromSampleData = {
    date_adhesion: z.string().nullable().optional(),
    cells_adhered_adhesion: z.coerce.number().nullable().optional(),
    qc_pass_adhesion: z.enum(['Yes', 'No', 'Review']).nullable().optional(),
    qc_notes_adhesion: z.string().nullable().optional(),
};

const AdhesionSchema = z.object({
    sample_id: z.string().min(1, "Sample ID is required to save Adhesion data."),
    ...adhesionFieldsFromSampleData
});

export type AdhesionState = {
    message?: string | null;
    errors?: z.inferFlattenedErrors<typeof AdhesionSchema>['fieldErrors'] & {
         _form?: string[];
    };
    success?: boolean;
};

export async function saveAdhesionAction(
    prevState: AdhesionState,
    formData: FormData
): Promise<AdhesionState> {
    const initialState: AdhesionState = { message: null, errors: {}, success: false };
    const session = await auth();
    if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
        return { ...initialState, message: "Unauthorized for Adhesion save.", errors: { _form: ["Unauthorized"] } };
    }

    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = AdhesionSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            ...initialState,
            message: "Adhesion validation failed.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    const { sample_id, ...adhesionData } = validatedFields.data;

    try {
        const dataToUpsert = {
            sample_id: sample_id,
            ...Object.fromEntries(
                Object.entries(adhesionData).map(([key, value]) => [
                    key,
                    typeof value === 'number' ? value.toString() :
                    value === null || value === undefined ? null : value
                ])
            )
        } as unknown as typeof results_adhesionInLaboratory.$inferInsert;
        
        Object.keys(dataToUpsert).forEach(key => {
            const typedKey = key as keyof typeof dataToUpsert;
            if (dataToUpsert[typedKey] === undefined) {
                delete dataToUpsert[typedKey];
            }
        });

        // Ensure results_adhesionInLaboratory is imported at the top
        await db.insert(results_adhesionInLaboratory)
            .values(dataToUpsert)
            .onConflictDoUpdate({
                target: results_adhesionInLaboratory.sample_id,
                set: dataToUpsert
            });

        revalidatePath(`/samples/${sample_id}`);
        revalidatePath('/samples');
        revalidatePath('/data-entry/edit/[sampleId]');

        return { ...initialState, message: "Adhesion data saved successfully!", success: true };
    } catch (error: any) {
        console.error("[Action saveAdhesionAction] Error:", error);
        return { ...initialState, message: error.message || "Failed to save Adhesion data.", success: false, errors: { _form: [error.message || "Database error"]}};
    }
}

// --- Search Samples Action and State ---

// Define the structure for search results
export type SampleSearchResult = {
  sample_id: string;
  subject_id: string;
  date_of_collection: string | null; 
  // Add other fields if needed for display (e.g., status)
};

export type SearchState = {
  results?: SampleSearchResult[];
  message?: string | null;
  error?: boolean;
};

export async function searchSamplesAction(
  prevState: SearchState,
  formData: FormData
): Promise<SearchState> {
  const query = formData.get('searchQuery') as string | null;

  if (!query || query.trim().length < 2) {
    return { message: "Please enter at least 2 characters to search.", error: true };
  }

  const trimmedQuery = query.trim().toLowerCase();
  // Original search term: user's query with wildcards
  const searchTerm = `%${trimmedQuery}%`; 

  let alternativeSearchTerm = null;
  const lastHyphenIndex = trimmedQuery.lastIndexOf('-');

  if (lastHyphenIndex > -1 && lastHyphenIndex < trimmedQuery.length - 1) {
    const prefix = trimmedQuery.substring(0, lastHyphenIndex + 1); // e.g., "omi-" or "omi-001-"
    const lastPart = trimmedQuery.substring(lastHyphenIndex + 1);    // e.g., "1" or "001"

    if (!isNaN(Number(lastPart))) {
      // If the last part is a number, create an alternative term 
      // that matches the prefix and then the numeric value of the last part, 
      // allowing for different leading zeros in the database.
      // e.g., query "omi-1" -> prefix "omi-", lastPart "1" -> alt term "omi-%1%"
      // e.g., query "omi-001-1" -> prefix "omi-001-", lastPart "1" -> alt term "omi-001-%1%"
      alternativeSearchTerm = `${prefix}%${Number(lastPart)}%`;
    }
  } else if (!isNaN(Number(trimmedQuery))) {
    // If the whole query is a number (e.g., "001", "1"), search for its numeric value with wildcards
    // This might be too broad if IDs are purely numeric and short.
    // Consider if purely numeric IDs need a prefix to be effective.
    // alternativeSearchTerm = `%${Number(trimmedQuery)}%`; 
    // For now, let's assume purely numeric IDs are less common or handled by exact searchTerm
  }

  try {
    const conditions = [
      sql`lower(${samplesInLaboratory.sample_id}) like ${searchTerm}`,
      sql`lower(${samplesInLaboratory.subject_id}) like ${searchTerm}`
    ];

    if (alternativeSearchTerm && alternativeSearchTerm !== searchTerm) {
      console.log("[Action searchSamplesAction] Using alternative search term:", alternativeSearchTerm);
      conditions.push(sql`lower(${samplesInLaboratory.sample_id}) like ${alternativeSearchTerm}`);
      conditions.push(sql`lower(${samplesInLaboratory.subject_id}) like ${alternativeSearchTerm}`);
    }

    const foundSamples = await db
      .select({
        sample_id: samplesInLaboratory.sample_id,
        subject_id: samplesInLaboratory.subject_id,
        date_of_collection: samplesInLaboratory.date_of_collection,
      })
      .from(samplesInLaboratory)
      .where(or(...conditions))
      .orderBy(desc(samplesInLaboratory.created_at))
      .limit(20);

    const formattedResults = foundSamples.map(sample => ({
        ...sample,
        // Format date if needed (Drizzle returns string for date type)
        date_of_collection: sample.date_of_collection ? sample.date_of_collection.toString() : null,
    }));

    if (formattedResults.length === 0) {
      return { message: `No samples found matching "${query}".`, results: [], error: false };
    }

    return { results: formattedResults, error: false };

  } catch (error: any) {
    console.error("[Action searchSamplesAction] Error:", error);
    return { message: "Search failed due to a database error.", error: true };
  }
}

// --- Server Action: Get Existing Assay Data for a Batch of Samples ---
export async function getExistingAssayDataAction(
  sampleIds: string[],
  assayKey: string
): Promise<{ success: boolean; data?: any[]; message?: string; error?: any }> {
  const session = await auth();
  if (!session?.user) { // Broader access initially, can be restricted later if needed
    return { success: false, message: "Unauthorized: User not authenticated." };
  }

  if (!sampleIds || sampleIds.length === 0) {
    return { success: false, message: "No sample IDs provided." };
  }
  if (!assayKey) {
    return { success: false, message: "No assay key provided." };
  }

  const assayConfig = ASSAY_CONFIGS[assayKey];
  if (!assayConfig) {
    return { success: false, message: `Invalid assay key: ${assayKey}. No configuration found.` };
  }

  const { dbTable, sampleIdForeignKey } = assayConfig;

  if (!dbTable || !(sampleIdForeignKey in dbTable)) {
    console.error(`[Action getExistingAssayDataAction] Misconfiguration for assay key ${assayKey}: dbTable or sampleIdForeignKey is invalid.`);
    return { success: false, message: `Server misconfiguration for assay ${assayKey}.` };
  }

  try {
    console.log(`[Action getExistingAssayDataAction] Fetching ${assayKey} data for sample IDs:`, sampleIds);
    
    const results = await db
      .select()
      .from(dbTable)
      // @ts-ignore because sampleIdForeignKey is a string key, but TS expects a specific column type here.
      // Drizzle should correctly interpret this at runtime.
      .where(inArray(dbTable[sampleIdForeignKey], sampleIds));

    console.log(`[Action getExistingAssayDataAction] Found ${results.length} existing ${assayKey} records.`);
    return { success: true, data: results };

  } catch (error: any) {
    console.error(`[Action getExistingAssayDataAction] Error fetching ${assayKey} data:`, error);
    return { 
      success: false, 
      message: `Error fetching existing data for ${assayConfig.displayName}.`, 
      error: error.message 
    };
  }
}

// --- Server Action: Save Bulk Assay Data ---
interface BulkSaveData {
  sample_id: string;
  assayData: Record<string, any>;
  // other sample fields like subject_id could be here if needed for context, but not for saving
}

export async function saveBulkAssayDataAction(
  assayKey: string,
  recordsToSave: BulkSaveData[]
): Promise<{ success: boolean; message: string; errors?: Array<{ sample_id: string; error: string }> }> {
  const session = await auth();
  if (!session?.user || !DATA_ENTRY_ROLES.includes(session.user.role ?? '')) {
    return { success: false, message: "Unauthorized: User not permitted to save bulk data." };
  }

  if (!assayKey) {
    return { success: false, message: "No assay key provided." };
  }
  if (!recordsToSave || recordsToSave.length === 0) {
    return { success: false, message: "No records provided to save." };
  }

  const assayConfig = ASSAY_CONFIGS[assayKey];
  if (!assayConfig) {
    return { success: false, message: `Invalid assay key: ${assayKey}. No configuration found.` };
  }

  const { dbTable, sampleIdForeignKey, fields: fieldConfigs } = assayConfig;

  if (!dbTable || !(sampleIdForeignKey in dbTable)) {
    console.error(`[Action saveBulkAssayDataAction] Misconfiguration for assay key ${assayKey}: dbTable or sampleIdForeignKey is invalid.`);
    return { success: false, message: `Server misconfiguration for assay ${assayConfig.displayName}.` };
  }

  const errors: Array<{ sample_id: string; error: string }> = [];
  let successCount = 0;

  for (const record of recordsToSave) {
    if (!record.sample_id || !record.assayData) {
      errors.push({ sample_id: record.sample_id || "UNKNOWN_SAMPLE", error: "Missing sample_id or assayData." });
      continue;
    }

    const dataForDb: Record<string, any> = {
      [sampleIdForeignKey]: record.sample_id,
    };

    // Prepare data, ensuring types and only including fields defined in config
    for (const fieldConfig of fieldConfigs) {
      const fieldName = fieldConfig.name;
      let value = record.assayData[fieldName];

      // Skip if value is undefined (field not present in input for this record)
      if (value === undefined) {
        continue;
      }
      
      // Handle nulls: if a field is explicitly set to null, pass it as null
      if (value === null) {
        dataForDb[fieldName] = null;
        continue;
      }

      // Type conversion based on fieldConfig
      switch (fieldConfig.type) {
        case 'number':
          const numValue = Number(value);
          dataForDb[fieldName] = isNaN(numValue) ? null : numValue;
          break;
        case 'date':
          if (value === '' || !value) {
            dataForDb[fieldName] = null;
          } else {
            const dateObj = new Date(value as string);
            if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
              dataForDb[fieldName] = dateObj.toISOString().split('T')[0]; // Store as YYYY-MM-DD string
            } else {
              dataForDb[fieldName] = null; // Invalid date becomes null
            }
          }
          break;
        case 'boolean':
          dataForDb[fieldName] = Boolean(value);
          break;
        case 'select': // Select values are typically strings or numbers
        default: // text
          dataForDb[fieldName] = String(value);
          break;
      }
      // Ensure that empty strings for non-text fields are treated as null if appropriate
      if (fieldConfig.type !== 'text' && dataForDb[fieldName] === '') {
          dataForDb[fieldName] = null;
      }
    }
    
    // Remove any fields that ended up as undefined after processing (shouldn't happen with current logic)
    Object.keys(dataForDb).forEach(key => {
        if (dataForDb[key] === undefined) {
            delete dataForDb[key];
        }
    });

    try {
      // @ts-ignore - dbTable is generic, and sampleIdForeignKey is a string key.
      const conflictTarget = dbTable[sampleIdForeignKey];

      await db.insert(dbTable)
        // @ts-ignore - dataForDb is Record<string, any>
        .values(dataForDb)
        .onConflictDoUpdate({
          target: conflictTarget,
          // @ts-ignore - dataForDb includes the sampleIdForeignKey, Drizzle needs it excluded from set typically,
          // but for upserting all fields, this should be fine. Or be more explicit if issues arise.
          set: dataForDb 
        });
      successCount++;
    } catch (e: any) {
      console.error(`[Action saveBulkAssayDataAction] Error saving record for sample ${record.sample_id}, assay ${assayKey}:`, e);
      errors.push({ sample_id: record.sample_id, error: e.message || "An unknown error occurred." });
    }
  }

  if (successCount > 0) {
    revalidatePath('/data-entry/bulk-assay-entry');
    revalidatePath('/samples');
    // Potentially revalidate individual sample paths if that's a common navigation flow
    recordsToSave.forEach(record => {
        if (record.sample_id) revalidatePath(`/samples/${record.sample_id}`);
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Successfully saved ${successCount} record(s), but ${errors.length} record(s) failed.`,
      errors: errors,
    };
  }

  return { success: true, message: `Successfully saved all ${successCount} records for ${assayConfig.displayName}.` };
}

// Placeholder for other assay actions (Adhesion)

// ... (rest of existing actions.ts, if any) ... 
'use server'

import { db } from '@/lib/db';
import { 
  patientsInClinical,
  lab_resultsInClinical,
  bone_marrow_resultsInClinical,
  visitsInClinical,
  medication_ordersInClinical,
  medication_administrationsInClinical,
  lab_ordersInClinical,
  visit_diagnosesInClinical
} from '@/lib/db/schema';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { eq } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';

// Helper to check if the current user is an admin
async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'admin';
}

export type ImportResult = {
  type: string;
  error?: string;
  result?: string;
  recordsProcessed?: number;
};

async function importDemographics(fileContent: string, sourceFileName: string): Promise<ImportResult> {
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '|',
      relax_quotes: true
    });

    for (const record of records) {
      await db.insert(patientsInClinical).values({
        patient_mrn: record.PATIENT_MRN,
        first_name: record.FIRST_NAME,
        last_name: record.LAST_NAME,
        middle_name: record.MIDDLE_NAME,
        birth_date: record.BIRTH_DATE,
        sex: record.SEX,
        race: record.RACE,
        ethnicity: record.ETHNICITY,
        is_tobacco_user: record.IS_TOBACCO_USER,
        alcohol_user: record.ALCOHOL_USER,
        ill_drug_user: record.ILL_DRUG_USER
      }).onConflictDoUpdate({
        target: patientsInClinical.patient_mrn,
        set: {
          first_name: record.FIRST_NAME,
          last_name: record.LAST_NAME,
          middle_name: record.MIDDLE_NAME,
          birth_date: record.BIRTH_DATE,
          sex: record.SEX,
          race: record.RACE,
          ethnicity: record.ETHNICITY,
          is_tobacco_user: record.IS_TOBACCO_USER,
          alcohol_user: record.ALCOHOL_USER,
          ill_drug_user: record.ILL_DRUG_USER,
          updated_at: new Date().toISOString()
        }
      });
    }

    return {
      type: 'demographics',
      result: `Successfully imported ${records.length} demographic records from ${sourceFileName}`,
      recordsProcessed: records.length
    };
  } catch (error) {
    console.error('Error importing demographics:', error);
    return {
      type: 'demographics',
      error: error instanceof Error ? error.message : `Failed to import demographics from ${sourceFileName}`
    };
  }
}

async function importBoneMarrow(fileContent: string, sourceFileName: string): Promise<ImportResult> {
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '|',
      relax_quotes: true
    });

    for (const record of records) {
      // First create/update the lab order
      await db.insert(lab_ordersInClinical).values({
        order_id: record.ORDER_ID,
        patient_mrn: record.PATIENT_MRN,
        order_type: 'BONE_MARROW',
        accession_num: record.ACCESSION_NUM,
        lab_code: record.LAB_CODE,
        lab_name: record.LAB_NAME,
        order_time: record.ORDER_TIME,
        result_time: record.RESULT_TIME,
        source_file: sourceFileName
      }).onConflictDoUpdate({
        target: lab_ordersInClinical.order_id,
        set: {
          result_time: record.RESULT_TIME,
          updated_at: new Date().toISOString()
        }
      });

      // Then create/update the bone marrow result
      await db.insert(bone_marrow_resultsInClinical).values({
        order_id: record.ORDER_ID,
        component_id: record.COMPONENT_ID,
        component_name: record.COMPONENT_NAME,
        lab_component_description: record.LAB_COMPONENT_DESCRIPTION,
        result_text: record.RESULT_TEXT,
        bone_marrow_results_by_component: record.BONE_MARROW_RESULTS_BY_COMPONENT,
        source_file: sourceFileName
      }).onConflictDoUpdate({
        target: [bone_marrow_resultsInClinical.order_id, bone_marrow_resultsInClinical.component_id],
        set: {
          lab_component_description: record.LAB_COMPONENT_DESCRIPTION,
          result_text: record.RESULT_TEXT,
          bone_marrow_results_by_component: record.BONE_MARROW_RESULTS_BY_COMPONENT,
          updated_at: new Date().toISOString()
        }
      });
    }

    return {
      type: 'bonemarrow',
      result: `Successfully imported ${records.length} bone marrow records from ${sourceFileName}`,
      recordsProcessed: records.length
    };
  } catch (error) {
    console.error('Error importing bone marrow data:', error);
    return {
      type: 'bonemarrow',
      error: error instanceof Error ? error.message : `Failed to import bone marrow data from ${sourceFileName}`
    };
  }
}

async function importVisits(fileContent: string, sourceFileName: string): Promise<ImportResult> {
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '|',
      relax_quotes: true
    });

    for (const record of records) {
      // Create/update visit
      await db.insert(visitsInClinical).values({
        visit_id: record.VISIT_ID,
        patient_mrn: record.PATIENT_MRN,
        pat_enc_csn_id: record.PAT_ENC_CSN_ID,
        visit_type: record.VISIT_TYPE,
        visit_subtype: record.VISIT_SUBTYPE,
        visit_start_datetime: record.VISIT_START_DATETIME,
        visit_end_datetime: record.VISIT_END_DATETIME,
        department_id: record.DEPARTMENT_ID,
        department_name: record.DEPARTMENT_NAME,
        discharge_disposition: record.DISCHARGE_DISPOSITION,
        icu_admission: record.ICU_ADMISSION === 'true',
        bp_systolic: record.BP_SYSTOLIC ? parseInt(record.BP_SYSTOLIC) : null,
        bp_diastolic: record.BP_DIASTOLIC ? parseInt(record.BP_DIASTOLIC) : null,
        weight_kg: record.WEIGHT_KG ? String(parseFloat(record.WEIGHT_KG)) : null,
        source_file: sourceFileName
      }).onConflictDoUpdate({
        target: visitsInClinical.visit_id,
        set: {
          visit_end_datetime: record.VISIT_END_DATETIME,
          discharge_disposition: record.DISCHARGE_DISPOSITION,
          bp_systolic: record.BP_SYSTOLIC ? parseInt(record.BP_SYSTOLIC) : null,
          bp_diastolic: record.BP_DIASTOLIC ? parseInt(record.BP_DIASTOLIC) : null,
          weight_kg: record.WEIGHT_KG ? String(parseFloat(record.WEIGHT_KG)) : null,
          updated_at: new Date().toISOString()
        }
      });

      // Handle diagnoses if present
      if (record.DIAGNOSES) {
        const diagnoses = JSON.parse(record.DIAGNOSES);
        for (const diagnosis of diagnoses) {
          await db.insert(visit_diagnosesInClinical).values({
            visit_id: record.VISIT_ID,
            diagnosis_type: diagnosis.type,
            icd10_code: diagnosis.code,
            diagnosis_name: diagnosis.name,
            sequence_num: diagnosis.sequence,
            source_file: sourceFileName
          }).onConflictDoUpdate({
            target: [visit_diagnosesInClinical.visit_id, visit_diagnosesInClinical.diagnosis_type, visit_diagnosesInClinical.icd10_code, visit_diagnosesInClinical.sequence_num],
            set: {
              diagnosis_name: diagnosis.name,
              updated_at: new Date().toISOString()
            }
          });
        }
      }
    }

    return {
      type: 'visits',
      result: `Successfully imported ${records.length} visit records from ${sourceFileName}`,
      recordsProcessed: records.length
    };
  } catch (error) {
    console.error('Error importing visits:', error);
    return {
      type: 'visits',
      error: error instanceof Error ? error.message : `Failed to import visits from ${sourceFileName}`
    };
  }
}

async function importMedications(fileContent: string, type: 'ip' | 'op', sourceFileName: string): Promise<ImportResult> {
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '|',
      relax_quotes: true
    });

    for (const record of records) {
      if (type === 'ip') {
        // Handle inpatient medication administrations
        await db.insert(medication_administrationsInClinical).values({
          epic_order_med_id: record.EPIC_ORDER_MED_ID,
          visit_id: record.VISIT_ID,
          patient_mrn: record.PATIENT_MRN,
          medication_name: record.MEDICATION_NAME,
          administration_time: record.ADMINISTRATION_TIME,
          dose_given: record.DOSE_GIVEN,
          units: record.UNITS,
          route: record.ROUTE,
          reason_for_action: record.REASON_FOR_ACTION,
          administering_user: record.ADMINISTERING_USER,
          source_file: sourceFileName
        }).onConflictDoUpdate({
          target: medication_administrationsInClinical.administration_id,
          set: {
            dose_given: record.DOSE_GIVEN,
            reason_for_action: record.REASON_FOR_ACTION,
            updated_at: new Date().toISOString()
          }
        });
      } else {
        // Handle outpatient medication orders (opavsmeds)
        await db.insert(medication_ordersInClinical).values({
          epic_order_med_id: record.ORDER_MED_ID,
          visit_id: record.VISIT_ID,
          patient_mrn: record.PATIENT_MRN,
          medication_name: record.GENERIC_DESCRIPTION,
          order_time: record.ORDER_DTTM,
          status: record.RX_STATUS,
          dose: record.DOSE,
          units: record.UNITS,
          route: record.ROUTE,
          frequency: record.FREQUENCY,
          source_file: sourceFileName
        }).onConflictDoUpdate({
          target: medication_ordersInClinical.medication_order_id,
          set: {
            status: record.RX_STATUS,
            updated_at: new Date().toISOString()
          }
        });
      }
    }

    return {
      type: type === 'ip' ? 'ipmeds' : 'opavsmeds',
      result: `Successfully imported ${records.length} ${type === 'ip' ? 'inpatient' : 'outpatient'} medication records from ${sourceFileName}`,
      recordsProcessed: records.length
    };
  } catch (error) {
    console.error(`Error importing ${type} medications:`, error);
    return {
      type: type === 'ip' ? 'ipmeds' : 'opavsmeds',
      error: error instanceof Error ? error.message : `Failed to import ${type} medications from ${sourceFileName}`
    };
  }
}

async function importLabs(fileContent: string, sourceFileName: string): Promise<ImportResult> {
  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '|',
      relax_quotes: true
    });

    for (const record of records) {
      // First create/update the lab order
      await db.insert(lab_ordersInClinical).values({
        order_id: record.ORDER_ID,
        patient_mrn: record.PATIENT_MRN,
        order_type: 'LAB',
        accession_num: record.ACCESSION_NUM,
        lab_code: record.LAB_CODE,
        lab_name: record.LAB_NAME,
        order_time: record.ORDER_TIME,
        result_time: record.RESULT_TIME,
        collection_time: record.COLLECTION_TIME,
        proc_bgn_time: record.PROC_BGN_TIME,
        proc_end_time: record.PROC_END_TIME,
        source_file: sourceFileName
      }).onConflictDoUpdate({
        target: lab_ordersInClinical.order_id,
        set: {
          result_time: record.RESULT_TIME,
          updated_at: new Date().toISOString()
        }
      });

      // Then create/update the lab result
      await db.insert(lab_resultsInClinical).values({
        order_id: record.ORDER_ID,
        component_id: record.COMPONENT_ID,
        component_name: record.COMPONENT_NAME,
        result_value: record.RESULT_VALUE,
        result_value_numeric: record.RESULT_VALUE_NUMERIC ? String(parseFloat(record.RESULT_VALUE_NUMERIC)) : null,
        reference_range: record.REFERENCE_RANGE,
        units: record.UNITS,
        abnormal_flag: record.ABNORMAL_FLAG,
        result_time: record.RESULT_TIME,
        source_file: sourceFileName
      }).onConflictDoUpdate({
        target: [lab_resultsInClinical.order_id, lab_resultsInClinical.component_id],
        set: {
          result_value: record.RESULT_VALUE,
          result_value_numeric: record.RESULT_VALUE_NUMERIC ? String(parseFloat(record.RESULT_VALUE_NUMERIC)) : null,
          abnormal_flag: record.ABNORMAL_FLAG,
          updated_at: new Date().toISOString()
        }
      });
    }

    return {
      type: 'labs',
      result: `Successfully imported ${records.length} lab records from ${sourceFileName}`,
      recordsProcessed: records.length
    };
  } catch (error) {
    console.error('Error importing lab data:', error);
    return {
      type: 'labs',
      error: error instanceof Error ? error.message : `Failed to import lab data from ${sourceFileName}`
    };
  }
}

export async function importDataAction(formData: FormData): Promise<{ results: ImportResult[] }> {
  if (!(await isAdmin())) {
    return { results: [{ type: 'auth', error: 'Unauthorized' }] };
  }

  const results: ImportResult[] = [];
  const files = formData.getAll('files') as File[];
  const types = formData.getAll('dataTypes') as string[];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const type = types[i];
    const content = await file.text();
    const sourceFileName = file.name;

    try {
      let result: ImportResult;
      switch (type) {
        case 'demographics':
          result = await importDemographics(content, sourceFileName);
          break;
        case 'bonemarrow':
          result = await importBoneMarrow(content, sourceFileName);
          break;
        case 'visits':
          result = await importVisits(content, sourceFileName);
          break;
        case 'ipmeds':
          result = await importMedications(content, 'ip', sourceFileName);
          break;
        case 'opavsmeds':
          result = await importMedications(content, 'op', sourceFileName);
          break;
        case 'labs':
          result = await importLabs(content, sourceFileName);
          break;
        default:
          result = { type, error: `Unknown file type: ${type}` };
      }
      results.push(result);
    } catch (error) {
      results.push({
        type,
        error: error instanceof Error ? error.message : 'Failed to process file'
      });
    }
  }

  return { results };
} 
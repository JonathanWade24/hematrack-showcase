import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/db'
import { parse } from 'papaparse'

type DataType = 
  | 'demographics' 
  | 'labs' 
  | 'bone_marrow' | 'bonemarrow'
  | 'ip_admissions' | 'ipadmissions'
  | 'op_visits' | 'opvisits'
  | 'ip_medications' | 'ipmeds'
  | 'op_medications' | 'opavsmeds';

/**
 * Data Import API Route
 * 
 * Expected File Format: CSV files with headers
 * Column names are case-insensitive
 * 
 * File Types and Required Fields:
 * 
 * Demographics (demographics.csv):
 * - PATIENT_MRN or Patient_MRN (required)
 * - PATIENT_NAME or Patient_Name (will be split into first/last)
 * - BIRTH_DATE or Birth_Date
 * - GENDER or Gender
 * - RACE or Race
 * - ETHNICITY or Ethnicity
 * - AGE or Age
 * - IS_TOBACCO_USER_YN or Is_Tobacco_User
 * - ALCOHOL_USER_YN or Alcohol_User
 * - ILL_DRUG_USER_YN or Ill_Drug_User
 * 
 * Bone Marrow (IN495734_SCD_Bone_Marrow_Baseline.txt):
 * - PATIENT_MRN (required)
 * - HSP_ACCOUNT_ID
 * - ORDER_ID
 * - RESULT_TIME
 * - LAB_CODE
 * - LAB_NAME
 * - COMPONENT_ID
 * - LAB_COMPONENT_DESCRIPTION
 * - BONE_MARROW_RESULTS_BY_COMPONENT
 * 
 * Labs (labs.csv):
 * - PATIENT_MRN (required)
 * - PAT_ENC_CSN_ID
 * - ORDER_TIME
 * - PROC_CODE
 * - PROC_NAME
 * - COMPONENT_ID
 * - LAB_COMPONENT_DESCRIPTION
 * - LAB_RESULT_VALUE
 * - RESULT_TIME
 */

// Define type for parsed row data
interface ParsedRow {
  [key: string]: string | null
}

// Helper function to get value from row using case-insensitive column name
function getValue(row: ParsedRow, columnName: string): string | null {
  // Try exact match first
  if (row[columnName] !== undefined) {
    return row[columnName]
  }

  // Try case-insensitive match
  const lowerColumnName = columnName.toLowerCase()
  const key = Object.keys(row).find(k => k.toLowerCase() === lowerColumnName)
  return key ? row[key] : null
}

// Helper function to parse dates
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  try {
    // Check for problematic timezone format like "gmt-0400"
    if (dateStr.toLowerCase().includes('gmt-') || dateStr.toLowerCase().includes('gmt+')) {
      // Remove the problematic timezone or replace with a standard format
      const cleanDateStr = dateStr.replace(/gmt[+-]\d{4}/i, '').trim();
      const date = new Date(cleanDateStr);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Standard date parsing
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

// Helper function to clean strings
function cleanString(str: string | null, maxLength = 50): string | null {
  if (!str) return null
  const cleaned = str.trim()
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned
}

// Helper function to validate if a row is a header row
function isHeaderRow(row: ParsedRow): boolean {
  const values = Object.values(row)
    .filter(v => typeof v === 'string')
    .map(v => (v as string).toLowerCase().trim())
  const headerKeywords = ['patient_mrn', 'birth_date', 'gender', 'race', 'ethnicity']
  return headerKeywords.some(keyword => 
    values.some(v => v?.includes(keyword.toLowerCase()))
  )
}

// Process demographics data
async function processDemographics(fileContent: string) {
  const { data } = parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  })

  const results = {
    created: 0,
    updated: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()
  
  for (const row of data as ParsedRow[]) {
    // Skip if this looks like a header row
    if (isHeaderRow(row)) {
      console.warn('Skipping header row:', row)
      continue
    }

    const mrn = getValue(row, 'patient_mrn')
    if (!mrn?.trim()) {
      console.warn('Skipping row with empty MRN')
      results.skipped++
      continue
    }

    try {
      // Get patient name and split into first/last
      const fullName = getValue(row, 'patient_name')
      let firstName = null
      let lastName = null
      
      if (fullName) {
        const nameParts = fullName.split(',').map(part => part.trim())
        if (nameParts.length >= 2) {
          lastName = nameParts[0]
          firstName = nameParts[1]
        } else {
          firstName = fullName
        }
      }

      // Check if patient exists
      const { data: existingPatient, error: queryError } = await adminClient
        .schema('phi' as any)
        .from('patients')
        .select('*')
        .eq('patient_mrn', mrn)
        .single()
      
      if (queryError && queryError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error querying for existing patient:', queryError);
        throw queryError;
      }

      if (existingPatient) {
        // Update existing patient
        const { error } = await adminClient
          .schema('phi' as any)
          .from('patients')
          .update({
            first_name: cleanString(firstName),
            last_name: cleanString(lastName),
            birth_date: parseDate(getValue(row, 'birth_date')),
            sex: cleanString(getValue(row, 'gender') || getValue(row, 'sex')),
            race: cleanString(getValue(row, 'race')),
            ethnicity: cleanString(getValue(row, 'ethnicity')),
            updated_at: new Date()
          })
          .eq('patient_mrn', mrn)
        
        if (error) throw error
        results.updated++
      } else {
        // Create new patient
        const { error } = await adminClient
          .schema('phi' as any)
          .from('patients')
          .insert({
            patient_mrn: mrn,
            first_name: cleanString(firstName),
            last_name: cleanString(lastName),
            birth_date: parseDate(getValue(row, 'birth_date')),
            sex: cleanString(getValue(row, 'gender') || getValue(row, 'sex')),
            race: cleanString(getValue(row, 'race')),
            ethnicity: cleanString(getValue(row, 'ethnicity')),
            created_at: new Date(),
            updated_at: new Date()
          })
        
        if (error) throw error
        results.created++
      }
    } catch (error) {
      console.error('Error processing demographics row:', error)
      results.skipped++
    }
  }

  return `Processed demographics: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
}

// Define interfaces for parsed data
interface BoneMarrowRow {
  patient_mrn: string
  hsp_account_id: string
  order_id: string
  result_time: string
  lab_code: string
  lab_name: string
  lab_value: string
  lab_unit: string
  lab_reference_range: string
  lab_abnormal_flag: string
  lab_status: string
  component_id: string
  lab_component_description: string
  bone_marrow_results_by_component: string
}

interface IPAdmissionsRow {
  patient_mrn: string
  hsp_account_id: string
  adm_date_time: string
  disch_date_time: string
  adm_source: string
  adm_type: string
  disch_disp: string
  adm_dx_cd: string
  adm_dx_description: string
  disch_dx_cd: string
  disch_dx_description: string
}

interface OPAVSMedsRow {
  patient_mrn: string
  hsp_account_id: string
  visit_date: string
  medication_name: string
  medication_dose: string
  medication_route: string
  medication_frequency: string
  medication_duration: string
  medication_status: string
}

interface OPVisitsRow {
  patient_mrn: string
  hsp_account_id: string
  visit_date: string
  visit_type: string
  visit_provider: string
  visit_department: string
  visit_status: string
  visit_dx_cd_1: string
  visit_dx_description_1: string
  visit_dx_cd_2: string
  visit_dx_description_2: string
  visit_dx_cd_3: string
  visit_dx_description_3: string
}

interface IPMedsRow {
  patient_mrn: string
  hsp_account_id: string
  order_date: string
  medication_name: string
  medication_dose: string
  medication_route: string
  medication_frequency: string
  medication_start_date: string
  medication_end_date: string
  medication_indication: string
}

// Add this interface near the top with other interfaces
interface LabsRow {
  PATIENT_MRN: string;
  PAT_ENC_CSN_ID?: string;
  ORDER_TIME?: string;
  PROC_CODE?: string;
  PROC_NAME?: string;
  COMPONENT_ID?: string;
  LAB_COMPONENT_DESCRIPTION?: string;
  LAB_RESULT_VALUE?: string;
  RESULT_TIME?: string;
  // Add order_id and other fields from your actual lab data structure
  order_id?: string;
  lab_code?: string;
  lab_name?: string;
  hsp_account_id?: string;
}

// Helper function to process bone marrow data
async function processBoneMarrow(fileContent: string) {
  const { data } = parse<BoneMarrowRow>(fileContent, { header: true, skipEmptyLines: true })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues with sequences
  const adminClient = getSupabaseAdminClient()

  for (const row of data) {
    try {
      // Check for existing record with the same order_id
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as any)
        .from('bone_marrow')
        .select('*')
        .eq('patient_mrn', row.patient_mrn)
        .eq('order_id', row.order_id)
        .eq('component_id', row.component_id)
      
      if (queryError) {
        console.error('Error querying for existing bone marrow record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate bone marrow record:', row.order_id)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as any)
        .from('bone_marrow')
        .insert({
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          order_id: row.order_id,
          result_time: parseDate(row.result_time),
          lab_code: cleanString(row.lab_code),
          lab_name: cleanString(row.lab_name),
          component_id: cleanString(row.component_id),
          lab_component_description: cleanString(row.lab_component_description),
          bone_marrow_results_by_component: row.bone_marrow_results_by_component
        })
      
      if (error) throw error
      results.created++
    } catch (error) {
      console.error('Error processing bone marrow row:', error)
      results.skipped++
    }
  }

  return `Processed bone marrow: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to process inpatient admissions data
async function processIPAdmissions(fileContent: string) {
  const { data } = parse<IPAdmissionsRow>(fileContent, { header: true, skipEmptyLines: true })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data) {
    try {
      // Check for existing admission with the same account ID and admission time
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as any)
        .from('ip_admissions')
        .select('*')
        .eq('patient_mrn', row.patient_mrn)
        .eq('hsp_account_id', row.hsp_account_id)
        .eq('adm_date_time', parseDate(row.adm_date_time))
      
      if (queryError) {
        console.error('Error querying for existing admission record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate admission:', row.hsp_account_id)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as any)
        .from('ip_admissions')
        .insert({
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          adm_date_time: parseDate(row.adm_date_time) || undefined,
          disch_date_time: parseDate(row.disch_date_time) || undefined,
          adm_source: cleanString(row.adm_source, 100),
          adm_type: cleanString(row.adm_type, 100),
          disch_disp: cleanString(row.disch_disp, 100),
          adm_dx_cd: cleanString(row.adm_dx_cd),
          adm_dx_description: cleanString(row.adm_dx_description, 500),
          disch_dx_cd: cleanString(row.disch_dx_cd),
          disch_dx_description: cleanString(row.disch_dx_description, 500)
        })
      
      if (error) throw error
      results.created++
    } catch (error) {
      console.error('Error processing IP admissions row:', error)
      results.skipped++
    }
  }

  return `Processed IP admissions: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to process outpatient AVS medications data
async function processOPAVSMeds(fileContent: string) {
  const { data } = parse<OPAVSMedsRow>(fileContent, { header: true, skipEmptyLines: true })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data) {
    try {
      // Check for existing medication with the same visit date and medication
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as any)
        .from('op_medications')
        .select('*')
        .eq('patient_mrn', row.patient_mrn)
        .eq('hsp_account_id', row.hsp_account_id)
        .eq('visit_date', parseDate(row.visit_date))
        .eq('generic_description', `${cleanString(row.medication_name, 200)} ${row.medication_dose} ${row.medication_route} ${row.medication_frequency} ${row.medication_duration}`)
      
      if (queryError) {
        console.error('Error querying for existing medication record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate medication:', row.medication_name)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as any)
        .from('op_medications')
        .insert({
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          visit_date: parseDate(row.visit_date) || undefined,
          order_med_id: null,
          order_dttm: parseDate(row.visit_date) || undefined,
          rx_status: cleanString(row.medication_status, 50),
          generic_description: `${cleanString(row.medication_name, 200)} ${row.medication_dose} ${row.medication_route} ${row.medication_frequency} ${row.medication_duration}`
        })
      
      if (error) throw error
      results.created++
    } catch (error) {
      console.error('Error processing OP AVS medications row:', error)
      results.skipped++
    }
  }

  return `Processed OP medications: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to process outpatient visits data
async function processOPVisits(fileContent: string) {
  const { data } = parse<OPVisitsRow>(fileContent, { header: true, skipEmptyLines: true })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data) {
    try {
      // Check for existing visit with the same account ID and visit date
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as any)
        .from('op_visits')
        .select('*')
        .eq('patient_mrn', row.patient_mrn)
        .eq('hsp_account_id', row.hsp_account_id)
        .eq('visit_date', parseDate(row.visit_date))
      
      if (queryError) {
        console.error('Error querying for existing visit record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate visit:', row.hsp_account_id)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as any)
        .from('op_visits')
        .insert({
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          visit_date: parseDate(row.visit_date) || undefined,
          visit_type: cleanString(row.visit_type, 100),
          visit_provider: cleanString(row.visit_provider, 100),
          visit_department: cleanString(row.visit_department, 200),
          visit_status: cleanString(row.visit_status, 50),
          visit_dx_cd_1: cleanString(row.visit_dx_cd_1),
          visit_dx_description_1: cleanString(row.visit_dx_description_1, 500),
          visit_dx_cd_2: cleanString(row.visit_dx_cd_2),
          visit_dx_description_2: cleanString(row.visit_dx_description_2, 500),
          visit_dx_cd_3: cleanString(row.visit_dx_cd_3),
          visit_dx_description_3: cleanString(row.visit_dx_description_3, 500)
        })
      
      if (error) throw error
      results.created++
    } catch (error) {
      console.error('Error processing OP visits row:', error)
      results.skipped++
    }
  }

  return `Processed OP visits: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to process inpatient medications data
async function processIPMeds(fileContent: string) {
  const { data } = parse<IPMedsRow>(fileContent, { header: true, skipEmptyLines: true })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data) {
    try {
      // Check for existing medication with the same account ID, medication, and start date
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as any)
        .from('ip_medications')
        .select('*')
        .eq('patient_mrn', row.patient_mrn)
        .eq('hsp_account_id', row.hsp_account_id)
        .eq('medication', row.medication_name)
        .eq('taken_time', parseDate(row.medication_start_date))
      
      if (queryError) {
        console.error('Error querying for existing medication record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate medication:', row.medication_name)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as any)
        .from('ip_medications')
        .insert({
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          adm_date_time: parseDate(row.order_date) || undefined,
          disch_date_time: parseDate(row.medication_end_date) || undefined,
          medication: cleanString(row.medication_name, 200),
          dosage: cleanString(row.medication_dose, 100),
          unit: cleanString(row.medication_route, 50),
          frequency: cleanString(row.medication_frequency, 100),
          taken_time: parseDate(row.medication_start_date) || undefined,
          rx_class_name: cleanString(row.medication_indication, 100)
        })
      
      if (error) throw error
      results.created++
    } catch (error) {
      console.error('Error processing IP medications row:', error)
      results.skipped++
    }
  }

  return `Processed IP medications: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to process labs data
async function processLabs(fileContent: string): Promise<{ message: string; created: number; updated: number; skipped: number }> {
  const { data } = parse<LabsRow>(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toUpperCase()
  })
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues with sequences
  const adminClient = getSupabaseAdminClient()
  // Regular client is still used for patient existence check
  const supabase = await getSupabaseServerClient()

  for (const row of data) {
    try {
      // Check if the patient exists in the database
      const { data: patientExists } = await supabase
        .schema('phi' as any)
        .from('patients')
        .select('*')
        .eq('patient_mrn', row.PATIENT_MRN)
        .single()
      
      if (!patientExists) {
        console.warn('Skipping lab row for non-existent patient:', row.PATIENT_MRN)
        results.skipped++
        continue
      }

      // Check for existing record with the same pat_enc_csn_id and component_id
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as any)
        .from('Labs')
        .select('*')
        .eq('patient_mrn', row.PATIENT_MRN)
        .eq('pat_enc_csn_id', row.PAT_ENC_CSN_ID || '')
        .eq('component_id', row.COMPONENT_ID || '')
      
      if (queryError) {
        console.error('Error querying for existing lab record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate lab record:', row.PAT_ENC_CSN_ID, row.COMPONENT_ID)
        results.skipped++
        continue
      }

      const orderTime = row.ORDER_TIME ? parseDate(row.ORDER_TIME) : new Date();
      const resultTime = row.RESULT_TIME ? parseDate(row.RESULT_TIME) : new Date();

      const { error } = await adminClient
        .schema('clinical' as any)
        .from('Labs')
        .insert({
          patient_mrn: row.PATIENT_MRN,
          pat_enc_csn_id: row.PAT_ENC_CSN_ID || '',
          order_time: orderTime, 
          proc_code: row.PROC_CODE || '',
          proc_name: row.PROC_NAME || '',
          component_id: row.COMPONENT_ID || '',
          lab_component_description: row.LAB_COMPONENT_DESCRIPTION || '',
          lab_result_value: row.LAB_RESULT_VALUE || '',
          result_time: resultTime,
          created_at: new Date(),
          updated_at: new Date()
        })
      
      if (error) throw error
      results.created++
    } catch (error) {
      console.error('Error processing lab row:', error)
      results.skipped++
    }
  }

  return {
    message: `Processed labs: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
    created: results.created,
    updated: results.updated,
    skipped: results.skipped
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    
    // Add detailed debugging
    console.log('Form data keys:', Array.from(formData.keys()));
    console.log('Form data entries:', Array.from(formData.entries()).map(([key, value]) => {
      if (value instanceof File) {
        return `${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`;
      }
      return `${key}: ${value}`;
    }));
    
    const files = formData.getAll('files') as File[]
    const dataTypes = formData.getAll('dataTypes') as string[]
    
    if (files.length === 0) {
      console.error('No files provided in request');
      return Response.json({ error: 'No files provided' }, { status: 400 })
    }

    if (dataTypes.length === 0) {
      console.error('Data types not specified in request');
      return Response.json({ error: 'Data types not specified' }, { status: 400 })
    }

    if (files.length !== dataTypes.length) {
      console.error('Mismatched number of files and data types');
      return Response.json({ error: 'Mismatched number of files and data types' }, { status: 400 })
    }

    console.log('Processing files:', files.map((f, i) => `${f.name} as ${dataTypes[i]}`));

    const results = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataType = dataTypes[i] as DataType;
      
      try {
        const fileContent = await file.text();
        
        let result;
        let stats = {
          created: 0,
          updated: 0, 
          skipped: 0
        };

        // Process different data types
        switch (dataType) {
          case 'demographics':
            result = await processDemographics(fileContent)
            break
          case 'labs':
            const labResult = await processLabs(fileContent)
            result = labResult.message
            stats = {
              created: labResult.created,
              updated: labResult.updated,
              skipped: labResult.skipped
            }
            break
          case 'bone_marrow':
          case 'bonemarrow': // Support both formats
            result = await processBoneMarrow(fileContent)
            break
          case 'ip_admissions':
          case 'ipadmissions': // Support both formats
            result = await processIPAdmissions(fileContent)
            break
          case 'op_visits':
          case 'opvisits': // Support both formats
            result = await processOPVisits(fileContent)
            break
          case 'ip_medications':
          case 'ipmeds': // Support both formats
            result = await processIPMeds(fileContent)
            break
          case 'op_medications':
          case 'opavsmeds': // Support both formats
            result = await processOPAVSMeds(fileContent)
            break
          default:
            throw new Error(`Unsupported data type: ${dataType}`)
        }

        results.push({ 
          file: file.name, 
          type: dataType, 
          result,
          stats
        })
      } catch (error) {
        console.error('Error processing file:', file.name, error)
        results.push({ 
          file: file.name, 
          type: dataType, 
          error: error instanceof Error ? error.message : String(error),
          stats: {
            created: 0,
            updated: 0,
            skipped: 0
          }
        })
      }
    }

    return Response.json({ 
      message: `Processed ${files.length} files`, 
      results 
    })
  } catch (error) {
    console.error('Error in data import route:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500 
    })
  }
} 
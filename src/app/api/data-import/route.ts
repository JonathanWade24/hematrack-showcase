import { getSupabaseServerClient, getSupabaseAdminClient } from '@/lib/supabase/db'
import { parse } from 'papaparse'

type DataType = 
  | 'demographics' 
  | 'labs' 
  | 'bone_marrow' | 'bonemarrow' 
  | 'ip_admissions' | 'ipadmissions'
  | 'op_visits' | 'opvisits'
  | 'ip_medications' | 'ipmeds'
  | 'op_medications' | 'opavsmeds'
  | 'ip_visits' | 'ipvisits';

type SchemaName = 'phi' | 'clinical';

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
    // Handle the problematic timezone formats
    let cleanDateStr = dateStr.trim();
    
    // Check for PostgreSQL timestamp with timezone format: "2023-08-12 16:52:18.561630+00"
    const pgTimestampPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\.?\d*([+-]\d{2})?/;
    const pgMatch = cleanDateStr.match(pgTimestampPattern);
    if (pgMatch) {
      // Just use the main timestamp part without fractional seconds
      cleanDateStr = pgMatch[1];
      console.log(`Fixed PostgreSQL timestamp format: "${dateStr}" -> "${cleanDateStr}"`);
    }
    
    // First try direct matching of the specific problematic formats
    const gmtPattern = /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\s+gmt[+-]\d{4}/i;
    const isoPattern = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+gmt[+-]\d{4}/i;
    
    // Check for the specific problematic format and extract just the date part
    let match = cleanDateStr.match(gmtPattern) || cleanDateStr.match(isoPattern);
    if (match) {
      cleanDateStr = match[1];
      console.log(`Fixed problematic timezone format: "${dateStr}" -> "${cleanDateStr}"`);
    } else {
      // Apply more aggressive timezone cleanup
      cleanDateStr = cleanDateStr.replace(/\s*gmt[+-]\d{4}\s*/gi, '');
      cleanDateStr = cleanDateStr.replace(/\s*utc[+-]\d{4}\s*/gi, '');
      cleanDateStr = cleanDateStr.replace(/\s*[+-]\d{4}\s*$/gi, ''); // Remove trailing +0000 style timezone
      cleanDateStr = cleanDateStr.replace(/\s*\([A-Z]{3,4}\)\s*/gi, ''); // Remove (EDT), (EST), etc.
      cleanDateStr = cleanDateStr.replace(/\s*[A-Z]{3,4}\s*$/gi, ''); // Remove trailing EDT, EST, etc.
    }
    
    // Try different date parsing approaches
    
    // 1. Try standard Date parsing
    let date = new Date(cleanDateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // 2. Try to manually parse common US date formats
    
    // MM/DD/YYYY
    const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/;
    match = cleanDateStr.match(mmddyyyy);
    if (match) {
      const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // MM/DD/YYYY HH:MM:SS AM/PM
    const mmddyyyyTime = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i;
    match = cleanDateStr.match(mmddyyyyTime);
    if (match) {
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      let hours = parseInt(match[4]);
      const minutes = parseInt(match[5]);
      const seconds = parseInt(match[6]);
      const ampm = match[7]?.toUpperCase();
      
      // Adjust hours for 12-hour clock if AM/PM is specified
      if (ampm) {
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
      
      date = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // If all attempts fail, log the error and return null
    console.error('Could not parse date string:', dateStr, '(cleaned to:', cleanDateStr, ')');
    return null;
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
        .schema('phi' as SchemaName)
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
          .schema('phi' as SchemaName)
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
          .schema('phi' as SchemaName)
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
  const { data } = parse(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim() 
  })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues with sequences
  const adminClient = getSupabaseAdminClient()

  for (const row of data as ParsedRow[]) {
    try {
      const patientMrn = getValue(row, 'patient_mrn')
      const hspAccountId = getValue(row, 'hsp_account_id')
      const orderId = getValue(row, 'order_id')
      const componentId = getValue(row, 'component_id')
      
      if (!patientMrn) {
        console.warn('Skipping bone marrow row with empty MRN')
        results.skipped++
        continue
      }

      // Check for existing record with the same order_id
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('bone_marrow')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('order_id', orderId || '')
        .eq('component_id', componentId || '')
      
      if (queryError) {
        console.error('Error querying for existing bone marrow record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate bone marrow record:', orderId)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as SchemaName)
        .from('bone_marrow')
        .insert({
          patient_mrn: patientMrn,
          hsp_account_id: hspAccountId || '',
          order_id: orderId,
          result_time: parseDate(getValue(row, 'result_time')) || new Date(),
          lab_code: cleanString(getValue(row, 'lab_code')),
          lab_name: cleanString(getValue(row, 'lab_name')),
          component_id: componentId,
          lab_component_description: cleanString(getValue(row, 'lab_component_description')),
          bone_marrow_results_by_component: getValue(row, 'bone_marrow_results_by_component')
        })
      
      if (error) {
        console.error('Error inserting bone marrow record:', error, row);
        throw error;
      }
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
  // Pre-process the file content to remove problematic timezone strings before parsing
  fileContent = fileContent.replace(/gmt[+-]\d{4}/gi, '');

  const { data } = parse(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim() 
  })
  
  const results = {
    created: 0,
    skipped: 0,
    patientsCreated: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  // Check if the table exists, create it if it doesn't - this isn't necessary now as we know the table exists
  // and has a specific structure that doesn't match what we initially expected

  for (const row of data as ParsedRow[]) {
    try {
      const patientMrn = getValue(row, 'PATIENT_MRN')
      const hspAccountId = getValue(row, 'HSP_ACCOUNT_ID')
      const admDateTime = getValue(row, 'ADM_DATE_TIME')

      if (!patientMrn) {
        console.warn('Skipping IP admission row with empty MRN')
        results.skipped++
        continue
      }

      // Check if patient exists
      const { data: existingPatient, error: patientQueryError } = await adminClient
        .schema('phi' as SchemaName)
        .from('patients')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .maybeSingle()
      
      if (patientQueryError) {
        console.error('Error querying for existing patient:', patientQueryError);
        throw patientQueryError;
      }

      // Create a placeholder patient record if it doesn't exist
      if (!existingPatient) {
        console.log(`Patient ${patientMrn} not found, creating placeholder record...`);
        const { error: createPatientError } = await adminClient
          .schema('phi' as SchemaName)
          .from('patients')
          .insert({
            patient_mrn: patientMrn,
            first_name: 'Placeholder',
            last_name: 'Patient',
            created_at: new Date(),
            updated_at: new Date()
          })
        
        if (createPatientError) {
          console.error('Error creating placeholder patient record:', createPatientError);
          throw createPatientError;
        }
        results.patientsCreated++;
      }

      // Clean any timezone strings that might have remained in the data
      const cleanAdmDateTime = admDateTime ? admDateTime.replace(/gmt[+-]\d{4}/gi, '').trim() : null;
      
      // Parse the date first, before using it in the query
      const parsedAdmDate = parseDate(cleanAdmDateTime)
      if (!parsedAdmDate && cleanAdmDateTime) {
        console.warn('Skipping row with invalid admission date:', cleanAdmDateTime)
        results.skipped++
        continue
      }

      // Use a default date if needed (current date)
      const admDateToUse = parsedAdmDate || new Date()
      
      // Format the date as a simple ISO string without timezone for PostgreSQL
      // This converts to YYYY-MM-DD HH:MM:SS format that PostgreSQL understands
      const formattedAdmDate = admDateToUse.toISOString().replace('T', ' ').split('.')[0]
      
      // Check for existing admission with the same account ID and admission time
      // Use database column names that actually exist
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('ip_admissions')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('hsp_account_id', hspAccountId || '')
        .eq('adm_date_time', formattedAdmDate)
      
      if (queryError) {
        console.error('Error querying for existing admission record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate admission:', hspAccountId)
        results.skipped++
        continue
      }

      // Parse discharge date
      const dischDateTime = getValue(row, 'DISCH_DATE_TIME')
      const cleanDischDateTime = dischDateTime ? dischDateTime.replace(/gmt[+-]\d{4}/gi, '').trim() : null;
      const parsedDischDate = parseDate(cleanDischDateTime)
      
      // Format the discharge date the same way
      const formattedDischDate = parsedDischDate 
        ? parsedDischDate.toISOString().replace('T', ' ').split('.')[0]
        : null

      // Get diagnosis codes and disposition info from CSV
      const admSource = getValue(row, 'ADM_SOURCE')
      const admType = getValue(row, 'ADM_TYPE') 
      const dischDisp = getValue(row, 'DISCH_DISP')
      const admDxCd = getValue(row, 'ADM_DX_CD')
      const admDxDescription = getValue(row, 'ADM_DX_DESCRIPTION')
      const dischDxCd = getValue(row, 'DISCH_DX_CD')
      const dischDxDescription = getValue(row, 'DISCH_DX_DESCRIPTION')

      // Insert using the correct database column names that match the actual table
      const { error } = await adminClient
        .schema('clinical' as SchemaName)
        .from('ip_admissions')
        .insert({
          patient_mrn: patientMrn,
          hsp_account_id: hspAccountId || '',
          adm_date_time: formattedAdmDate,
          disch_date_time: formattedDischDate,
          // Map to the correct column names based on actual database schema
          // admit_dx_cd_1 instead of adm_dx_cd
          admit_dx_cd_1: cleanString(admDxCd),
          admit_dx_description_1: cleanString(admDxDescription, 500),
          // Map discharge diagnosis to final_dx fields
          final_dx_cd_1: cleanString(dischDxCd),
          final_dx_description_1: cleanString(dischDxDescription, 500),
          // Map other fields
          discharge_disposition: cleanString(dischDisp, 100)
        })
      
      if (error) {
        console.error('Error inserting IP admission record:', error, row);
        throw error;
      }
      results.created++
    } catch (error) {
      console.error('Error processing IP admissions row:', error)
      results.skipped++
    }
  }

  return `Processed IP admissions: ${results.created} created, ${results.skipped} skipped, ${results.patientsCreated} patients auto-created`
}

// Helper function to process outpatient AVS medications data
async function processOPAVSMeds(fileContent: string) {
  const { data } = parse(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim() 
  })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data as ParsedRow[]) {
    try {
      const patientMrn = getValue(row, 'patient_mrn')
      const hspAccountId = getValue(row, 'hsp_account_id')
      const visitDate = getValue(row, 'visit_date')
      const medicationName = getValue(row, 'medication_name')
      const medicationDose = getValue(row, 'medication_dose')
      const medicationRoute = getValue(row, 'medication_route')
      const medicationFrequency = getValue(row, 'medication_frequency')
      const medicationDuration = getValue(row, 'medication_duration')
      const medicationStatus = getValue(row, 'medication_status')
      
      if (!patientMrn) {
        console.warn('Skipping OP AVS medication row with empty MRN')
        results.skipped++
        continue
      }
      
      // Generate a consistent description for medication
      const genericDescription = `${cleanString(medicationName, 200) || ''} ${medicationDose || ''} ${medicationRoute || ''} ${medicationFrequency || ''} ${medicationDuration || ''}`.trim()

      // Check for existing medication with the same visit date and medication
      const parsedVisitDate = parseDate(visitDate)
      
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('op_medications')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('hsp_account_id', hspAccountId || '')
        .eq('generic_description', genericDescription)
      
      if (queryError) {
        console.error('Error querying for existing medication record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate medication:', medicationName)
        results.skipped++
        continue
      }

      const { error } = await adminClient
        .schema('clinical' as SchemaName)
        .from('op_medications')
        .insert({
          patient_mrn: patientMrn,
          hsp_account_id: hspAccountId || '',
          visit_date: parsedVisitDate,
          order_med_id: null,
          order_dttm: parsedVisitDate,
          rx_status: cleanString(medicationStatus, 50),
          generic_description: genericDescription
        })
      
      if (error) {
        console.error('Error inserting OP medication record:', error, row);
        throw error;
      }
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
  const { data } = parse(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim() 
  })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  // First, check the actual table structure
  console.log('Checking op_visits table structure...')
  try {
    const { data: columns, error: columnsError } = await adminClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'clinical')
      .eq('table_name', 'op_visits')
      .order('ordinal_position', { ascending: true })
    
    if (columnsError) {
      console.error('Error fetching columns for op_visits:', columnsError)
    } else if (columns) {
      console.log('Columns in op_visits:', columns.map(c => c.column_name))
    }
  } catch (columnError) {
    console.error('Error fetching columns info:', columnError)
  }

  for (const row of data as ParsedRow[]) {
    try {
      const patientMrn = getValue(row, 'patient_mrn')
      const hspAccountId = getValue(row, 'hsp_account_id')
      const visitDate = getValue(row, 'visit_date')
      const visitType = getValue(row, 'visit_type')
      const visitProvider = getValue(row, 'visit_provider')
      const visitDepartment = getValue(row, 'visit_department')
      
      // Get diagnosis codes and descriptions
      const visitDxCd1 = getValue(row, 'visit_dx_cd_1')
      const visitDxDescription1 = getValue(row, 'visit_dx_description_1')
      const visitDxCd2 = getValue(row, 'visit_dx_cd_2')
      const visitDxDescription2 = getValue(row, 'visit_dx_description_2')
      const visitDxCd3 = getValue(row, 'visit_dx_cd_3')
      const visitDxDescription3 = getValue(row, 'visit_dx_description_3')
      
      if (!patientMrn) {
        console.warn('Skipping OP visit row with empty MRN')
        results.skipped++
        continue
      }
      
      // Parse dates with validation
      const parsedVisitDate = parseDate(visitDate)
      if (!parsedVisitDate && visitDate) {
        console.warn('Skipping OP visit with invalid date:', visitDate)
        results.skipped++
        continue
      }

      // Check for existing visit
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('op_visits')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('hsp_account_id', hspAccountId || '')
      
      if (queryError) {
        console.error('Error querying for existing visit record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate visit:', hspAccountId)
        results.skipped++
        continue
      }

      // Use default date if needed
      const defaultDate = parsedVisitDate || new Date();
      
      // Combine diagnosis codes into a JSON array for current_icd10_list
      const diagnosisCodes = []
      if (visitDxCd1) diagnosisCodes.push(visitDxCd1)
      if (visitDxCd2) diagnosisCodes.push(visitDxCd2)
      if (visitDxCd3) diagnosisCodes.push(visitDxCd3)
      
      // Combine diagnosis descriptions for dx_name field
      const diagnosisDescriptions = []
      if (visitDxDescription1) diagnosisDescriptions.push(visitDxDescription1)
      if (visitDxDescription2) diagnosisDescriptions.push(visitDxDescription2)
      if (visitDxDescription3) diagnosisDescriptions.push(visitDxDescription3)
      
      try {
        const { error } = await adminClient
          .schema('clinical' as SchemaName)
          .from('op_visits')
          .insert({
            patient_mrn: patientMrn,
            hsp_account_id: hspAccountId || '',
            visit_date: defaultDate,
            visit_type: cleanString(visitType, 100),
            department_name: cleanString(visitDepartment, 200),  // Map visit_department to department_name
            current_icd10_list: diagnosisCodes.length > 0 ? diagnosisCodes : null,  // Store as array
            dx_name: diagnosisDescriptions.length > 0 ? diagnosisDescriptions.join('; ') : null  // Join with semicolon
          })
        
        if (error) {
          console.error('Error inserting OP visit record:', error, row);
          throw error;
        }
        results.created++
      } catch (error) {
        // Log the error but continue processing
        console.error('Error processing OP visits row:', error)
        results.skipped++
      }
    } catch (error) {
      console.error('Error processing OP visits row:', error)
      results.skipped++
    }
  }

  return `Processed OP visits: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to process inpatient medications data
async function processIPMeds(fileContent: string) {
  const { data } = parse(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim() 
  })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data as ParsedRow[]) {
    try {
      const patientMrn = getValue(row, 'patient_mrn')
      const hspAccountId = getValue(row, 'hsp_account_id')
      const orderDate = getValue(row, 'order_date')
      const medicationName = getValue(row, 'medication_name')
      const medicationDose = getValue(row, 'medication_dose')
      const medicationRoute = getValue(row, 'medication_route')
      const medicationFrequency = getValue(row, 'medication_frequency')
      const medicationStartDate = getValue(row, 'medication_start_date')
      const medicationEndDate = getValue(row, 'medication_end_date')
      const medicationIndication = getValue(row, 'medication_indication')
      
      if (!patientMrn) {
        console.warn('Skipping IP medication row with empty MRN')
        results.skipped++
        continue
      }
      
      // Parse dates with validation
      const parsedOrderDate = parseDate(orderDate)
      const parsedStartDate = parseDate(medicationStartDate)
      const parsedEndDate = parseDate(medicationEndDate)
      
      // Skip records with invalid required dates
      if (!parsedStartDate && medicationStartDate) {
        console.warn('Skipping IP medication with invalid start date:', medicationStartDate)
        results.skipped++
        continue
      }

      // Check for existing medication
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('ip_medications')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('hsp_account_id', hspAccountId || '')
        .eq('medication', cleanString(medicationName, 200) || '')
      
      if (queryError) {
        console.error('Error querying for existing medication record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate medication:', medicationName)
        results.skipped++
        continue
      }

      // Use a default date if needed (current date)
      const defaultDate = new Date();
      
      const { error } = await adminClient
        .schema('clinical' as SchemaName)
        .from('ip_medications')
        .insert({
          patient_mrn: patientMrn,
          hsp_account_id: hspAccountId || '',
          adm_date_time: parsedOrderDate || defaultDate,
          disch_date_time: parsedEndDate,
          medication: cleanString(medicationName, 200) || 'Unknown Medication',
          dosage: cleanString(medicationDose, 100),
          unit: cleanString(medicationRoute, 50),
          frequency: cleanString(medicationFrequency, 100),
          taken_time: parsedStartDate || defaultDate,
          rx_class_name: cleanString(medicationIndication, 100)
        })
      
      if (error) {
        console.error('Error inserting IP medication record:', error, row);
        throw error;
      }
      
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
    try {
      const patientMrn = getValue(row, 'patient_mrn')
      const patEncCsnId = getValue(row, 'pat_enc_csn_id')
      const orderTime = getValue(row, 'order_time')
      const resultTime = getValue(row, 'result_time')
      const procCode = getValue(row, 'proc_code')
      const procName = getValue(row, 'proc_name')
      const componentId = getValue(row, 'component_id')
      const labComponentDescription = getValue(row, 'lab_component_description')
      const labResultValue = getValue(row, 'lab_result_value')
      
      if (!patientMrn) {
        console.warn('Skipping lab row with empty MRN')
        results.skipped++
        continue
      }
      
      // Parse dates with validation
      const parsedOrderTime = parseDate(orderTime)
      const parsedResultTime = parseDate(resultTime)
      
      if (!parsedOrderTime && orderTime) {
        console.warn('Skipping lab with invalid order time:', orderTime)
        results.skipped++
        continue
      }

      if (!parsedResultTime && resultTime) {
        console.warn('Skipping lab with invalid result time:', resultTime)
        results.skipped++
        continue
      }

      // Check for existing lab result - Note the capital 'L' in 'Labs'
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('Labs')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('pat_enc_csn_id', patEncCsnId || '')
        .eq('component_id', componentId || '')
      
      if (queryError) {
        console.error('Error querying for existing lab record:', queryError);
        throw queryError;
      }
      
      // If we have result time, filter matches manually to avoid timestamp comparisons in the database
      let isDuplicate = false;
      if (existing && existing.length > 0 && parsedResultTime) {
        const resultTimeStr = parsedResultTime.toISOString().split('T')[0]; // Just compare the date part
        
        isDuplicate = existing.some(record => {
          if (!record.result_time) return false;
          const existingTimeStr = new Date(record.result_time).toISOString().split('T')[0];
          return existingTimeStr === resultTimeStr;
        });
        
        if (isDuplicate) {
          console.warn('Skipping duplicate lab result:', componentId);
          results.skipped++;
          continue;
        }
      } else if (existing && existing.length > 0) {
        // If no result time to compare, consider it a duplicate if the other fields match
        console.warn('Skipping duplicate lab result (matching patient/component):', componentId);
        results.skipped++;
        continue;
      }

      // Use default date if needed
      const defaultOrderTime = parsedOrderTime || new Date();
      const defaultResultTime = parsedResultTime || defaultOrderTime;
      
      // Note the capital 'L' in 'Labs'
      const { error } = await adminClient
        .schema('clinical' as SchemaName)
        .from('Labs')
        .insert({
          patient_mrn: patientMrn,
          pat_enc_csn_id: patEncCsnId || '',
          order_time: defaultOrderTime,
          result_time: defaultResultTime,
          proc_code: cleanString(procCode),
          proc_name: cleanString(procName, 200),
          component_id: cleanString(componentId),
          lab_component_description: cleanString(labComponentDescription, 500),
          lab_result_value: cleanString(labResultValue, 500)
        })
      
      if (error) {
        console.error('Error inserting lab record:', error, row);
        throw error;
      }
      results.created++
    } catch (error) {
      console.error('Error processing labs row:', error)
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

// Helper function to process inpatient visits data
async function processIPVisits(fileContent: string) {
  const { data } = parse(fileContent, { 
    header: true, 
    skipEmptyLines: true,
    transformHeader: (header) => header.trim() 
  })
  
  const results = {
    created: 0,
    skipped: 0
  }

  // Use admin client to bypass permission issues
  const adminClient = getSupabaseAdminClient()

  for (const row of data as ParsedRow[]) {
    try {
      const patientMrn = getValue(row, 'patient_mrn')
      const hspAccountId = getValue(row, 'hsp_account_id')
      const admitDate = getValue(row, 'admit_date')
      const dischargeDate = getValue(row, 'discharge_date')
      const admitSource = getValue(row, 'admit_source')
      const admitType = getValue(row, 'admit_type')
      const visitType = getValue(row, 'visit_type')
      const dischargeDisposition = getValue(row, 'discharge_disposition')
      const primaryProvider = getValue(row, 'primary_provider')
      const primaryService = getValue(row, 'primary_service')
      const roomLocation = getValue(row, 'room_location')
      const visitDxCd1 = getValue(row, 'visit_dx_cd_1')
      const visitDxDescription1 = getValue(row, 'visit_dx_description_1')
      const visitDxCd2 = getValue(row, 'visit_dx_cd_2')
      const visitDxDescription2 = getValue(row, 'visit_dx_description_2')
      const visitDxCd3 = getValue(row, 'visit_dx_cd_3')
      const visitDxDescription3 = getValue(row, 'visit_dx_description_3')
      
      if (!patientMrn) {
        console.warn('Skipping IP visit row with empty MRN')
        results.skipped++
        continue
      }
      
      // Parse dates with validation
      const parsedAdmitDate = parseDate(admitDate)
      const parsedDischargeDate = parseDate(dischargeDate)
      
      if (!parsedAdmitDate && admitDate) {
        console.warn('Skipping IP visit with invalid admit date:', admitDate)
        results.skipped++
        continue
      }

      // Check for existing visit
      const { data: existing, error: queryError } = await adminClient
        .schema('clinical' as SchemaName)
        .from('ip_visits')
        .select('*')
        .eq('patient_mrn', patientMrn)
        .eq('hsp_account_id', hspAccountId || '')
      
      if (queryError) {
        console.error('Error querying for existing IP visit record:', queryError);
        throw queryError;
      }
      
      if (existing && existing.length > 0) {
        console.warn('Skipping duplicate IP visit:', hspAccountId)
        results.skipped++
        continue
      }

      // Use default date if needed
      const defaultAdmitDate = parsedAdmitDate || new Date();
      
      const { error } = await adminClient
        .schema('clinical' as SchemaName)
        .from('ip_visits')
        .insert({
          patient_mrn: patientMrn,
          hsp_account_id: hspAccountId || '',
          admit_date: defaultAdmitDate,
          discharge_date: parsedDischargeDate,
          admit_source: cleanString(admitSource, 100),
          admit_type: cleanString(admitType, 100),
          visit_type: cleanString(visitType, 100),
          discharge_disposition: cleanString(dischargeDisposition, 200),
          primary_provider: cleanString(primaryProvider, 100),
          primary_service: cleanString(primaryService, 100),
          room_location: cleanString(roomLocation, 100),
          visit_dx_cd_1: cleanString(visitDxCd1),
          visit_dx_description_1: cleanString(visitDxDescription1, 500),
          visit_dx_cd_2: cleanString(visitDxCd2),
          visit_dx_description_2: cleanString(visitDxDescription2, 500),
          visit_dx_cd_3: cleanString(visitDxCd3),
          visit_dx_description_3: cleanString(visitDxDescription3, 500)
        })
      
      if (error) {
        console.error('Error inserting IP visit record:', error, row);
        throw error;
      }
      results.created++
    } catch (error) {
      console.error('Error processing IP visits row:', error)
      results.skipped++
    }
  }

  return `Processed IP visits: ${results.created} created, ${results.skipped} skipped`
}

// Helper function to detect the correct data type based on column headers
function detectDataType(headers: string[]): DataType | null {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
  
  // Check for specific identifying columns to detect data type
  if (normalizedHeaders.includes('medication_name') && normalizedHeaders.includes('visit_date')) {
    console.log('Detected OP AVS Medications from headers')
    return 'opavsmeds'
  }
  
  if (normalizedHeaders.includes('medication_name') && normalizedHeaders.includes('adm_date_time')) {
    console.log('Detected IP Medications from headers')
    return 'ipmeds'
  }
  
  if (normalizedHeaders.includes('visit_type') && normalizedHeaders.includes('visit_provider')) {
    console.log('Detected OP Visits from headers')
    return 'opvisits'
  }
  
  if (normalizedHeaders.includes('adm_date_time') && normalizedHeaders.includes('discharge_disposition')) {
    console.log('Detected IP Admissions from headers')
    return 'ipadmissions'
  }
  
  if (normalizedHeaders.includes('admit_date') && normalizedHeaders.includes('discharge_date')) {
    console.log('Detected IP Visits from headers')
    return 'ipvisits'
  }
  
  if (normalizedHeaders.includes('component_id') && normalizedHeaders.includes('lab_result_value')) {
    console.log('Detected Labs from headers')
    return 'labs'
  }
  
  if (normalizedHeaders.includes('lab_component_description') && normalizedHeaders.includes('bone_marrow_results_by_component')) {
    console.log('Detected Bone Marrow from headers')
    return 'bonemarrow'
  }
  
  if (normalizedHeaders.includes('birth_date') || (normalizedHeaders.includes('gender') && normalizedHeaders.includes('race'))) {
    console.log('Detected Demographics/Patients from headers')
    return 'demographics'
  }
  
  console.log('Could not detect data type from headers:', normalizedHeaders)
  return null
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
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
        
        // Parse the headers to detect the correct data type
        const { data, meta } = parse(fileContent, { 
          header: true, 
          skipEmptyLines: true,
          transformHeader: (header) => header.trim() 
        })
        
        // Validate data type based on headers
        const detectedType = detectDataType(meta.fields || [])
        
        if (detectedType && detectedType !== dataType.toLowerCase() && 
            !(dataType.toLowerCase() === 'opavsmeds' && detectedType === 'op_medications') &&
            !(dataType.toLowerCase() === 'ipmeds' && detectedType === 'ip_medications') &&
            !(dataType.toLowerCase() === 'ipvisits' && detectedType === 'ip_visits')) {
            
          console.warn(`Data type mismatch: File appears to be ${detectedType} but was uploaded as ${dataType}`);
          
          // Include a warning in the result
          results.push({ 
            file: file.name, 
            type: dataType, 
            error: `Warning: File appears to contain ${detectedType} data but was uploaded as ${dataType}. Processing may fail.`,
            stats: {
              created: 0,
              updated: 0,
              skipped: 0
            }
          })
          
          continue; // Skip processing this file
        }
        
        let result;
        let stats = {
          created: 0,
          updated: 0, 
          skipped: 0
        };

        // Process different data types
        switch (dataType.toLowerCase()) {
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
          case 'bonemarrow':
            result = await processBoneMarrow(fileContent)
            break
          case 'ip_admissions':
          case 'ipadmissions':
            result = await processIPAdmissions(fileContent)
            break
          case 'op_visits':
          case 'opvisits':
            result = await processOPVisits(fileContent)
            break
          case 'ip_medications':
          case 'ipmeds':
            result = await processIPMeds(fileContent)
            break
          case 'op_medications':
          case 'opavsmeds':
            result = await processOPAVSMeds(fileContent)
            break
          case 'ip_visits':
          case 'ipvisits':
            result = await processIPVisits(fileContent)
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
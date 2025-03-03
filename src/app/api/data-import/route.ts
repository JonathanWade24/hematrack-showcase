import { NextResponse } from 'next/server'
import { prisma } from '@/db'
import { parse } from 'papaparse'

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
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

// Helper function to clean strings
function cleanString(str: string | null, maxLength = 50): string | null {
  if (!str) return null
  const cleaned = str.trim()
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned
}

// Helper function to validate if a row is a header row
function isHeaderRow(row: ParsedRow): boolean {
  const values = Object.values(row).map(v => v?.toLowerCase().trim())
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
      const existingPatient = await prisma.patients.findUnique({
        where: { patient_mrn: mrn }
      })

      if (existingPatient) {
        // Update existing patient
        await prisma.patients.update({
          where: { patient_mrn: mrn },
          data: {
            first_name: cleanString(firstName),
            last_name: cleanString(lastName),
            birth_date: parseDate(getValue(row, 'birth_date')),
            sex: cleanString(getValue(row, 'gender') || getValue(row, 'sex')),
            race: cleanString(getValue(row, 'race')),
            ethnicity: cleanString(getValue(row, 'ethnicity')),
            updated_at: new Date()
          }
        })
        results.updated++
      } else {
        // Create new patient
        await prisma.patients.create({
          data: {
            patient_mrn: mrn,
            first_name: cleanString(firstName),
            last_name: cleanString(lastName),
            birth_date: parseDate(getValue(row, 'birth_date')),
            sex: cleanString(getValue(row, 'gender') || getValue(row, 'sex')),
            race: cleanString(getValue(row, 'race')),
            ethnicity: cleanString(getValue(row, 'ethnicity')),
            created_at: new Date(),
            updated_at: new Date()
          }
        })
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
  PAT_ENC_CSN_ID: string;
  ORDER_TIME: string;
  PROC_CODE: string;
  PROC_NAME: string;
  COMPONENT_ID: string;
  LAB_COMPONENT_DESCRIPTION: string;
  LAB_RESULT_VALUE: string;
  RESULT_TIME: string;
}

// Helper function to process bone marrow data
async function processBoneMarrow(fileContent: string) {
  const { data } = parse<BoneMarrowRow>(fileContent, { header: true, skipEmptyLines: true })
  
  const results = {
    created: 0,
    skipped: 0
  }

  for (const row of data) {
    try {
      // Check for existing record with the same order_id
      const existing = await prisma.bone_marrow.findFirst({
        where: {
          AND: [
            { patient_mrn: row.patient_mrn },
            { order_id: row.order_id },
            { component_id: row.component_id }
          ]
        }
      })

      if (existing) {
        console.warn('Skipping duplicate bone marrow record:', row.order_id)
        results.skipped++
        continue
      }

      await prisma.bone_marrow.create({
        data: {
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          order_id: row.order_id,
          result_time: parseDate(row.result_time),
          lab_code: cleanString(row.lab_code),
          lab_name: cleanString(row.lab_name),
          component_id: cleanString(row.component_id),
          lab_component_description: cleanString(row.lab_component_description),
          bone_marrow_results_by_component: row.bone_marrow_results_by_component
        }
      })
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

  for (const row of data) {
    try {
      // Check for existing admission with the same account ID and admission time
      const existing = await prisma.ip_admissions.findFirst({
        where: {
          AND: [
            { patient_mrn: row.patient_mrn },
            { hsp_account_id: row.hsp_account_id },
            { adm_date_time: parseDate(row.adm_date_time) }
          ]
        }
      })

      if (existing) {
        console.warn('Skipping duplicate admission:', row.hsp_account_id)
        results.skipped++
        continue
      }

      await prisma.ip_admissions.create({
        data: {
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
        }
      })
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

  for (const row of data) {
    try {
      // Check for existing medication with the same visit date and medication
      const existing = await prisma.op_medications.findFirst({
        where: {
          AND: [
            { patient_mrn: row.patient_mrn },
            { hsp_account_id: row.hsp_account_id },
            { visit_date: parseDate(row.visit_date) },
            { generic_description: { contains: row.medication_name } }
          ]
        }
      })

      if (existing) {
        console.warn('Skipping duplicate medication:', row.medication_name)
        results.skipped++
        continue
      }

      await prisma.op_medications.create({
        data: {
          patient_mrn: row.patient_mrn,
          hsp_account_id: row.hsp_account_id,
          visit_date: parseDate(row.visit_date) || undefined,
          order_med_id: null,
          order_dttm: parseDate(row.visit_date) || undefined,
          rx_status: cleanString(row.medication_status, 50),
          generic_description: `${cleanString(row.medication_name, 200)} ${row.medication_dose} ${row.medication_route} ${row.medication_frequency} ${row.medication_duration}`
        }
      })
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

  for (const row of data) {
    try {
      // Check for existing visit with the same account ID and visit date
      const existing = await prisma.op_visits.findFirst({
        where: {
          AND: [
            { patient_mrn: row.patient_mrn },
            { hsp_account_id: row.hsp_account_id },
            { visit_date: parseDate(row.visit_date) }
          ]
        }
      })

      if (existing) {
        console.warn('Skipping duplicate visit:', row.hsp_account_id)
        results.skipped++
        continue
      }

      await prisma.op_visits.create({
        data: {
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
        }
      })
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

  for (const row of data) {
    try {
      // Check for existing medication with the same account ID, medication, and start date
      const existing = await prisma.ip_medications.findFirst({
        where: {
          AND: [
            { patient_mrn: row.patient_mrn },
            { hsp_account_id: row.hsp_account_id },
            { medication: row.medication_name },
            { taken_time: parseDate(row.medication_start_date) }
          ]
        }
      })

      if (existing) {
        console.warn('Skipping duplicate medication:', row.medication_name)
        results.skipped++
        continue
      }

      await prisma.ip_medications.create({
        data: {
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
        }
      })
      results.created++
    } catch (error) {
      console.error('Error processing IP medications row:', error)
      results.skipped++
    }
  }

  return `Processed IP medications: ${results.created} created, ${results.skipped} skipped`
}

// Update the processLabs function
async function processLabs(fileContent: string): Promise<{ message: string; created: number; updated: number; skipped: number }> {
  console.log('Starting labs processing...');
  
  try {
    const results = parse<LabsRow>(fileContent, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toUpperCase()
    });
    
    console.log('Parsed CSV results:', {
      data: results.data.length,
      errors: results.errors,
      meta: results.meta
    });

    if (results.errors && results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
      throw new Error('Failed to parse CSV file');
    }

    if (!results.data || !Array.isArray(results.data)) {
      throw new Error('No data found in file');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of results.data) {
      try {
        if (!row || !row.PATIENT_MRN) {
          console.error('Invalid or missing MRN in row:', row);
          skipped++;
          continue;
        }

        // Check if patient exists
        const patient = await prisma.patients.findUnique({
          where: { patient_mrn: row.PATIENT_MRN }
        });

        if (!patient) {
          console.error('Patient not found for MRN:', row.PATIENT_MRN);
          skipped++;
          continue;
        }

        const orderTime = parseDate(row.ORDER_TIME);
        const resultTime = parseDate(row.RESULT_TIME);

        // Create or update lab result
        const labData = {
          patient_mrn: row.PATIENT_MRN,
          pat_enc_csn_id: row.PAT_ENC_CSN_ID || '',
          order_time: orderTime || new Date(),
          proc_code: row.PROC_CODE || '',
          proc_name: row.PROC_NAME || '',
          component_id: row.COMPONENT_ID || '',
          lab_component_description: row.LAB_COMPONENT_DESCRIPTION || '',
          lab_result_value: row.LAB_RESULT_VALUE || '',
          result_time: resultTime || new Date()
        };

        // Use composite key to check for existing record
        const existingLab = await prisma.labs.findFirst({
          where: {
            patient_mrn: row.PATIENT_MRN,
            pat_enc_csn_id: row.PAT_ENC_CSN_ID || '',
            component_id: row.COMPONENT_ID || '',
            result_time: resultTime || new Date()
          }
        });

        if (existingLab) {
          await prisma.labs.update({
            where: { id: existingLab.id },
            data: labData
          });
          updated++;
        } else {
          await prisma.labs.create({ data: labData });
          created++;
        }
      } catch (error) {
        console.error('Error processing lab row:', error);
        skipped++;
      }
    }

    console.log('Labs processing completed:', { created, updated, skipped });

    return {
      message: `Labs processed: ${created} created, ${updated} updated, ${skipped} skipped`,
      created,
      updated,
      skipped
    };
  } catch (error) {
    console.error('Fatal error processing labs:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const files = formData.getAll('files') as File[]
  const dataTypes = formData.getAll('dataTypes') as string[]

  const results = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const dataType = dataTypes[i]
    const fileContent = await file.text()

    try {
      let result
      switch (dataType) {
        case 'demographics':
          result = await processDemographics(fileContent)
          results.push({ file: file.name, type: dataType, result })
          break
        case 'bone_marrow':
          result = await processBoneMarrow(fileContent)
          results.push({ file: file.name, type: dataType, result })
          break
        case 'labs':
          const labResult = await processLabs(fileContent)
          results.push({ 
            file: file.name, 
            type: dataType, 
            result: labResult.message,
            stats: {
              created: labResult.created,
              updated: labResult.updated,
              skipped: labResult.skipped
            }
          })
          break
        case 'ipadmissions':
          result = await processIPAdmissions(fileContent)
          results.push({ file: file.name, type: dataType, result })
          break
        case 'opavsmeds':
          result = await processOPAVSMeds(fileContent)
          results.push({ file: file.name, type: dataType, result })
          break
        case 'opvisits':
          result = await processOPVisits(fileContent)
          results.push({ file: file.name, type: dataType, result })
          break
        case 'ipmeds':
          result = await processIPMeds(fileContent)
          results.push({ file: file.name, type: dataType, result })
          break
        default:
          results.push({ 
            file: file.name, 
            type: dataType, 
            error: 'Unsupported file type' 
          })
      }
    } catch (error) {
      console.error(`Error processing ${dataType} file:`, error)
      results.push({ 
        file: file.name, 
        type: dataType, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  return NextResponse.json({ results })
} 
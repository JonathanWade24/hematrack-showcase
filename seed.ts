/**
 * ! Executing this script will delete all data in your database and seed it with 10 patients.
 * ! Make sure to adjust the script to your needs.
 * Use any TypeScript runner to run this script, for example: `npx tsx seed.ts`
 * Learn more about the Seed Client by following our guide: https://docs.snaplet.dev/seed/getting-started
 */
import { createSeedClient } from '@snaplet/seed'
import { copycat } from '@snaplet/copycat'

async function main() {
  const seed = await createSeedClient({ dryRun: true })

  // Generate 10 patients
  await seed.phi.patients(10, (patient, ctx) => ({
    patient_mrn: () => `TEST${ctx.index + 1}`.padStart(6, '0'),
    first_name: () => copycat.firstName(ctx.seed),
    last_name: () => copycat.lastName(ctx.seed),
  }))

  // Generate subjects linked to patients
  await seed.omics_subjects(10, (subject, ctx) => ({
    subject_id: () => `SUBJ${ctx.index + 1}`.padStart(6, '0'),
    patient_mrn: (x) => x.phi.patients.patient_mrn,
    enrollment_date: () => new Date().toISOString(),
  }))

  // Generate samples linked to subjects
  await seed.omics_results(20, (sample, ctx) => ({
    sample_id: () => `SAMPLE${ctx.index + 1}`.padStart(6, '0'),
    subject_id: (x) => x.omics_subjects.subject_id,
    collection_date: () => new Date().toISOString(),
    result_type: () => ctx.index % 2 === 0 ? 'DNA' : 'RNA',
    qc_status: () => 'Pass',
  }))

  // Generate lab results
  await seed.laboratory.labs(20, (lab, ctx) => ({
    patient_mrn: (x) => x.phi.patients.patient_mrn,
    hsp_account_id: () => `HSP${Math.floor(ctx.index / 2) + 1}`.padStart(6, '0'),
    order_id: () => `ORD${Math.floor(ctx.index / 2) + 1}`.padStart(6, '0'),
    result_time: () => new Date().toISOString(),
    lab_code: () => 'CBC',
    lab_name: () => 'Complete Blood Count',
    component_id: () => ctx.index % 2 === 0 ? 'HGB' : 'WBC',
    component_name: () => ctx.index % 2 === 0 ? 'Hemoglobin' : 'White Blood Cell Count',
    result_value: () => ctx.index % 2 === 0 ? '14.2' : '7.5',
    result_unit: () => ctx.index % 2 === 0 ? 'g/dL' : 'K/uL',
    reference_range: () => ctx.index % 2 === 0 ? '13.5-17.5' : '4.5-11.0',
    abnormal_flag: () => 'N',
  }))

  // Generate lab components
  await seed.laboratory.lab_components(10, (component, ctx) => ({
    component_id: () => ['HGB', 'WBC', 'PLT', 'RBC', 'HCT', 'MCV', 'MCH', 'MCHC', 'RDW', 'MPV'][ctx.index],
    component_name: () => [
      'Hemoglobin', 'White Blood Cell Count', 'Platelet Count', 'Red Blood Cell Count',
      'Hematocrit', 'Mean Corpuscular Volume', 'Mean Corpuscular Hemoglobin',
      'Mean Corpuscular Hemoglobin Concentration', 'Red Cell Distribution Width', 'Mean Platelet Volume'
    ][ctx.index],
    component_category: () => 'Hematology',
    common_unit: () => ['g/dL', 'K/uL', 'K/uL', 'M/uL', '%', 'fL', 'pg', 'g/dL', '%', 'fL'][ctx.index],
  }))

  // Generate IP admissions
  await seed.clinical.ip_admissions(5, (admission, ctx) => ({
    patient_mrn: (x) => x.phi.patients.patient_mrn,
    hsp_account_id: () => `HSP${ctx.index + 1}`.padStart(6, '0'),
    adm_date_time: () => new Date(Date.now() - (10 + ctx.index * 5) * 24 * 60 * 60 * 1000).toISOString(),
    disch_date_time: () => new Date(Date.now() - (5 + ctx.index * 5) * 24 * 60 * 60 * 1000).toISOString(),
    discharge_department: () => ['Internal Medicine', 'Hematology', 'Emergency Medicine'][ctx.index % 3],
    discharge_disposition: () => 'Home',
    icu_admission_yn: () => ctx.index === 2 ? 'Y' : 'N',
  }))

  // Generate demographics
  await seed.clinical.demographics(10, (demo, ctx) => ({
    patient_mrn: (x) => x.phi.patients.patient_mrn,
    birth_date: () => new Date(Date.now() - (20 + ctx.index) * 365 * 24 * 60 * 60 * 1000).toISOString(),
    age: () => 20 + ctx.index,
    gender: () => ctx.index % 2 === 0 ? 'Male' : 'Female',
    race: () => ['White', 'Black', 'Asian'][ctx.index % 3],
    ethnicity: () => ctx.index % 4 === 3 ? 'Hispanic' : 'Non-Hispanic',
  }))

  // Generate bone marrow
  await seed.clinical.bone_marrow(5, (bm, ctx) => ({
    patient_mrn: (x) => x.phi.patients.patient_mrn,
    hsp_account_id: () => `HSP${ctx.index + 1}`.padStart(6, '0'),
    order_id: () => `BM${ctx.index + 1}`.padStart(6, '0'),
    result_time: () => new Date(Date.now() - (10 + ctx.index * 5) * 24 * 60 * 60 * 1000).toISOString(),
    lab_code: () => 'BM',
    lab_name: () => 'Bone Marrow Biopsy',
    component_id: () => 'BM-CELL',
    lab_component_description: () => 'Cellularity',
    bone_marrow_results_by_component: () => {
      const cellularity = ctx.index === 3 ? 'Hypocellular (20%)' : 
                          ctx.index === 1 ? 'Hypercellular (70%)' : 
                          `Normal cellularity (${45 + ctx.index * 5}%)`;
      return cellularity;
    },
  }))

  // Generate user roles
  await seed.app.user_roles(3, (role, ctx) => ({
    role_name: () => ['admin', 'researcher', 'clinician'][ctx.index],
    description: () => [
      'Administrator with full access',
      'Researcher with read access to anonymized data',
      'Clinician with access to patient data'
    ][ctx.index],
  }))

  // Generate the SQL file
  process.exit()
}

main().catch(console.error)
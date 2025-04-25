
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.Audit_logScalarFieldEnum = {
  id: 'id',
  table_name: 'table_name',
  action: 'action',
  old_data: 'old_data',
  new_data: 'new_data',
  changed_by: 'changed_by',
  changed_at: 'changed_at'
};

exports.Prisma.LabsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  pat_enc_csn_id: 'pat_enc_csn_id',
  order_time: 'order_time',
  proc_code: 'proc_code',
  proc_name: 'proc_name',
  component_id: 'component_id',
  lab_component_description: 'lab_component_description',
  lab_result_value: 'lab_result_value',
  result_time: 'result_time',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Bone_marrowScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  hsp_account_id: 'hsp_account_id',
  order_id: 'order_id',
  result_time: 'result_time',
  lab_code: 'lab_code',
  lab_name: 'lab_name',
  component_id: 'component_id',
  lab_component_description: 'lab_component_description',
  bone_marrow_results_by_component: 'bone_marrow_results_by_component',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.DemographicsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  birth_date: 'birth_date',
  age: 'age',
  gender: 'gender',
  race: 'race',
  ethnicity: 'ethnicity',
  is_tobacco_user_yn: 'is_tobacco_user_yn',
  alcohol_user_yn: 'alcohol_user_yn',
  ill_drug_user_yn: 'ill_drug_user_yn',
  source: 'source',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Ip_admissionsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  hsp_account_id: 'hsp_account_id',
  adm_date_time: 'adm_date_time',
  disch_date_time: 'disch_date_time',
  discharge_department: 'discharge_department',
  discharge_disposition: 'discharge_disposition',
  icu_admission_yn: 'icu_admission_yn',
  admit_dx_cd_1: 'admit_dx_cd_1',
  admit_dx_description_1: 'admit_dx_description_1',
  admit_dx_cd_2: 'admit_dx_cd_2',
  admit_dx_description_2: 'admit_dx_description_2',
  final_dx_cd_1: 'final_dx_cd_1',
  final_dx_description_1: 'final_dx_description_1',
  final_dx_cd_2: 'final_dx_cd_2',
  final_dx_description_2: 'final_dx_description_2',
  final_dx_cd_3: 'final_dx_cd_3',
  final_dx_description_3: 'final_dx_description_3',
  final_dx_cd_4: 'final_dx_cd_4',
  final_dx_description_4: 'final_dx_description_4',
  final_dx_cd_5: 'final_dx_cd_5',
  final_dx_description_5: 'final_dx_description_5',
  created_at: 'created_at',
  updated_at: 'updated_at',
  has_date_issues: 'has_date_issues',
  date_issue_notes: 'date_issue_notes'
};

exports.Prisma.Ip_medicationsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  hsp_account_id: 'hsp_account_id',
  adm_date_time: 'adm_date_time',
  disch_date_time: 'disch_date_time',
  medication: 'medication',
  dosage: 'dosage',
  unit: 'unit',
  frequency: 'frequency',
  taken_time: 'taken_time',
  rx_class_name: 'rx_class_name',
  created_at: 'created_at',
  updated_at: 'updated_at',
  has_date_issues: 'has_date_issues',
  date_issue_notes: 'date_issue_notes'
};

exports.Prisma.Op_medicationsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  hsp_account_id: 'hsp_account_id',
  visit_date: 'visit_date',
  order_med_id: 'order_med_id',
  order_dttm: 'order_dttm',
  rx_status: 'rx_status',
  generic_description: 'generic_description',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Op_visitsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  pat_id: 'pat_id',
  hsp_account_id: 'hsp_account_id',
  visit_date: 'visit_date',
  visit_type: 'visit_type',
  department_id: 'department_id',
  department_name: 'department_name',
  bp_systolic: 'bp_systolic',
  bp_diastolic: 'bp_diastolic',
  weight_lbs: 'weight_lbs',
  weight_kg: 'weight_kg',
  current_icd10_list: 'current_icd10_list',
  dx_name: 'dx_name',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Unified_visitsScalarFieldEnum = {
  id: 'id',
  patient_mrn: 'patient_mrn',
  visit_id: 'visit_id',
  visit_type: 'visit_type',
  source_id: 'source_id',
  start_date: 'start_date',
  end_date: 'end_date',
  department: 'department',
  created_at: 'created_at',
  updated_at: 'updated_at',
  icu_admission_yn: 'icu_admission_yn',
  discharge_disposition: 'discharge_disposition',
  admit_dx_cd: 'admit_dx_cd',
  admit_dx_description: 'admit_dx_description',
  final_dx_cd: 'final_dx_cd',
  final_dx_description: 'final_dx_description',
  specific_visit_type: 'specific_visit_type',
  bp_systolic: 'bp_systolic',
  bp_diastolic: 'bp_diastolic',
  weight_kg: 'weight_kg',
  dx_codes: 'dx_codes',
  dx_names: 'dx_names',
  heart_rate: 'heart_rate',
  respiratory_rate: 'respiratory_rate',
  temperature_f: 'temperature_f',
  spo2: 'spo2'
};

exports.Prisma.Omics_resultsScalarFieldEnum = {
  id: 'id',
  project: 'project',
  subject_id: 'subject_id',
  sample_number: 'sample_number',
  sample_id: 'sample_id',
  date_of_collection: 'date_of_collection',
  age_at_collection: 'age_at_collection',
  genotype: 'genotype',
  sex: 'sex',
  therapies: 'therapies',
  days_to_processing: 'days_to_processing',
  steady_state: 'steady_state',
  transfusion_status: 'transfusion_status',
  transfusion_confirmed: 'transfusion_confirmed',
  date_advia: 'date_advia',
  rbc_advia: 'rbc_advia',
  hb_advia: 'hb_advia',
  hct_advia: 'hct_advia',
  mcv_advia: 'mcv_advia',
  mch_advia: 'mch_advia',
  mchc_advia: 'mchc_advia',
  rdw_advia: 'rdw_advia',
  hdw_advia: 'hdw_advia',
  plt_advia: 'plt_advia',
  mpv_advia: 'mpv_advia',
  wbc_advia: 'wbc_advia',
  neut_advia: 'neut_advia',
  retic_advia: 'retic_advia',
  chr_advia: 'chr_advia',
  hc41_v120_advia: 'hc41_v120_advia',
  hc41_v60_120_advia: 'hc41_v60_120_advia',
  hc41_v60_advia: 'hc41_v60_advia',
  drbc_advia: 'drbc_advia',
  hyper_advia: 'hyper_advia',
  nrbc_advia: 'nrbc_advia',
  qc_pass_advia: 'qc_pass_advia',
  qc_notes_advia: 'qc_notes_advia',
  date_lorrca: 'date_lorrca',
  ei_min_lorrca: 'ei_min_lorrca',
  ei_max_lorrca: 'ei_max_lorrca',
  ei_delta_lorrca: 'ei_delta_lorrca',
  pos_lorrca: 'pos_lorrca',
  instrument_lorrca: 'instrument_lorrca',
  qc_pass_lorrca: 'qc_pass_lorrca',
  qc_notes_lorrca: 'qc_notes_lorrca',
  date_visc: 'date_visc',
  visc_45: 'visc_45',
  visc_225: 'visc_225',
  qc_pass_viscosity: 'qc_pass_viscosity',
  qc_notes_viscosity: 'qc_notes_viscosity',
  date_hvr: 'date_hvr',
  hvr_45: 'hvr_45',
  hvr_225: 'hvr_225',
  qc_pass_hvr: 'qc_pass_hvr',
  qc_notes_hvr: 'qc_notes_hvr',
  date_dna: 'date_dna',
  concentration_1_dna: 'concentration_1_dna',
  purity_1_dna: 'purity_1_dna',
  concentration_2_dna: 'concentration_2_dna',
  purity_2_dna: 'purity_2_dna',
  qc_pass_dna: 'qc_pass_dna',
  qc_notes_dna: 'qc_notes_dna',
  date_plasma: 'date_plasma',
  vol_plasma_1: 'vol_plasma_1',
  vol_plasma_2: 'vol_plasma_2',
  vol_plasma_3: 'vol_plasma_3',
  qc_notes_plasma: 'qc_notes_plasma',
  date_pmbc: 'date_pmbc',
  cell_number_1_pbmc: 'cell_number_1_pbmc',
  cell_number_2_pbmc: 'cell_number_2_pbmc',
  sent_to_gt_pbmc: 'sent_to_gt_pbmc',
  qc_notes_pbmc: 'qc_notes_pbmc',
  date_f_cells: 'date_f_cells',
  percent_f_cells: 'percent_f_cells',
  stain_f_cells: 'stain_f_cells',
  cytometer_f_cells: 'cytometer_f_cells',
  qc_pass_f_cells: 'qc_pass_f_cells',
  qc_notes_f_cells: 'qc_notes_f_cells',
  date_adhesion: 'date_adhesion',
  cells_adhered_adhesion: 'cells_adhered_adhesion',
  qc_pass_adhesion: 'qc_pass_adhesion',
  qc_notes_adhesion: 'qc_notes_adhesion',
  date_hplc: 'date_hplc',
  hbf_percent_grady_hplc: 'hbf_percent_grady_hplc',
  hba_percent_grady_hplc: 'hba_percent_grady_hplc',
  hbc_percent_grady_hplc: 'hbc_percent_grady_hplc',
  hba2_percent_grady_hplc: 'hba2_percent_grady_hplc',
  hbs_percent_grady_hplc: 'hbs_percent_grady_hplc',
  hbf_percent_d10_hplc: 'hbf_percent_d10_hplc',
  hba_percent_d10_hplc: 'hba_percent_d10_hplc',
  hbc_percent_d10_hplc: 'hbc_percent_d10_hplc',
  hba2_percent_d10_hplc: 'hba2_percent_d10_hplc',
  hbs_percent_d10_hplc: 'hbs_percent_d10_hplc',
  hbf_percent_d10_fcell_ratio: 'hbf_percent_d10_fcell_ratio',
  hbf_percent_grady_fcell_ratio: 'hbf_percent_grady_fcell_ratio',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.Omics_subjectsScalarFieldEnum = {
  subject_id: 'subject_id',
  patient_mrn: 'patient_mrn',
  project: 'project',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.PatientsScalarFieldEnum = {
  patient_mrn: 'patient_mrn',
  first_name: 'first_name',
  last_name: 'last_name',
  birth_date: 'birth_date',
  sex: 'sex',
  race: 'race',
  ethnicity: 'ethnicity',
  created_at: 'created_at',
  updated_at: 'updated_at',
  middle_name: 'middle_name'
};

exports.Prisma.Subject_registrationScalarFieldEnum = {
  id: 'id',
  subject_id: 'subject_id',
  registration_date: 'registration_date',
  consent_date: 'consent_date',
  corporate_id: 'corporate_id',
  patient_mrn: 'patient_mrn',
  first_name: 'first_name',
  middle_name: 'middle_name',
  last_name: 'last_name',
  date_of_birth: 'date_of_birth',
  created_at: 'created_at',
  updated_at: 'updated_at'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  password: 'password',
  role: 'role'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.AccountRequestScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvedByUserId: 'approvedByUserId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  audit_log: 'audit_log',
  Labs: 'Labs',
  bone_marrow: 'bone_marrow',
  demographics: 'demographics',
  ip_admissions: 'ip_admissions',
  ip_medications: 'ip_medications',
  op_medications: 'op_medications',
  op_visits: 'op_visits',
  unified_visits: 'unified_visits',
  omics_results: 'omics_results',
  omics_subjects: 'omics_subjects',
  patients: 'patients',
  subject_registration: 'subject_registration',
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  AccountRequest: 'AccountRequest'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

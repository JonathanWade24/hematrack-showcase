import { pgTable, pgSchema, varchar, date, timestamp, foreignKey, unique, serial, text, numeric, index, uuid, integer, boolean, uniqueIndex, bigint, primaryKey, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const clinical = pgSchema("clinical");
export const laboratory = pgSchema("laboratory");
export const staging = pgSchema("staging");
export const app = pgSchema("app");


export const patientsInClinical = clinical.table("patients", {
	patient_mrn: varchar({ length: 50 }).primaryKey().notNull(),
	first_name: varchar({ length: 100 }),
	last_name: varchar({ length: 100 }),
	middle_name: varchar({ length: 100 }),
	birth_date: date(),
	sex: varchar({ length: 20 }),
	race: varchar({ length: 100 }),
	ethnicity: varchar({ length: 100 }),
	is_tobacco_user: varchar({ length: 20 }),
	alcohol_user: varchar({ length: 20 }),
	ill_drug_user: varchar({ length: 20 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const lab_resultsInClinical = clinical.table("lab_results", {
	id: serial().primaryKey().notNull(),
	order_id: varchar({ length: 100 }).notNull(),
	component_id: text(),
	component_name: text(),
	result_value: text(),
	result_value_numeric: numeric(),
	reference_range: varchar({ length: 100 }),
	units: varchar({ length: 50 }),
	abnormal_flag: varchar({ length: 20 }),
	result_time: timestamp({ withTimezone: true, mode: 'string' }),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.order_id],
			foreignColumns: [lab_ordersInClinical.order_id],
			name: "lab_results_order_id_fkey"
		}).onDelete("cascade"),
	unique("lab_results_order_id_component_id_key").on(table.order_id, table.component_id),
]);

export const bone_marrow_resultsInClinical = clinical.table("bone_marrow_results", {
	id: serial().primaryKey().notNull(),
	order_id: varchar({ length: 100 }).notNull(),
	component_id: varchar({ length: 50 }),
	component_name: varchar({ length: 200 }),
	lab_component_description: text(),
	result_text: text(),
	bone_marrow_results_by_component: text(),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.order_id],
			foreignColumns: [lab_ordersInClinical.order_id],
			name: "bone_marrow_results_order_id_fkey"
		}).onDelete("cascade"),
	unique("bone_marrow_results_order_id_component_id_key").on(table.order_id, table.component_id),
]);

export const results_dnaInLaboratory = laboratory.table("results_dna", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_dna: date(),
	concentration_1_dna: numeric(),
	purity_1_dna: numeric(),
	concentration_2_dna: numeric(),
	purity_2_dna: numeric(),
	qc_pass_dna: varchar({ length: 50 }),
	qc_notes_dna: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_dna_date").using("btree", table.date_dna.asc().nullsLast().op("date_ops")),
	index("idx_results_dna_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_dna_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_dna_sample_id_unique").on(table.sample_id),
]);

export const results_plasmaInLaboratory = laboratory.table("results_plasma", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_plasma: date(),
	vol_plasma_1: numeric(),
	vol_plasma_2: numeric(),
	vol_plasma_3: numeric(),
	qc_notes_plasma: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_plasma_date").using("btree", table.date_plasma.asc().nullsLast().op("date_ops")),
	index("idx_results_plasma_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_plasma_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_plasma_sample_id_unique").on(table.sample_id),
]);

export const results_pbmcInLaboratory = laboratory.table("results_pbmc", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_pbmc: date(),
	sent_to_gt_pbmc: numeric(),
	qc_notes_pbmc: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	cell_number_1_pbmc: numeric(),
	cell_number_2_pbmc: numeric(),
}, (table) => [
	index("idx_results_pbmc_date").using("btree", table.date_pbmc.asc().nullsLast().op("date_ops")),
	index("idx_results_pbmc_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_pbmc_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_pbmc_sample_id_unique").on(table.sample_id),
]);

export const results_adhesionInLaboratory = laboratory.table("results_adhesion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_adhesion: date(),
	cells_adhered_adhesion: numeric(),
	qc_pass_adhesion: varchar({ length: 50 }),
	qc_notes_adhesion: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_adhesion_date").using("btree", table.date_adhesion.asc().nullsLast().op("date_ops")),
	index("idx_results_adhesion_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_adhesion_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_adhesion_sample_id_unique").on(table.sample_id),
]);

export const omics_subjectsInLaboratory = laboratory.table("omics_subjects", {
	subject_id: varchar({ length: 20 }).primaryKey().notNull(),
	patient_mrn: varchar({ length: 50 }).notNull(),
	project: varchar({ length: 20 }).default('OMI'),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const samplesInLaboratory = laboratory.table("samples", {
	sample_id: varchar({ length: 50 }).primaryKey().notNull(),
	subject_id: varchar({ length: 20 }).notNull(),
	sample_number: integer().notNull(),
	date_of_collection: date(),
	age_at_collection: numeric(),
	genotype: varchar({ length: 50 }),
	therapies: text(),
	days_to_processing: integer(),
	steady_state: varchar({ length: 50 }),
	transfusion_status: varchar({ length: 50 }),
	transfusion_confirmed: varchar({ length: 50 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.subject_id],
			foreignColumns: [omics_subjectsInLaboratory.subject_id],
			name: "samples_subject_id_fkey"
		}).onDelete("cascade"),
	unique("samples_subject_id_sample_number_key").on(table.subject_id, table.sample_number),
]);

export const subject_registrationInClinical = clinical.table("subject_registration", {
	id: serial().primaryKey().notNull(),
	subject_id: varchar({ length: 20 }).notNull(),
	patient_mrn: varchar({ length: 50 }).notNull(),
	registration_date: date(),
	consent_date: date(),
	corporate_id: varchar({ length: 50 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.subject_id],
			foreignColumns: [omics_subjectsInLaboratory.subject_id],
			name: "subject_registration_subject_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.patient_mrn],
			foreignColumns: [patientsInClinical.patient_mrn],
			name: "subject_registration_patient_mrn_fkey"
		}).onDelete("cascade"),
	unique("subject_registration_subject_id_key").on(table.subject_id),
]);

export const medication_ordersInClinical = clinical.table("medication_orders", {
	medication_order_id: serial().primaryKey().notNull(),
	epic_order_med_id: varchar({ length: 50 }),
	visit_id: varchar({ length: 50 }),
	patient_mrn: varchar({ length: 50 }).notNull(),
	medication_name: varchar({ length: 255 }),
	order_time: timestamp({ withTimezone: true, mode: 'string' }),
	status: varchar({ length: 50 }),
	dose: varchar({ length: 50 }),
	units: varchar({ length: 50 }),
	route: varchar({ length: 50 }),
	frequency: varchar({ length: 100 }),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.visit_id],
			foreignColumns: [visitsInClinical.visit_id],
			name: "medication_orders_visit_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.patient_mrn],
			foreignColumns: [patientsInClinical.patient_mrn],
			name: "medication_orders_patient_mrn_fkey"
		}).onDelete("cascade"),
]);

export const results_adviaInLaboratory = laboratory.table("results_advia", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_advia: date(),
	rbc_advia: numeric(),
	hb_advia: numeric(),
	hct_advia: numeric(),
	mcv_advia: numeric(),
	mch_advia: numeric(),
	mchc_advia: numeric(),
	rdw_advia: numeric(),
	hdw_advia: numeric(),
	plt_advia: numeric(),
	mpv_advia: numeric(),
	wbc_advia: numeric(),
	neut_advia: numeric(),
	retic_advia: numeric(),
	chr_advia: numeric(),
	hc41_v120_advia: numeric(),
	hc41_v60_120_advia: numeric(),
	hc41_v60_advia: numeric(),
	drbc_advia: numeric(),
	hyper_advia: numeric(),
	nrbc_advia: numeric(),
	qc_pass_advia: varchar({ length: 50 }),
	qc_notes_advia: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_advia_date").using("btree", table.date_advia.asc().nullsLast().op("date_ops")),
	index("idx_results_advia_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_advia_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_advia_sample_id_unique").on(table.sample_id),
]);

export const results_fcellsInLaboratory = laboratory.table("results_fcells", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_f_cells: date(),
	percent_f_cells: numeric(),
	stain_f_cells: varchar({ length: 100 }),
	cytometer_f_cells: varchar({ length: 100 }),
	qc_pass_f_cells: varchar({ length: 50 }),
	qc_notes_f_cells: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_fcells_date").using("btree", table.date_f_cells.asc().nullsLast().op("date_ops")),
	index("idx_results_fcells_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_fcells_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_fcells_sample_id_unique").on(table.sample_id),
]);

export const visitsInClinical = clinical.table("visits", {
	visit_id: varchar({ length: 50 }).primaryKey().notNull(),
	patient_mrn: varchar({ length: 50 }).notNull(),
	pat_enc_csn_id: varchar({ length: 50 }),
	visit_type: varchar({ length: 50 }),
	visit_subtype: varchar({ length: 100 }),
	visit_start_datetime: timestamp({ withTimezone: true, mode: 'string' }),
	visit_end_datetime: timestamp({ withTimezone: true, mode: 'string' }),
	department_id: varchar({ length: 50 }),
	department_name: varchar({ length: 200 }),
	discharge_disposition: varchar({ length: 200 }),
	icu_admission: boolean(),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	bp_systolic: integer(),
	bp_diastolic: integer(),
	weight_kg: numeric(),
}, (table) => [
	foreignKey({
			columns: [table.patient_mrn],
			foreignColumns: [patientsInClinical.patient_mrn],
			name: "visits_patient_mrn_fkey"
		}).onDelete("cascade"),
	unique("visits_pat_enc_csn_id_key").on(table.pat_enc_csn_id),
]);

export const fact_bone_marrow_orderInClinical = clinical.table("fact_bone_marrow_order", {
	bone_marrow_order_key: serial().primaryKey().notNull(),
	patient_key: integer(),
	grady_mrn: text(),
	hsp_account_id: text(),
	order_id: text().notNull(),
	result_time: timestamp({ withTimezone: true, mode: 'string' }),
	lab_code: text(),
	lab_name: text(),
	source_staging_table: text().default('staging.raw_bone_marrow'),
	source_file_name: text(),
	dw_imported_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("fact_bone_marrow_order_order_id_key").on(table.order_id),
]);

export const results_lorrcaInLaboratory = laboratory.table("results_lorrca", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_lorrca: date(),
	ei_min_lorrca: numeric(),
	ei_max_lorrca: numeric(),
	ei_delta_lorrca: numeric(),
	pos_lorrca: varchar({ length: 50 }),
	instrument_lorrca: varchar({ length: 100 }),
	qc_pass_lorrca: varchar({ length: 50 }),
	qc_notes_lorrca: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_lorrca_date").using("btree", table.date_lorrca.asc().nullsLast().op("date_ops")),
	index("idx_results_lorrca_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_lorrca_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_lorrca_sample_id_unique").on(table.sample_id),
]);

export const results_viscosityInLaboratory = laboratory.table("results_viscosity", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sample_id: varchar({ length: 50 }).notNull(),
	date_analysis: date(),
	visc_45: numeric(),
	visc_225: numeric(),
	hvr_45: numeric(),
	hvr_225: numeric(),
	qc_pass: varchar({ length: 50 }),
	qc_notes: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_results_viscosity_date_analysis").using("btree", table.date_analysis.asc().nullsLast().op("date_ops")),
	index("idx_results_viscosity_sample_id").using("btree", table.sample_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sample_id],
			foreignColumns: [samplesInLaboratory.sample_id],
			name: "results_viscosity_sample_id_fkey"
		}).onDelete("cascade"),
	unique("results_viscosity_sample_id_unique").on(table.sample_id),
]);

export const medication_administrationsInClinical = clinical.table("medication_administrations", {
	administration_id: serial().primaryKey().notNull(),
	epic_order_med_id: varchar({ length: 50 }),
	visit_id: varchar({ length: 50 }).notNull(),
	patient_mrn: varchar({ length: 50 }).notNull(),
	medication_name: varchar({ length: 255 }),
	administration_time: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	dose_given: varchar({ length: 50 }),
	units: varchar({ length: 50 }),
	route: varchar({ length: 50 }),
	reason_for_action: text(),
	administering_user: varchar({ length: 100 }),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.visit_id],
			foreignColumns: [visitsInClinical.visit_id],
			name: "medication_administrations_visit_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patient_mrn],
			foreignColumns: [patientsInClinical.patient_mrn],
			name: "medication_administrations_patient_mrn_fkey"
		}).onDelete("cascade"),
]);

export const fact_bone_marrow_componentInClinical = clinical.table("fact_bone_marrow_component", {
	bone_marrow_component_key: serial().primaryKey().notNull(),
	bone_marrow_order_key: integer(),
	component_id: text(),
	component_name: text(),
	result_text: text(),
	source_staging_id: integer(),
	dw_imported_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.bone_marrow_order_key],
			foreignColumns: [fact_bone_marrow_orderInClinical.bone_marrow_order_key],
			name: "fact_bone_marrow_component_bone_marrow_order_key_fkey"
		}),
	unique("fact_bone_marrow_component_bone_marrow_order_key_component__key").on(table.bone_marrow_order_key, table.component_id),
]);

export const visit_diagnosesInClinical = clinical.table("visit_diagnoses", {
	id: serial().primaryKey().notNull(),
	visit_id: varchar({ length: 50 }).notNull(),
	diagnosis_type: varchar({ length: 50 }),
	icd10_code: varchar({ length: 50 }),
	diagnosis_name: text(),
	sequence_num: integer(),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.visit_id],
			foreignColumns: [visitsInClinical.visit_id],
			name: "visit_diagnoses_visit_id_fkey"
		}).onDelete("cascade"),
	unique("visit_diagnoses_visit_id_diagnosis_type_icd10_code_sequence_key").on(table.visit_id, table.diagnosis_type, table.icd10_code, table.sequence_num),
]);

export const raw_bone_marrowInStaging = staging.table("raw_bone_marrow", {
	staging_id: serial().primaryKey().notNull(),
	source_file_name: varchar({ length: 255 }),
	imported_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	patient_mrn: text(),
	hsp_account_id: text(),
	order_id: text(),
	result_time: text(),
	lab_code: text(),
	lab_name: text(),
	component_id: text(),
	lab_component_description: text(),
	bone_marrow_results_by_component: text(),
});

export const lab_ordersInClinical = clinical.table("lab_orders", {
	order_id: text().primaryKey().notNull(),
	visit_id: varchar({ length: 50 }),
	patient_mrn: varchar({ length: 50 }).notNull(),
	order_type: varchar({ length: 50 }).notNull(),
	accession_num: varchar({ length: 50 }),
	lab_code: varchar({ length: 50 }),
	lab_name: text(),
	order_time: timestamp({ withTimezone: true, mode: 'string' }),
	result_time: timestamp({ withTimezone: true, mode: 'string' }),
	collection_time: timestamp({ withTimezone: true, mode: 'string' }),
	proc_bgn_time: timestamp({ withTimezone: true, mode: 'string' }),
	proc_end_time: timestamp({ withTimezone: true, mode: 'string' }),
	source_file: varchar({ length: 100 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.patient_mrn],
			foreignColumns: [patientsInClinical.patient_mrn],
			name: "lab_orders_patient_mrn_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.visit_id],
			foreignColumns: [visitsInClinical.visit_id],
			name: "lab_orders_visit_id_fkey"
		}).onDelete("set null"),
	unique("lab_orders_accession_num_key").on(table.accession_num),
]);

export const raw_op_visitsInStaging = staging.table("raw_op_visits", {
	staging_id: serial().primaryKey().notNull(),
	imported_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	source_file_name: text(),
	PATIENT_MRN: text(),
	PAT_ID: text(),
	HSP_ACCOUNT_ID: text(),
	VISIT_DATE: text(),
	VISIT_TYPE: text(),
	DEPARTMENT_ID: text(),
	DEPARTMENT_NAME: text(),
	BP_SYSTOLIC: text(),
	BP_DIASTOLIC: text(),
	WEIGHT_LBS: text(),
	WEIGHT_KG: text(),
	CURRENT_ICD10_LIST: text(),
	DX_NAME: text(),
}, (table) => [
	index("idx_staging_raw_op_visits_acctid").using("btree", table.HSP_ACCOUNT_ID.asc().nullsLast().op("text_ops")),
	index("idx_staging_raw_op_visits_icd10").using("btree", table.CURRENT_ICD10_LIST.asc().nullsLast().op("text_ops")),
	index("idx_staging_raw_op_visits_mrn").using("btree", table.PATIENT_MRN.asc().nullsLast().op("text_ops")),
	index("idx_staging_raw_op_visits_visitdt").using("btree", table.VISIT_DATE.asc().nullsLast().op("text_ops")),
]);

export const raw_ip_medsInStaging = staging.table("raw_ip_meds", {
	staging_id: serial().primaryKey().notNull(),
	imported_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	source_file_name: text(),
	PATIENT_MRN: text(),
	HSP_ACCOUNT_ID: text(),
	ADM_DATE_TIME: text(),
	DISCH_DATE_TIME: text(),
	MEDICATION: text(),
	DOSAGE: text(),
	UNIT: text(),
	FREQUENCY: text(),
	TAKEN_TIME: text(),
	RX_CLASS_NAME: text(),
}, (table) => [
	index("idx_staging_raw_ip_meds_acctid").using("btree", table.HSP_ACCOUNT_ID.asc().nullsLast().op("text_ops")),
	index("idx_staging_raw_ip_meds_med").using("btree", table.MEDICATION.asc().nullsLast().op("text_ops")),
	index("idx_staging_raw_ip_meds_mrn").using("btree", table.PATIENT_MRN.asc().nullsLast().op("text_ops")),
]);

export const UserInApp = app.table("User", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().unique().notNull(),
	emailVerified: timestamp({ withTimezone: true, mode: 'date' }),
	image: text(),
	password: text(),
	role: text(),
	isActive: boolean("is_active").default(true).notNull(),
	settings: jsonb("settings").$type<{
		show_phi: boolean;
	}>(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const AccountInApp = app.table("Account", {
	id: text().primaryKey().notNull(),
	userId: text().notNull().references(() => UserInApp.id, { onDelete: "cascade" }),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text().notNull(),
	refresh_token: text(),
	access_token: text(),
	expires_at: integer(),
	token_type: text(),
	scope: text(),
	id_token: text(),
	session_state: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
	uniqueProviderAccount: unique("Account_provider_providerAccountId_key").on(table.provider, table.providerAccountId),
	userIdx: index("idx_account_userid").on(table.userId),
}));

export const SessionInApp = app.table("Session", {
	sessionToken: text().primaryKey().notNull(),
	userId: text().notNull().references(() => UserInApp.id, { onDelete: "cascade" }),
	expires: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
}, (table) => ({
	userIdx: index("idx_session_userid").on(table.userId),
}));

export const VerificationTokenInApp = app.table("VerificationToken", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
}, (table) => ({
	pk: primaryKey({ columns: [table.identifier, table.token], name: "VerificationToken_pkey"}),
}));

export const v_acs_pneumonia_admissions_summaryInClinical = clinical.view("v_acs_pneumonia_admissions_summary", {	visit_id: varchar({ length: 50 }),
	patient_mrn: varchar({ length: 50 }),
	has_omics_data: boolean(),
	is_acs_pneumonia_admission: boolean(),
}).as(sql`WITH acspneumoniavisits AS ( SELECT DISTINCT vd.visit_id FROM clinical.visit_diagnoses vd WHERE lower(vd.diagnosis_name) ~~ '%acute chest syndrome%'::text OR lower(vd.diagnosis_name) ~~ '%pneumonia%'::text ) SELECT v.visit_id, v.patient_mrn, os.patient_mrn IS NOT NULL AS has_omics_data, true AS is_acs_pneumonia_admission FROM clinical.visits v JOIN acspneumoniavisits apv ON v.visit_id::text = apv.visit_id::text LEFT JOIN laboratory.omics_subjects os ON v.patient_mrn::text = os.patient_mrn::text WHERE v.visit_type::text = 'Inpatient'::text`);
import { pgTable, pgSchema, varchar, date, timestamp, foreignKey, unique, serial, text, numeric, index, uuid, boolean, integer, uniqueIndex, bigint, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const clinical = pgSchema("clinical");
export const laboratory = pgSchema("laboratory");
export const staging = pgSchema("staging");
export const app = pgSchema("app");


export const patientsInClinical = clinical.table("patients", {
	patient_mrn: varchar("patient_mrn", { length: 50 }).primaryKey().notNull(),
	first_name: varchar("first_name", { length: 100 }),
	last_name: varchar("last_name", { length: 100 }),
	middle_name: varchar("middle_name", { length: 100 }),
	birth_date: date("birth_date"),
	sex: varchar("sex", { length: 20 }),
	race: varchar("race", { length: 100 }),
	ethnicity: varchar("ethnicity", { length: 100 }),
	is_tobacco_user: varchar("is_tobacco_user", { length: 20 }),
	alcohol_user: varchar("alcohol_user", { length: 20 }),
	ill_drug_user: varchar("ill_drug_user", { length: 20 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const lab_resultsInClinical = clinical.table("lab_results", {
	id: serial("id").primaryKey().notNull(),
	order_id: varchar("order_id", { length: 100 }).notNull().references(() => lab_ordersInClinical.order_id, { onDelete: "cascade" } ),
	component_id: text("component_id"),
	component_name: text("component_name"),
	result_value: text("result_value"),
	result_value_numeric: numeric("result_value_numeric"),
	reference_range: varchar("reference_range", { length: 100 }),
	units: varchar("units", { length: 50 }),
	abnormal_flag: varchar("abnormal_flag", { length: 20 }),
	result_time: timestamp("result_time", { withTimezone: true, mode: 'string' }),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		lab_results_order_id_component_id_key: unique("lab_results_order_id_component_id_key").on(table.order_id, table.component_id),
	}
});

export const bone_marrow_resultsInClinical = clinical.table("bone_marrow_results", {
	id: serial("id").primaryKey().notNull(),
	order_id: varchar("order_id", { length: 100 }).notNull().references(() => lab_ordersInClinical.order_id, { onDelete: "cascade" } ),
	component_id: varchar("component_id", { length: 50 }),
	component_name: varchar("component_name", { length: 200 }),
	result_text: text("result_text"),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		bone_marrow_results_order_id_component_id_key: unique("bone_marrow_results_order_id_component_id_key").on(table.order_id, table.component_id),
	}
});

export const results_dnaInLaboratory = laboratory.table("results_dna", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_dna: date("date_dna"),
	concentration_1_dna: numeric("concentration_1_dna"),
	purity_1_dna: numeric("purity_1_dna"),
	concentration_2_dna: numeric("concentration_2_dna"),
	purity_2_dna: numeric("purity_2_dna"),
	qc_pass_dna: varchar("qc_pass_dna", { length: 50 }),
	qc_notes_dna: text("qc_notes_dna"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_dna_sample_id: index("idx_results_dna_sample_id").on(table.sample_id),
		idx_results_dna_date: index("idx_results_dna_date").on(table.date_dna),
		results_dna_sample_id_unique: unique("results_dna_sample_id_unique").on(table.sample_id),
	}
});

export const results_plasmaInLaboratory = laboratory.table("results_plasma", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_plasma: date("date_plasma"),
	vol_plasma_1: numeric("vol_plasma_1"),
	vol_plasma_2: numeric("vol_plasma_2"),
	vol_plasma_3: numeric("vol_plasma_3"),
	qc_notes_plasma: text("qc_notes_plasma"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_plasma_sample_id: index("idx_results_plasma_sample_id").on(table.sample_id),
		idx_results_plasma_date: index("idx_results_plasma_date").on(table.date_plasma),
		results_plasma_sample_id_unique: unique("results_plasma_sample_id_unique").on(table.sample_id),
	}
});

export const results_pbmcInLaboratory = laboratory.table("results_pbmc", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_pbmc: date("date_pbmc"),
	sent_to_gt_pbmc: numeric("sent_to_gt_pbmc"),
	qc_notes_pbmc: text("qc_notes_pbmc"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	cell_number_1_pbmc: numeric("cell_number_1_pbmc"),
	cell_number_2_pbmc: numeric("cell_number_2_pbmc"),
},
(table) => {
	return {
		idx_results_pbmc_sample_id: index("idx_results_pbmc_sample_id").on(table.sample_id),
		idx_results_pbmc_date: index("idx_results_pbmc_date").on(table.date_pbmc),
		results_pbmc_sample_id_unique: unique("results_pbmc_sample_id_unique").on(table.sample_id),
	}
});

export const results_adhesionInLaboratory = laboratory.table("results_adhesion", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_adhesion: date("date_adhesion"),
	cells_adhered_adhesion: numeric("cells_adhered_adhesion"),
	qc_pass_adhesion: varchar("qc_pass_adhesion", { length: 50 }),
	qc_notes_adhesion: text("qc_notes_adhesion"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_adhesion_sample_id: index("idx_results_adhesion_sample_id").on(table.sample_id),
		idx_results_adhesion_date: index("idx_results_adhesion_date").on(table.date_adhesion),
		results_adhesion_sample_id_unique: unique("results_adhesion_sample_id_unique").on(table.sample_id),
	}
});

export const omics_subjectsInLaboratory = laboratory.table("omics_subjects", {
	subject_id: varchar("subject_id", { length: 20 }).primaryKey().notNull(),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull(),
	project: varchar("project", { length: 20 }).default('OMI'::character varying),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const v_acs_pneumonia_admissions_summaryInClinical = clinical.table("v_acs_pneumonia_admissions_summary", {
	visit_id: varchar("visit_id", { length: 50 }),
	patient_mrn: varchar("patient_mrn", { length: 50 }),
	has_omics_data: boolean("has_omics_data"),
	is_acs_pneumonia_admission: boolean("is_acs_pneumonia_admission"),
});

export const samplesInLaboratory = laboratory.table("samples", {
	sample_id: varchar("sample_id", { length: 50 }).primaryKey().notNull(),
	subject_id: varchar("subject_id", { length: 20 }).notNull().references(() => omics_subjectsInLaboratory.subject_id, { onDelete: "cascade" } ),
	sample_number: integer("sample_number").notNull(),
	date_of_collection: date("date_of_collection"),
	age_at_collection: numeric("age_at_collection"),
	genotype: varchar("genotype", { length: 50 }),
	therapies: text("therapies"),
	days_to_processing: integer("days_to_processing"),
	steady_state: varchar("steady_state", { length: 50 }),
	transfusion_status: varchar("transfusion_status", { length: 50 }),
	transfusion_confirmed: varchar("transfusion_confirmed", { length: 50 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		samples_subject_id_sample_number_key: unique("samples_subject_id_sample_number_key").on(table.subject_id, table.sample_number),
	}
});

export const subject_registrationInClinical = clinical.table("subject_registration", {
	id: serial("id").primaryKey().notNull(),
	subject_id: varchar("subject_id", { length: 20 }).notNull().references(() => omics_subjectsInLaboratory.subject_id, { onDelete: "restrict" } ),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull().references(() => patientsInClinical.patient_mrn, { onDelete: "cascade" } ),
	registration_date: date("registration_date"),
	consent_date: date("consent_date"),
	corporate_id: varchar("corporate_id", { length: 50 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		subject_registration_subject_id_key: unique("subject_registration_subject_id_key").on(table.subject_id),
	}
});

export const medication_ordersInClinical = clinical.table("medication_orders", {
	medication_order_id: serial("medication_order_id").primaryKey().notNull(),
	epic_order_med_id: varchar("epic_order_med_id", { length: 50 }),
	visit_id: varchar("visit_id", { length: 50 }).references(() => visitsInClinical.visit_id, { onDelete: "set null" } ),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull().references(() => patientsInClinical.patient_mrn, { onDelete: "cascade" } ),
	medication_name: varchar("medication_name", { length: 255 }),
	order_time: timestamp("order_time", { withTimezone: true, mode: 'string' }),
	status: varchar("status", { length: 50 }),
	dose: varchar("dose", { length: 50 }),
	units: varchar("units", { length: 50 }),
	route: varchar("route", { length: 50 }),
	frequency: varchar("frequency", { length: 100 }),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const results_adviaInLaboratory = laboratory.table("results_advia", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_advia: date("date_advia"),
	rbc_advia: numeric("rbc_advia"),
	hb_advia: numeric("hb_advia"),
	hct_advia: numeric("hct_advia"),
	mcv_advia: numeric("mcv_advia"),
	mch_advia: numeric("mch_advia"),
	mchc_advia: numeric("mchc_advia"),
	rdw_advia: numeric("rdw_advia"),
	hdw_advia: numeric("hdw_advia"),
	plt_advia: numeric("plt_advia"),
	mpv_advia: numeric("mpv_advia"),
	wbc_advia: numeric("wbc_advia"),
	neut_advia: numeric("neut_advia"),
	retic_advia: numeric("retic_advia"),
	chr_advia: numeric("chr_advia"),
	hc41_v120_advia: numeric("hc41_v120_advia"),
	hc41_v60_120_advia: numeric("hc41_v60_120_advia"),
	hc41_v60_advia: numeric("hc41_v60_advia"),
	drbc_advia: numeric("drbc_advia"),
	hyper_advia: numeric("hyper_advia"),
	nrbc_advia: numeric("nrbc_advia"),
	qc_pass_advia: varchar("qc_pass_advia", { length: 50 }),
	qc_notes_advia: text("qc_notes_advia"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_advia_sample_id: index("idx_results_advia_sample_id").on(table.sample_id),
		idx_results_advia_date: index("idx_results_advia_date").on(table.date_advia),
		results_advia_sample_id_unique: unique("results_advia_sample_id_unique").on(table.sample_id),
	}
});

export const results_fcellsInLaboratory = laboratory.table("results_fcells", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_f_cells: date("date_f_cells"),
	percent_f_cells: numeric("percent_f_cells"),
	stain_f_cells: varchar("stain_f_cells", { length: 100 }),
	cytometer_f_cells: varchar("cytometer_f_cells", { length: 100 }),
	qc_pass_f_cells: varchar("qc_pass_f_cells", { length: 50 }),
	qc_notes_f_cells: text("qc_notes_f_cells"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_fcells_sample_id: index("idx_results_fcells_sample_id").on(table.sample_id),
		idx_results_fcells_date: index("idx_results_fcells_date").on(table.date_f_cells),
		results_fcells_sample_id_unique: unique("results_fcells_sample_id_unique").on(table.sample_id),
	}
});

export const visitsInClinical = clinical.table("visits", {
	visit_id: varchar("visit_id", { length: 50 }).primaryKey().notNull(),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull().references(() => patientsInClinical.patient_mrn, { onDelete: "cascade" } ),
	pat_enc_csn_id: varchar("pat_enc_csn_id", { length: 50 }),
	visit_type: varchar("visit_type", { length: 50 }),
	visit_subtype: varchar("visit_subtype", { length: 100 }),
	visit_start_datetime: timestamp("visit_start_datetime", { withTimezone: true, mode: 'string' }),
	visit_end_datetime: timestamp("visit_end_datetime", { withTimezone: true, mode: 'string' }),
	department_id: varchar("department_id", { length: 50 }),
	department_name: varchar("department_name", { length: 200 }),
	discharge_disposition: varchar("discharge_disposition", { length: 200 }),
	icu_admission: boolean("icu_admission"),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	bp_systolic: integer("bp_systolic"),
	bp_diastolic: integer("bp_diastolic"),
	weight_kg: numeric("weight_kg"),
},
(table) => {
	return {
		visits_pat_enc_csn_id_key: unique("visits_pat_enc_csn_id_key").on(table.pat_enc_csn_id),
	}
});

export const fact_bone_marrow_orderInClinical = clinical.table("fact_bone_marrow_order", {
	bone_marrow_order_key: serial("bone_marrow_order_key").primaryKey().notNull(),
	patient_key: integer("patient_key"),
	grady_mrn: text("grady_mrn"),
	hsp_account_id: text("hsp_account_id"),
	order_id: text("order_id").notNull(),
	result_time: timestamp("result_time", { withTimezone: true, mode: 'string' }),
	lab_code: text("lab_code"),
	lab_name: text("lab_name"),
	source_staging_table: text("source_staging_table").default('staging.raw_bone_marrow'),
	source_file_name: text("source_file_name"),
	dw_imported_at: timestamp("dw_imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		fact_bone_marrow_order_order_id_key: unique("fact_bone_marrow_order_order_id_key").on(table.order_id),
	}
});

export const results_lorrcaInLaboratory = laboratory.table("results_lorrca", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_lorrca: date("date_lorrca"),
	ei_min_lorrca: numeric("ei_min_lorrca"),
	ei_max_lorrca: numeric("ei_max_lorrca"),
	ei_delta_lorrca: numeric("ei_delta_lorrca"),
	pos_lorrca: varchar("pos_lorrca", { length: 50 }),
	instrument_lorrca: varchar("instrument_lorrca", { length: 100 }),
	qc_pass_lorrca: varchar("qc_pass_lorrca", { length: 50 }),
	qc_notes_lorrca: text("qc_notes_lorrca"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_lorrca_sample_id: index("idx_results_lorrca_sample_id").on(table.sample_id),
		idx_results_lorrca_date: index("idx_results_lorrca_date").on(table.date_lorrca),
		results_lorrca_sample_id_unique: unique("results_lorrca_sample_id_unique").on(table.sample_id),
	}
});

export const results_viscosityInLaboratory = laboratory.table("results_viscosity", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_analysis: date("date_analysis"),
	visc_45: numeric("visc_45"),
	visc_225: numeric("visc_225"),
	hvr_45: numeric("hvr_45"),
	hvr_225: numeric("hvr_225"),
	qc_pass: varchar("qc_pass", { length: 50 }),
	qc_notes: text("qc_notes"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_results_viscosity_sample_id: index("idx_results_viscosity_sample_id").on(table.sample_id),
		idx_results_viscosity_date_analysis: index("idx_results_viscosity_date_analysis").on(table.date_analysis),
		results_viscosity_sample_id_unique: unique("results_viscosity_sample_id_unique").on(table.sample_id),
	}
});

export const medication_administrationsInClinical = clinical.table("medication_administrations", {
	administration_id: serial("administration_id").primaryKey().notNull(),
	epic_order_med_id: varchar("epic_order_med_id", { length: 50 }),
	visit_id: varchar("visit_id", { length: 50 }).notNull().references(() => visitsInClinical.visit_id, { onDelete: "cascade" } ),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull().references(() => patientsInClinical.patient_mrn, { onDelete: "cascade" } ),
	medication_name: varchar("medication_name", { length: 255 }),
	administration_time: timestamp("administration_time", { withTimezone: true, mode: 'string' }).notNull(),
	dose_given: varchar("dose_given", { length: 50 }),
	units: varchar("units", { length: 50 }),
	route: varchar("route", { length: 50 }),
	reason_for_action: text("reason_for_action"),
	administering_user: varchar("administering_user", { length: 100 }),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const fact_bone_marrow_componentInClinical = clinical.table("fact_bone_marrow_component", {
	bone_marrow_component_key: serial("bone_marrow_component_key").primaryKey().notNull(),
	bone_marrow_order_key: integer("bone_marrow_order_key").references(() => fact_bone_marrow_orderInClinical.bone_marrow_order_key),
	component_id: text("component_id"),
	component_name: text("component_name"),
	result_text: text("result_text"),
	source_staging_id: integer("source_staging_id"),
	dw_imported_at: timestamp("dw_imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		fact_bone_marrow_component_bone_marrow_order_key_component__key: unique("fact_bone_marrow_component_bone_marrow_order_key_component__key").on(table.bone_marrow_order_key, table.component_id),
	}
});

export const visit_diagnosesInClinical = clinical.table("visit_diagnoses", {
	id: serial("id").primaryKey().notNull(),
	visit_id: varchar("visit_id", { length: 50 }).notNull().references(() => visitsInClinical.visit_id, { onDelete: "cascade" } ),
	diagnosis_type: varchar("diagnosis_type", { length: 50 }),
	icd10_code: varchar("icd10_code", { length: 50 }),
	diagnosis_name: text("diagnosis_name"),
	sequence_num: integer("sequence_num"),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		visit_diagnoses_visit_id_diagnosis_type_icd10_code_sequence_key: unique("visit_diagnoses_visit_id_diagnosis_type_icd10_code_sequence_key").on(table.visit_id, table.diagnosis_type, table.icd10_code, table.sequence_num),
	}
});

export const raw_bone_marrowInStaging = staging.table("raw_bone_marrow", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	source_file_name: varchar("source_file_name", { length: 255 }),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	patient_mrn: text("patient_mrn"),
	hsp_account_id: text("hsp_account_id"),
	order_id: text("order_id"),
	result_time: text("result_time"),
	lab_code: text("lab_code"),
	lab_name: text("lab_name"),
	component_id: text("component_id"),
	lab_component_description: text("lab_component_description"),
	bone_marrow_results_by_component: text("bone_marrow_results_by_component"),
});

export const lab_ordersInClinical = clinical.table("lab_orders", {
	order_id: text("order_id").primaryKey().notNull(),
	visit_id: varchar("visit_id", { length: 50 }).references(() => visitsInClinical.visit_id, { onDelete: "set null" } ),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull().references(() => patientsInClinical.patient_mrn, { onDelete: "cascade" } ),
	order_type: varchar("order_type", { length: 50 }).notNull(),
	accession_num: varchar("accession_num", { length: 50 }),
	lab_code: varchar("lab_code", { length: 50 }),
	lab_name: text("lab_name"),
	order_time: timestamp("order_time", { withTimezone: true, mode: 'string' }),
	result_time: timestamp("result_time", { withTimezone: true, mode: 'string' }),
	collection_time: timestamp("collection_time", { withTimezone: true, mode: 'string' }),
	proc_bgn_time: timestamp("proc_bgn_time", { withTimezone: true, mode: 'string' }),
	proc_end_time: timestamp("proc_end_time", { withTimezone: true, mode: 'string' }),
	source_file: varchar("source_file", { length: 100 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		lab_orders_accession_num_key: unique("lab_orders_accession_num_key").on(table.accession_num),
	}
});

export const raw_op_visitsInStaging = staging.table("raw_op_visits", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	source_file_name: text("source_file_name"),
	PATIENT_MRN: text("PATIENT_MRN"),
	PAT_ID: text("PAT_ID"),
	HSP_ACCOUNT_ID: text("HSP_ACCOUNT_ID"),
	VISIT_DATE: text("VISIT_DATE"),
	VISIT_TYPE: text("VISIT_TYPE"),
	DEPARTMENT_ID: text("DEPARTMENT_ID"),
	DEPARTMENT_NAME: text("DEPARTMENT_NAME"),
	BP_SYSTOLIC: text("BP_SYSTOLIC"),
	BP_DIASTOLIC: text("BP_DIASTOLIC"),
	WEIGHT_LBS: text("WEIGHT_LBS"),
	WEIGHT_KG: text("WEIGHT_KG"),
	CURRENT_ICD10_LIST: text("CURRENT_ICD10_LIST"),
	DX_NAME: text("DX_NAME"),
},
(table) => {
	return {
		idx_staging_raw_op_visits_mrn: index("idx_staging_raw_op_visits_mrn").on(table.PATIENT_MRN),
		idx_staging_raw_op_visits_acctid: index("idx_staging_raw_op_visits_acctid").on(table.HSP_ACCOUNT_ID),
		idx_staging_raw_op_visits_visitdt: index("idx_staging_raw_op_visits_visitdt").on(table.VISIT_DATE),
		idx_staging_raw_op_visits_icd10: index("idx_staging_raw_op_visits_icd10").on(table.CURRENT_ICD10_LIST),
	}
});

export const raw_ip_medsInStaging = staging.table("raw_ip_meds", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	source_file_name: text("source_file_name"),
	PATIENT_MRN: text("PATIENT_MRN"),
	HSP_ACCOUNT_ID: text("HSP_ACCOUNT_ID"),
	ADM_DATE_TIME: text("ADM_DATE_TIME"),
	DISCH_DATE_TIME: text("DISCH_DATE_TIME"),
	MEDICATION: text("MEDICATION"),
	DOSAGE: text("DOSAGE"),
	UNIT: text("UNIT"),
	FREQUENCY: text("FREQUENCY"),
	TAKEN_TIME: text("TAKEN_TIME"),
	RX_CLASS_NAME: text("RX_CLASS_NAME"),
},
(table) => {
	return {
		idx_staging_raw_ip_meds_mrn: index("idx_staging_raw_ip_meds_mrn").on(table.PATIENT_MRN),
		idx_staging_raw_ip_meds_acctid: index("idx_staging_raw_ip_meds_acctid").on(table.HSP_ACCOUNT_ID),
		idx_staging_raw_ip_meds_med: index("idx_staging_raw_ip_meds_med").on(table.MEDICATION),
	}
});

export const UserInApp = app.table("User", {
	id: text("id").primaryKey().notNull(),
	name: text("name"),
	email: text("email"),
	emailVerified: timestamp("emailVerified", { withTimezone: true, mode: 'string' }),
	image: text("image"),
	password: text("password"),
	role: text("role"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_user_email: index("idx_user_email").on(table.email),
		User_email_key: unique("User_email_key").on(table.email),
	}
});

export const AccountInApp = app.table("Account", {
	id: text("id").primaryKey().notNull(),
	userId: text("userId").notNull().references(() => UserInApp.id, { onDelete: "cascade" } ),
	type: text("type").notNull(),
	provider: text("provider").notNull(),
	providerAccountId: text("providerAccountId").notNull(),
	refresh_token: text("refresh_token"),
	access_token: text("access_token"),
	expires_at: integer("expires_at"),
	token_type: text("token_type"),
	scope: text("scope"),
	id_token: text("id_token"),
	session_state: text("session_state"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_account_userid: index("idx_account_userid").on(table.userId),
		idx_account_provider_account_id: uniqueIndex("idx_account_provider_account_id").on(table.provider, table.providerAccountId),
	}
});

export const SessionInApp = app.table("Session", {
	id: text("id").primaryKey().notNull(),
	sessionToken: text("sessionToken").notNull(),
	userId: text("userId").notNull().references(() => UserInApp.id, { onDelete: "cascade" } ),
	expires: timestamp("expires", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		idx_session_userid: index("idx_session_userid").on(table.userId),
		Session_sessionToken_key: unique("Session_sessionToken_key").on(table.sessionToken),
	}
});

export const raw_imagingInStaging = staging.table("raw_imaging", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	source_file_name: text("source_file_name"),
	PATIENT_MRN: text("PATIENT_MRN"),
	PAT_ENC_CSN_ID: text("PAT_ENC_CSN_ID"),
	ORDER_ID: text("ORDER_ID"),
	ACCESSION_NUM: text("ACCESSION_NUM"),
	ORDER_TIME: text("ORDER_TIME"),
	PROC_BGN_TIME: text("PROC_BGN_TIME"),
	PROC_END_TIME: text("PROC_END_TIME"),
	NARRATIVE: text("NARRATIVE"),
	IMPRESSION: text("IMPRESSION"),
	PROC_CODE: text("PROC_CODE"),
	PROCEDURE_DESCRIPTION: text("PROCEDURE_DESCRIPTION"),
},
(table) => {
	return {
		idx_staging_raw_imaging_mrn: index("idx_staging_raw_imaging_mrn").on(table.PATIENT_MRN),
		idx_staging_raw_imaging_ordid: index("idx_staging_raw_imaging_ordid").on(table.ORDER_ID),
		idx_staging_raw_imaging_accnum: index("idx_staging_raw_imaging_accnum").on(table.ACCESSION_NUM),
	}
});

export const raw_demographicsInStaging = staging.table("raw_demographics", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	source_file_name: text("source_file_name"),
	BIRTH_DATE: text("BIRTH_DATE"),
	RACE: text("RACE"),
	ETHNICITY: text("ETHNICITY"),
	PATIENT_MRN: text("PATIENT_MRN"),
	PATIENT_NAME: text("PATIENT_NAME"),
	AGE: text("AGE"),
	GENDER: text("GENDER"),
	IS_TOBACCO_USER_YN: text("IS_TOBACCO_USER_YN"),
	ALCOHOL_USER_YN: text("ALCOHOL_USER_YN"),
	ILL_DRUG_USER_YN: text("ILL_DRUG_USER_YN"),
},
(table) => {
	return {
		idx_staging_raw_demographics_mrn_new: index("idx_staging_raw_demographics_mrn_new").on(table.PATIENT_MRN),
	}
});

export const raw_ip_admissionsInStaging = staging.table("raw_ip_admissions", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	source_file_name: text("source_file_name"),
	PATIENT_MRN: text("PATIENT_MRN"),
	HSP_ACCOUNT_ID: text("HSP_ACCOUNT_ID"),
	ADM_DATE_TIME: text("ADM_DATE_TIME"),
	DISCH_DATE_TIME: text("DISCH_DATE_TIME"),
	DISCHARGE_DEPARTMENT: text("DISCHARGE_DEPARTMENT"),
	DISCHARGE_DISPOSITION: text("DISCHARGE_DISPOSITION"),
	ICU_ADMISSION_YN: text("ICU_ADMISSION_YN"),
	ADMIT_DX_CD_1: text("ADMIT_DX_CD_1"),
	ADMIT_DX_DESCRIPTION_1: text("ADMIT_DX_DESCRIPTION_1"),
	ADMIT_DX_CD_2: text("ADMIT_DX_CD_2"),
	ADMIT_DX_DESCRIPTION_2: text("ADMIT_DX_DESCRIPTION_2"),
	FINAL_DX_CD_1: text("FINAL_DX_CD_1"),
	FINAL_DX_DESCRIPTION_1: text("FINAL_DX_DESCRIPTION_1"),
	FINAL_DX_CD_2: text("FINAL_DX_CD_2"),
	FINAL_DX_DESCRIPTION_2: text("FINAL_DX_DESCRIPTION_2"),
	FINAL_DX_CD_3: text("FINAL_DX_CD_3"),
	FINAL_DX_DESCRIPTION_3: text("FINAL_DX_DESCRIPTION_3"),
	FINAL_DX_CD_4: text("FINAL_DX_CD_4"),
	FINAL_DX_DESCRIPTION_4: text("FINAL_DX_DESCRIPTION_4"),
	FINAL_DX_CD_5: text("FINAL_DX_CD_5"),
	FINAL_DX_DESCRIPTION_5: text("FINAL_DX_DESCRIPTION_5"),
},
(table) => {
	return {
		idx_staging_raw_ip_adm_mrn: index("idx_staging_raw_ip_adm_mrn").on(table.PATIENT_MRN),
		idx_staging_raw_ip_adm_hospid: index("idx_staging_raw_ip_adm_hospid").on(table.HSP_ACCOUNT_ID),
	}
});

export const raw_op_avsInStaging = staging.table("raw_op_avs", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	staging_op_avs_pk: bigint("staging_op_avs_pk", { mode: "number" }).primaryKey().notNull(),
	PATIENT_MRN: text("PATIENT_MRN"),
	HSP_ACCOUNT_ID: text("HSP_ACCOUNT_ID"),
	VISIT_DATE: text("VISIT_DATE"),
	ORDER_MED_ID: text("ORDER_MED_ID"),
	ORDER_DTTM: text("ORDER_DTTM"),
	RX_STATUS: text("RX_STATUS"),
	GENERIC_DESCRIPTION: text("GENERIC_DESCRIPTION"),
	loaded_at: timestamp("loaded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_raw_op_avs_mrn: index("idx_raw_op_avs_mrn").on(table.PATIENT_MRN),
		idx_raw_op_avs_visitdate: index("idx_raw_op_avs_visitdate").on(table.VISIT_DATE),
		idx_raw_op_avs_ordermedid: index("idx_raw_op_avs_ordermedid").on(table.ORDER_MED_ID),
	}
});

export const raw_labsInStaging = staging.table("raw_labs", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	source_file_name: text("source_file_name"),
	PATIENT_MRN: text("PATIENT_MRN"),
	PAT_ENC_CSN_ID: text("PAT_ENC_CSN_ID"),
	ORDER_TIME: text("ORDER_TIME"),
	PROC_CODE: text("PROC_CODE"),
	PROC_NAME: text("PROC_NAME"),
	COMPONENT_ID: text("COMPONENT_ID"),
	LAB_COMPONENT_DESCRIPTION: text("LAB_COMPONENT_DESCRIPTION"),
	LAB_RESULT_VALUE: text("LAB_RESULT_VALUE"),
	RESULT_TIME: text("RESULT_TIME"),
	is_processed: boolean("is_processed").default(false),
},
(table) => {
	return {
		idx_staging_raw_labs_mrn: index("idx_staging_raw_labs_mrn").on(table.PATIENT_MRN),
		idx_staging_raw_labs_csn: index("idx_staging_raw_labs_csn").on(table.PAT_ENC_CSN_ID),
		idx_staging_raw_labs_compid: index("idx_staging_raw_labs_compid").on(table.COMPONENT_ID),
		idx_raw_labs_is_processed: index("idx_raw_labs_is_processed").on(table.is_processed),
	}
});

export const results_hplcInLaboratory = laboratory.table("results_hplc", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sample_id: varchar("sample_id", { length: 50 }).notNull().references(() => samplesInLaboratory.sample_id, { onDelete: "cascade" } ),
	date_hplc: date("date_hplc"),
	qc_pass_hplc: varchar("qc_pass_hplc", { length: 50 }),
	qc_notes_hplc: text("qc_notes_hplc"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	hplc_pellet_collected: boolean("hplc_pellet_collected"),
	hplc_pellet_run: boolean("hplc_pellet_run"),
	hbf_percent: numeric("hbf_percent"),
	hba_percent: numeric("hba_percent"),
	hbs_percent: numeric("hbs_percent"),
	hba2_percent: numeric("hba2_percent"),
	hbc_percent: numeric("hbc_percent"),
},
(table) => {
	return {
		idx_results_hplc_sample_id: index("idx_results_hplc_sample_id").on(table.sample_id),
		idx_results_hplc_date: index("idx_results_hplc_date").on(table.date_hplc),
		results_hplc_sample_id_unique: unique("results_hplc_sample_id_unique").on(table.sample_id),
	}
});

export const imaging_resultsInClinical = clinical.table("imaging_results", {
	imaging_result_id: uuid("imaging_result_id").primaryKey().notNull(),
	patient_mrn: varchar("patient_mrn", { length: 50 }).notNull(),
	visit_id: uuid("visit_id"),
	order_id: varchar("order_id", { length: 100 }),
	procedure_name: text("procedure_name"),
	order_time: timestamp("order_time", { withTimezone: true, mode: 'string' }),
	result_time: timestamp("result_time", { withTimezone: true, mode: 'string' }),
	result_text: text("result_text"),
	impression: text("impression"),
	accession_number: varchar("accession_number", { length: 100 }),
	source_file: varchar("source_file", { length: 255 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const raw_mrn_mappingInStaging = staging.table("raw_mrn_mapping", {
	staging_id: serial("staging_id").primaryKey().notNull(),
	source_file_name: varchar("source_file_name", { length: 255 }),
	imported_at: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	subject_id: text("subject_id"),
	grady_mrn: text("grady_mrn"),
});

export const VerificationTokenInApp = app.table("VerificationToken", {
	identifier: text("identifier").notNull(),
	token: text("token").notNull(),
	expires: timestamp("expires", { withTimezone: true, mode: 'string' }).notNull(),
},
(table) => {
	return {
		VerificationToken_pkey: primaryKey({ columns: [table.identifier, table.token], name: "VerificationToken_pkey"}),
	}
});
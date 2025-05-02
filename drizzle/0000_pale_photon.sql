-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "clinical";
--> statement-breakpoint
CREATE SCHEMA "laboratory";
--> statement-breakpoint
CREATE SCHEMA "staging";
--> statement-breakpoint
CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."patients" (
	"patient_mrn" varchar(50) PRIMARY KEY NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"middle_name" varchar(100),
	"birth_date" date,
	"sex" varchar(20),
	"race" varchar(100),
	"ethnicity" varchar(100),
	"is_tobacco_user" varchar(20),
	"alcohol_user" varchar(20),
	"ill_drug_user" varchar(20),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."lab_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"component_id" text,
	"component_name" text,
	"result_value" text,
	"result_value_numeric" numeric,
	"reference_range" varchar(100),
	"units" varchar(50),
	"abnormal_flag" varchar(20),
	"result_time" timestamp with time zone,
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "lab_results_order_id_component_id_key" UNIQUE("order_id","component_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."bone_marrow_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"component_id" varchar(50),
	"component_name" varchar(200),
	"result_text" text,
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "bone_marrow_results_order_id_component_id_key" UNIQUE("order_id","component_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_dna" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_dna" date,
	"concentration_1_dna" numeric,
	"purity_1_dna" numeric,
	"concentration_2_dna" numeric,
	"purity_2_dna" numeric,
	"qc_pass_dna" varchar(50),
	"qc_notes_dna" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_dna_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_plasma" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_plasma" date,
	"vol_plasma_1" numeric,
	"vol_plasma_2" numeric,
	"vol_plasma_3" numeric,
	"qc_notes_plasma" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_plasma_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_pbmc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_pbmc" date,
	"sent_to_gt_pbmc" numeric,
	"qc_notes_pbmc" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"cell_number_1_pbmc" numeric,
	"cell_number_2_pbmc" numeric,
	CONSTRAINT "results_pbmc_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_adhesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_adhesion" date,
	"cells_adhered_adhesion" numeric,
	"qc_pass_adhesion" varchar(50),
	"qc_notes_adhesion" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_adhesion_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."omics_subjects" (
	"subject_id" varchar(20) PRIMARY KEY NOT NULL,
	"patient_mrn" varchar(50) NOT NULL,
	"project" varchar(20) DEFAULT 'OMI'::character varying,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."v_acs_pneumonia_admissions_summary" (
	"visit_id" varchar(50),
	"patient_mrn" varchar(50),
	"has_omics_data" boolean,
	"is_acs_pneumonia_admission" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."samples" (
	"sample_id" varchar(50) PRIMARY KEY NOT NULL,
	"subject_id" varchar(20) NOT NULL,
	"sample_number" integer NOT NULL,
	"date_of_collection" date,
	"age_at_collection" numeric,
	"genotype" varchar(50),
	"therapies" text,
	"days_to_processing" integer,
	"steady_state" varchar(50),
	"transfusion_status" varchar(50),
	"transfusion_confirmed" varchar(50),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "samples_subject_id_sample_number_key" UNIQUE("subject_id","sample_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."subject_registration" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" varchar(20) NOT NULL,
	"patient_mrn" varchar(50) NOT NULL,
	"registration_date" date,
	"consent_date" date,
	"corporate_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "subject_registration_subject_id_key" UNIQUE("subject_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."medication_orders" (
	"medication_order_id" serial PRIMARY KEY NOT NULL,
	"epic_order_med_id" varchar(50),
	"visit_id" varchar(50),
	"patient_mrn" varchar(50) NOT NULL,
	"medication_name" varchar(255),
	"order_time" timestamp with time zone,
	"status" varchar(50),
	"dose" varchar(50),
	"units" varchar(50),
	"route" varchar(50),
	"frequency" varchar(100),
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_advia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_advia" date,
	"rbc_advia" numeric,
	"hb_advia" numeric,
	"hct_advia" numeric,
	"mcv_advia" numeric,
	"mch_advia" numeric,
	"mchc_advia" numeric,
	"rdw_advia" numeric,
	"hdw_advia" numeric,
	"plt_advia" numeric,
	"mpv_advia" numeric,
	"wbc_advia" numeric,
	"neut_advia" numeric,
	"retic_advia" numeric,
	"chr_advia" numeric,
	"hc41_v120_advia" numeric,
	"hc41_v60_120_advia" numeric,
	"hc41_v60_advia" numeric,
	"drbc_advia" numeric,
	"hyper_advia" numeric,
	"nrbc_advia" numeric,
	"qc_pass_advia" varchar(50),
	"qc_notes_advia" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_advia_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_fcells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_f_cells" date,
	"percent_f_cells" numeric,
	"stain_f_cells" varchar(100),
	"cytometer_f_cells" varchar(100),
	"qc_pass_f_cells" varchar(50),
	"qc_notes_f_cells" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_fcells_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."visits" (
	"visit_id" varchar(50) PRIMARY KEY NOT NULL,
	"patient_mrn" varchar(50) NOT NULL,
	"pat_enc_csn_id" varchar(50),
	"visit_type" varchar(50),
	"visit_subtype" varchar(100),
	"visit_start_datetime" timestamp with time zone,
	"visit_end_datetime" timestamp with time zone,
	"department_id" varchar(50),
	"department_name" varchar(200),
	"discharge_disposition" varchar(200),
	"icu_admission" boolean,
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"bp_systolic" integer,
	"bp_diastolic" integer,
	"weight_kg" numeric,
	CONSTRAINT "visits_pat_enc_csn_id_key" UNIQUE("pat_enc_csn_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."fact_bone_marrow_order" (
	"bone_marrow_order_key" serial PRIMARY KEY NOT NULL,
	"patient_key" integer,
	"grady_mrn" text,
	"hsp_account_id" text,
	"order_id" text NOT NULL,
	"result_time" timestamp with time zone,
	"lab_code" text,
	"lab_name" text,
	"source_staging_table" text DEFAULT 'staging.raw_bone_marrow',
	"source_file_name" text,
	"dw_imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "fact_bone_marrow_order_order_id_key" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_lorrca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_lorrca" date,
	"ei_min_lorrca" numeric,
	"ei_max_lorrca" numeric,
	"ei_delta_lorrca" numeric,
	"pos_lorrca" varchar(50),
	"instrument_lorrca" varchar(100),
	"qc_pass_lorrca" varchar(50),
	"qc_notes_lorrca" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_lorrca_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_viscosity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_analysis" date,
	"visc_45" numeric,
	"visc_225" numeric,
	"hvr_45" numeric,
	"hvr_225" numeric,
	"qc_pass" varchar(50),
	"qc_notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "results_viscosity_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."medication_administrations" (
	"administration_id" serial PRIMARY KEY NOT NULL,
	"epic_order_med_id" varchar(50),
	"visit_id" varchar(50) NOT NULL,
	"patient_mrn" varchar(50) NOT NULL,
	"medication_name" varchar(255),
	"administration_time" timestamp with time zone NOT NULL,
	"dose_given" varchar(50),
	"units" varchar(50),
	"route" varchar(50),
	"reason_for_action" text,
	"administering_user" varchar(100),
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."fact_bone_marrow_component" (
	"bone_marrow_component_key" serial PRIMARY KEY NOT NULL,
	"bone_marrow_order_key" integer,
	"component_id" text,
	"component_name" text,
	"result_text" text,
	"source_staging_id" integer,
	"dw_imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "fact_bone_marrow_component_bone_marrow_order_key_component__key" UNIQUE("bone_marrow_order_key","component_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."visit_diagnoses" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" varchar(50) NOT NULL,
	"diagnosis_type" varchar(50),
	"icd10_code" varchar(50),
	"diagnosis_name" text,
	"sequence_num" integer,
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "visit_diagnoses_visit_id_diagnosis_type_icd10_code_sequence_key" UNIQUE("visit_id","diagnosis_type","icd10_code","sequence_num")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_bone_marrow" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"source_file_name" varchar(255),
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"patient_mrn" text,
	"hsp_account_id" text,
	"order_id" text,
	"result_time" text,
	"lab_code" text,
	"lab_name" text,
	"component_id" text,
	"lab_component_description" text,
	"bone_marrow_results_by_component" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."lab_orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"visit_id" varchar(50),
	"patient_mrn" varchar(50) NOT NULL,
	"order_type" varchar(50) NOT NULL,
	"accession_num" varchar(50),
	"lab_code" varchar(50),
	"lab_name" text,
	"order_time" timestamp with time zone,
	"result_time" timestamp with time zone,
	"collection_time" timestamp with time zone,
	"proc_bgn_time" timestamp with time zone,
	"proc_end_time" timestamp with time zone,
	"source_file" varchar(100),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "lab_orders_accession_num_key" UNIQUE("accession_num")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_op_visits" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"source_file_name" text,
	"PATIENT_MRN" text,
	"PAT_ID" text,
	"HSP_ACCOUNT_ID" text,
	"VISIT_DATE" text,
	"VISIT_TYPE" text,
	"DEPARTMENT_ID" text,
	"DEPARTMENT_NAME" text,
	"BP_SYSTOLIC" text,
	"BP_DIASTOLIC" text,
	"WEIGHT_LBS" text,
	"WEIGHT_KG" text,
	"CURRENT_ICD10_LIST" text,
	"DX_NAME" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_ip_meds" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"source_file_name" text,
	"PATIENT_MRN" text,
	"HSP_ACCOUNT_ID" text,
	"ADM_DATE_TIME" text,
	"DISCH_DATE_TIME" text,
	"MEDICATION" text,
	"DOSAGE" text,
	"UNIT" text,
	"FREQUENCY" text,
	"TAKEN_TIME" text,
	"RX_CLASS_NAME" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app"."User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp with time zone,
	"image" text,
	"password" text,
	"role" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "User_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app"."Account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app"."Session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "Session_sessionToken_key" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_imaging" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"source_file_name" text,
	"PATIENT_MRN" text,
	"PAT_ENC_CSN_ID" text,
	"ORDER_ID" text,
	"ACCESSION_NUM" text,
	"ORDER_TIME" text,
	"PROC_BGN_TIME" text,
	"PROC_END_TIME" text,
	"NARRATIVE" text,
	"IMPRESSION" text,
	"PROC_CODE" text,
	"PROCEDURE_DESCRIPTION" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_demographics" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"source_file_name" text,
	"BIRTH_DATE" text,
	"RACE" text,
	"ETHNICITY" text,
	"PATIENT_MRN" text,
	"PATIENT_NAME" text,
	"AGE" text,
	"GENDER" text,
	"IS_TOBACCO_USER_YN" text,
	"ALCOHOL_USER_YN" text,
	"ILL_DRUG_USER_YN" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_ip_admissions" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"source_file_name" text,
	"PATIENT_MRN" text,
	"HSP_ACCOUNT_ID" text,
	"ADM_DATE_TIME" text,
	"DISCH_DATE_TIME" text,
	"DISCHARGE_DEPARTMENT" text,
	"DISCHARGE_DISPOSITION" text,
	"ICU_ADMISSION_YN" text,
	"ADMIT_DX_CD_1" text,
	"ADMIT_DX_DESCRIPTION_1" text,
	"ADMIT_DX_CD_2" text,
	"ADMIT_DX_DESCRIPTION_2" text,
	"FINAL_DX_CD_1" text,
	"FINAL_DX_DESCRIPTION_1" text,
	"FINAL_DX_CD_2" text,
	"FINAL_DX_DESCRIPTION_2" text,
	"FINAL_DX_CD_3" text,
	"FINAL_DX_DESCRIPTION_3" text,
	"FINAL_DX_CD_4" text,
	"FINAL_DX_DESCRIPTION_4" text,
	"FINAL_DX_CD_5" text,
	"FINAL_DX_DESCRIPTION_5" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_op_avs" (
	"staging_op_avs_pk" bigint PRIMARY KEY NOT NULL,
	"PATIENT_MRN" text,
	"HSP_ACCOUNT_ID" text,
	"VISIT_DATE" text,
	"ORDER_MED_ID" text,
	"ORDER_DTTM" text,
	"RX_STATUS" text,
	"GENERIC_DESCRIPTION" text,
	"loaded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_labs" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"source_file_name" text,
	"PATIENT_MRN" text,
	"PAT_ENC_CSN_ID" text,
	"ORDER_TIME" text,
	"PROC_CODE" text,
	"PROC_NAME" text,
	"COMPONENT_ID" text,
	"LAB_COMPONENT_DESCRIPTION" text,
	"LAB_RESULT_VALUE" text,
	"RESULT_TIME" text,
	"is_processed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "laboratory"."results_hplc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sample_id" varchar(50) NOT NULL,
	"date_hplc" date,
	"qc_pass_hplc" varchar(50),
	"qc_notes_hplc" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"hplc_pellet_collected" boolean,
	"hplc_pellet_run" boolean,
	"hbf_percent" numeric,
	"hba_percent" numeric,
	"hbs_percent" numeric,
	"hba2_percent" numeric,
	"hbc_percent" numeric,
	CONSTRAINT "results_hplc_sample_id_unique" UNIQUE("sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical"."imaging_results" (
	"imaging_result_id" uuid PRIMARY KEY NOT NULL,
	"patient_mrn" varchar(50) NOT NULL,
	"visit_id" uuid,
	"order_id" varchar(100),
	"procedure_name" text,
	"order_time" timestamp with time zone,
	"result_time" timestamp with time zone,
	"result_text" text,
	"impression" text,
	"accession_number" varchar(100),
	"source_file" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staging"."raw_mrn_mapping" (
	"staging_id" serial PRIMARY KEY NOT NULL,
	"source_file_name" varchar(255),
	"imported_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"subject_id" text,
	"grady_mrn" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app"."VerificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "VerificationToken_pkey" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."lab_results" ADD CONSTRAINT "lab_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "clinical"."lab_orders"("order_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."bone_marrow_results" ADD CONSTRAINT "bone_marrow_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "clinical"."lab_orders"("order_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_dna" ADD CONSTRAINT "results_dna_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_plasma" ADD CONSTRAINT "results_plasma_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_pbmc" ADD CONSTRAINT "results_pbmc_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_adhesion" ADD CONSTRAINT "results_adhesion_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."samples" ADD CONSTRAINT "samples_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "laboratory"."omics_subjects"("subject_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."subject_registration" ADD CONSTRAINT "subject_registration_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "laboratory"."omics_subjects"("subject_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."subject_registration" ADD CONSTRAINT "subject_registration_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "clinical"."patients"("patient_mrn") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."medication_orders" ADD CONSTRAINT "medication_orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "clinical"."visits"("visit_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."medication_orders" ADD CONSTRAINT "medication_orders_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "clinical"."patients"("patient_mrn") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_advia" ADD CONSTRAINT "results_advia_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_fcells" ADD CONSTRAINT "results_fcells_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."visits" ADD CONSTRAINT "visits_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "clinical"."patients"("patient_mrn") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_lorrca" ADD CONSTRAINT "results_lorrca_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_viscosity" ADD CONSTRAINT "results_viscosity_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."medication_administrations" ADD CONSTRAINT "medication_administrations_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "clinical"."visits"("visit_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."medication_administrations" ADD CONSTRAINT "medication_administrations_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "clinical"."patients"("patient_mrn") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."fact_bone_marrow_component" ADD CONSTRAINT "fact_bone_marrow_component_bone_marrow_order_key_fkey" FOREIGN KEY ("bone_marrow_order_key") REFERENCES "clinical"."fact_bone_marrow_order"("bone_marrow_order_key") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "clinical"."visits"("visit_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."lab_orders" ADD CONSTRAINT "lab_orders_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "clinical"."patients"("patient_mrn") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical"."lab_orders" ADD CONSTRAINT "lab_orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "clinical"."visits"("visit_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "app"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "laboratory"."results_hplc" ADD CONSTRAINT "results_hplc_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "laboratory"."samples"("sample_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_dna_sample_id" ON "laboratory"."results_dna" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_dna_date" ON "laboratory"."results_dna" ("date_dna");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_plasma_sample_id" ON "laboratory"."results_plasma" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_plasma_date" ON "laboratory"."results_plasma" ("date_plasma");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_pbmc_sample_id" ON "laboratory"."results_pbmc" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_pbmc_date" ON "laboratory"."results_pbmc" ("date_pbmc");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_adhesion_sample_id" ON "laboratory"."results_adhesion" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_adhesion_date" ON "laboratory"."results_adhesion" ("date_adhesion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_advia_sample_id" ON "laboratory"."results_advia" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_advia_date" ON "laboratory"."results_advia" ("date_advia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_fcells_sample_id" ON "laboratory"."results_fcells" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_fcells_date" ON "laboratory"."results_fcells" ("date_f_cells");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_lorrca_sample_id" ON "laboratory"."results_lorrca" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_lorrca_date" ON "laboratory"."results_lorrca" ("date_lorrca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_viscosity_sample_id" ON "laboratory"."results_viscosity" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_viscosity_date_analysis" ON "laboratory"."results_viscosity" ("date_analysis");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_op_visits_mrn" ON "staging"."raw_op_visits" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_op_visits_acctid" ON "staging"."raw_op_visits" ("HSP_ACCOUNT_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_op_visits_visitdt" ON "staging"."raw_op_visits" ("VISIT_DATE");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_op_visits_icd10" ON "staging"."raw_op_visits" ("CURRENT_ICD10_LIST");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_ip_meds_mrn" ON "staging"."raw_ip_meds" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_ip_meds_acctid" ON "staging"."raw_ip_meds" ("HSP_ACCOUNT_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_ip_meds_med" ON "staging"."raw_ip_meds" ("MEDICATION");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "app"."User" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_userid" ON "app"."Account" ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_account_provider_account_id" ON "app"."Account" ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_session_userid" ON "app"."Session" ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_imaging_mrn" ON "staging"."raw_imaging" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_imaging_ordid" ON "staging"."raw_imaging" ("ORDER_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_imaging_accnum" ON "staging"."raw_imaging" ("ACCESSION_NUM");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_demographics_mrn_new" ON "staging"."raw_demographics" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_ip_adm_mrn" ON "staging"."raw_ip_admissions" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_ip_adm_hospid" ON "staging"."raw_ip_admissions" ("HSP_ACCOUNT_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_raw_op_avs_mrn" ON "staging"."raw_op_avs" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_raw_op_avs_visitdate" ON "staging"."raw_op_avs" ("VISIT_DATE");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_raw_op_avs_ordermedid" ON "staging"."raw_op_avs" ("ORDER_MED_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_labs_mrn" ON "staging"."raw_labs" ("PATIENT_MRN");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_labs_csn" ON "staging"."raw_labs" ("PAT_ENC_CSN_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_staging_raw_labs_compid" ON "staging"."raw_labs" ("COMPONENT_ID");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_raw_labs_is_processed" ON "staging"."raw_labs" ("is_processed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_hplc_sample_id" ON "laboratory"."results_hplc" ("sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_results_hplc_date" ON "laboratory"."results_hplc" ("date_hplc");
*/
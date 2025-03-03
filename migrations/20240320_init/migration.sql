-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "clinical";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "laboratory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "phi";

-- CreateTable
CREATE TABLE "audit"."audit_log" (
    "id" BIGSERIAL NOT NULL,
    "table_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical"."bone_marrow" (
    "id" BIGSERIAL NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "hsp_account_id" VARCHAR(50) NOT NULL,
    "order_id" VARCHAR(50),
    "result_time" TIMESTAMPTZ(6) NOT NULL,
    "lab_code" VARCHAR(50),
    "lab_name" VARCHAR(200),
    "component_id" VARCHAR(50),
    "lab_component_description" TEXT,
    "bone_marrow_results_by_component" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bone_marrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical"."demographics" (
    "id" SERIAL NOT NULL,
    "patient_mrn" VARCHAR(50),
    "birth_date" TIMESTAMPTZ(6),
    "age" INTEGER,
    "gender" VARCHAR(20),
    "race" VARCHAR(50),
    "ethnicity" VARCHAR(50),
    "is_tobacco_user_yn" VARCHAR(10),
    "alcohol_user_yn" VARCHAR(10),
    "ill_drug_user_yn" VARCHAR(10),
    "source" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demographics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical"."ip_admissions" (
    "id" BIGSERIAL NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "hsp_account_id" VARCHAR(50) NOT NULL,
    "adm_date_time" TIMESTAMPTZ(6) NOT NULL,
    "disch_date_time" TIMESTAMPTZ(6),
    "discharge_department" VARCHAR(200),
    "discharge_disposition" VARCHAR(200),
    "icu_admission_yn" VARCHAR(10),
    "admit_dx_cd_1" VARCHAR(50),
    "admit_dx_description_1" TEXT,
    "admit_dx_cd_2" VARCHAR(50),
    "admit_dx_description_2" TEXT,
    "final_dx_cd_1" VARCHAR(50),
    "final_dx_description_1" TEXT,
    "final_dx_cd_2" VARCHAR(50),
    "final_dx_description_2" TEXT,
    "final_dx_cd_3" VARCHAR(50),
    "final_dx_description_3" TEXT,
    "final_dx_cd_4" VARCHAR(50),
    "final_dx_description_4" TEXT,
    "final_dx_cd_5" VARCHAR(50),
    "final_dx_description_5" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "has_date_issues" BOOLEAN DEFAULT false,
    "date_issue_notes" TEXT,

    CONSTRAINT "ip_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical"."ip_medications" (
    "id" BIGSERIAL NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "hsp_account_id" VARCHAR(50) NOT NULL,
    "adm_date_time" TIMESTAMPTZ(6) NOT NULL,
    "disch_date_time" TIMESTAMPTZ(6),
    "medication" VARCHAR(200) NOT NULL,
    "dosage" VARCHAR(100),
    "unit" VARCHAR(50),
    "frequency" VARCHAR(100),
    "taken_time" TIMESTAMPTZ(6),
    "rx_class_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "has_date_issues" BOOLEAN DEFAULT false,
    "date_issue_notes" TEXT,

    CONSTRAINT "ip_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical"."op_medications" (
    "id" BIGSERIAL NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "hsp_account_id" VARCHAR(50) NOT NULL,
    "visit_date" TIMESTAMPTZ(6) NOT NULL,
    "order_med_id" VARCHAR(50),
    "order_dttm" TIMESTAMPTZ(6),
    "rx_status" VARCHAR(50),
    "generic_description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "op_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical"."op_visits" (
    "id" BIGSERIAL NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "pat_id" VARCHAR(50),
    "hsp_account_id" VARCHAR(50) NOT NULL,
    "visit_date" TIMESTAMPTZ(6) NOT NULL,
    "visit_type" VARCHAR(100),
    "department_id" VARCHAR(50),
    "department_name" VARCHAR(200),
    "bp_systolic" INTEGER,
    "bp_diastolic" INTEGER,
    "weight_lbs" DECIMAL,
    "weight_kg" DECIMAL,
    "current_icd10_list" TEXT,
    "dx_name" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "op_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory"."omics_results" (
    "id" TEXT NOT NULL,
    "project" VARCHAR(20),
    "subject_id" VARCHAR(20) NOT NULL,
    "sample_number" INTEGER NOT NULL,
    "sample_id" VARCHAR(50) NOT NULL,
    "date_of_collection" DATE,
    "age_at_collection" DECIMAL,
    "genotype" VARCHAR(50),
    "sex" VARCHAR(20),
    "therapies" TEXT,
    "days_to_processing" INTEGER,
    "steady_state" VARCHAR(50),
    "transfusion_status" VARCHAR(50),
    "transfusion_confirmed" VARCHAR(50),
    "date_advia" DATE,
    "rbc_advia" DECIMAL,
    "hb_advia" DECIMAL,
    "hct_advia" DECIMAL,
    "mcv_advia" DECIMAL,
    "mch_advia" DECIMAL,
    "mchc_advia" DECIMAL,
    "rdw_advia" DECIMAL,
    "hdw_advia" DECIMAL,
    "plt_advia" DECIMAL,
    "mpv_advia" DECIMAL,
    "wbc_advia" DECIMAL,
    "neut_advia" DECIMAL,
    "retic_advia" DECIMAL,
    "chr_advia" DECIMAL,
    "hc41_v120_advia" DECIMAL,
    "hc41_v60_120_advia" DECIMAL,
    "hc41_v60_advia" DECIMAL,
    "drbc_advia" DECIMAL,
    "hyper_advia" DECIMAL,
    "nrbc_advia" DECIMAL,
    "qc_pass_advia" VARCHAR(50),
    "qc_notes_advia" TEXT,
    "date_lorrca" DATE,
    "ei_min_lorrca" DECIMAL,
    "ei_max_lorrca" DECIMAL,
    "ei_delta_lorrca" DECIMAL,
    "pos_lorrca" DECIMAL,
    "instrument_lorrca" VARCHAR(100),
    "qc_pass_lorrca" VARCHAR(50),
    "qc_notes_lorrca" TEXT,
    "date_visc" DATE,
    "visc_45" DECIMAL,
    "visc_225" DECIMAL,
    "qc_pass_viscosity" VARCHAR(50),
    "qc_notes_viscosity" TEXT,
    "date_hvr" DATE,
    "hvr_45" DECIMAL,
    "hvr_225" DECIMAL,
    "qc_pass_hvr" VARCHAR(50),
    "qc_notes_hvr" TEXT,
    "date_dna" DATE,
    "concentration_1_dna" DECIMAL,
    "purity_1_dna" DECIMAL,
    "concentration_2_dna" DECIMAL,
    "purity_2_dna" DECIMAL,
    "qc_pass_dna" VARCHAR(50),
    "qc_notes_dna" TEXT,
    "date_plasma" DATE,
    "vol_plasma_1" DECIMAL,
    "vol_plasma_2" DECIMAL,
    "vol_plasma_3" DECIMAL,
    "qc_notes_plasma" TEXT,
    "date_pmbc" DATE,
    "cell_number_1_pbmc" DECIMAL,
    "cell_number_2_pbmc" DECIMAL,
    "sent_to_gt_pbmc" VARCHAR(50),
    "qc_notes_pbmc" TEXT,
    "date_f_cells" DATE,
    "percent_f_cells" DECIMAL,
    "stain_f_cells" VARCHAR(100),
    "cytometer_f_cells" VARCHAR(100),
    "qc_pass_f_cells" VARCHAR(50),
    "qc_notes_f_cells" TEXT,
    "date_adhesion" DATE,
    "cells_adhered_adhesion" DECIMAL,
    "qc_pass_adhesion" VARCHAR(50),
    "qc_notes_adhesion" TEXT,
    "date_hplc" DATE,
    "hbf_percent_grady_hplc" DECIMAL,
    "hba_percent_grady_hplc" DECIMAL,
    "hbc_percent_grady_hplc" DECIMAL,
    "hba2_percent_grady_hplc" DECIMAL,
    "hbs_percent_grady_hplc" DECIMAL,
    "hbf_percent_d10_hplc" DECIMAL,
    "hba_percent_d10_hplc" DECIMAL,
    "hbc_percent_d10_hplc" DECIMAL,
    "hba2_percent_d10_hplc" DECIMAL,
    "hbs_percent_d10_hplc" DECIMAL,
    "hbf_percent_d10_fcell_ratio" DECIMAL,
    "hbf_percent_grady_fcell_ratio" DECIMAL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "omics_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory"."omics_subjects" (
    "subject_id" VARCHAR(20) NOT NULL,
    "patient_mrn" VARCHAR(50) NOT NULL,
    "project" VARCHAR(20) NOT NULL DEFAULT 'OMI',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "omics_subjects_pkey" PRIMARY KEY ("subject_id")
);

-- CreateTable
CREATE TABLE "phi"."patients" (
    "patient_mrn" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "birth_date" DATE,
    "sex" VARCHAR(20),
    "race" VARCHAR(100),
    "ethnicity" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("patient_mrn")
);

-- CreateIndex
CREATE INDEX "idx_bone_marrow_date" ON "clinical"."bone_marrow"("result_time");

-- CreateIndex
CREATE INDEX "idx_bone_marrow_hsp_account" ON "clinical"."bone_marrow"("hsp_account_id");

-- CreateIndex
CREATE INDEX "idx_bone_marrow_mrn" ON "clinical"."bone_marrow"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_bone_marrow_order" ON "clinical"."bone_marrow"("order_id");

-- CreateIndex
CREATE INDEX "idx_demographics_birth_date" ON "clinical"."demographics"("birth_date");

-- CreateIndex
CREATE INDEX "idx_demographics_mrn" ON "clinical"."demographics"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_ip_admissions_dates" ON "clinical"."ip_admissions"("adm_date_time", "disch_date_time");

-- CreateIndex
CREATE INDEX "idx_ip_admissions_hsp_account" ON "clinical"."ip_admissions"("hsp_account_id");

-- CreateIndex
CREATE INDEX "idx_ip_admissions_mrn" ON "clinical"."ip_admissions"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_ip_medications_dates" ON "clinical"."ip_medications"("adm_date_time", "disch_date_time", "taken_time");

-- CreateIndex
CREATE INDEX "idx_ip_medications_hsp_account" ON "clinical"."ip_medications"("hsp_account_id");

-- CreateIndex
CREATE INDEX "idx_ip_medications_mrn" ON "clinical"."ip_medications"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_op_medications_dates" ON "clinical"."op_medications"("visit_date", "order_dttm");

-- CreateIndex
CREATE INDEX "idx_op_medications_hsp_account" ON "clinical"."op_medications"("hsp_account_id");

-- CreateIndex
CREATE INDEX "idx_op_medications_mrn" ON "clinical"."op_medications"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_op_medications_order" ON "clinical"."op_medications"("order_med_id");

-- CreateIndex
CREATE INDEX "idx_op_visits_date" ON "clinical"."op_visits"("visit_date");

-- CreateIndex
CREATE INDEX "idx_op_visits_hsp_account" ON "clinical"."op_visits"("hsp_account_id");

-- CreateIndex
CREATE INDEX "idx_op_visits_mrn" ON "clinical"."op_visits"("patient_mrn");

-- CreateIndex
CREATE INDEX "idx_op_visits_pat_id" ON "clinical"."op_visits"("pat_id");

-- CreateIndex
CREATE UNIQUE INDEX "omics_results_sample_id_key" ON "laboratory"."omics_results"("sample_id");

-- CreateIndex
CREATE INDEX "idx_omics_results_collection_date" ON "laboratory"."omics_results"("date_of_collection");

-- CreateIndex
CREATE INDEX "idx_omics_results_sample_number" ON "laboratory"."omics_results"("subject_id", "sample_number");

-- CreateIndex
CREATE INDEX "idx_omics_results_subject_id" ON "laboratory"."omics_results"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "omics_results_subject_id_sample_number_key" ON "laboratory"."omics_results"("subject_id", "sample_number");

-- CreateIndex
CREATE INDEX "idx_omics_subjects_mrn" ON "laboratory"."omics_subjects"("patient_mrn");

-- CreateIndex
CREATE UNIQUE INDEX "omics_subjects_patient_mrn_project_key" ON "laboratory"."omics_subjects"("patient_mrn", "project");

-- AddForeignKey
ALTER TABLE "clinical"."bone_marrow" ADD CONSTRAINT "bone_marrow_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical"."demographics" ADD CONSTRAINT "demographics_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical"."ip_admissions" ADD CONSTRAINT "ip_admissions_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical"."ip_medications" ADD CONSTRAINT "ip_medications_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical"."op_medications" ADD CONSTRAINT "op_medications_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clinical"."op_visits" ADD CONSTRAINT "op_visits_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory"."omics_results" ADD CONSTRAINT "omics_results_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "laboratory"."omics_subjects"("subject_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory"."omics_subjects" ADD CONSTRAINT "omics_subjects_patient_mrn_fkey" FOREIGN KEY ("patient_mrn") REFERENCES "phi"."patients"("patient_mrn") ON DELETE NO ACTION ON UPDATE NO ACTION;


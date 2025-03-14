--
-- PostgreSQL database dump
--

-- Dumped from database version 14.13 (Homebrew)
-- Dumped by pg_dump version 14.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = on;

--
-- Name: app; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app;


--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: clinical; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA clinical;


--
-- Name: laboratory; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA laboratory;


--
-- Name: phi; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA phi;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

-- Extension pgcrypto is already enabled in Supabase


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

-- Extension "uuid-ossp" is already enabled in Supabase


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.audit_log (
    id bigint NOT NULL,
    table_name text NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by text NOT NULL,
    changed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: audit; Owner: -
--

CREATE SEQUENCE audit.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: audit; Owner: -
--

ALTER SEQUENCE audit.audit_log_id_seq OWNED BY audit.audit_log.id;


--
-- Name: bone_marrow; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.bone_marrow (
    id bigint NOT NULL,
    patient_mrn character varying(50) NOT NULL,
    hsp_account_id character varying(50) NOT NULL,
    order_id character varying(50),
    result_time timestamp(6) with time zone NOT NULL,
    lab_code character varying(50),
    lab_name character varying(200),
    component_id character varying(50),
    lab_component_description text,
    bone_marrow_results_by_component text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bone_marrow_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.bone_marrow_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bone_marrow_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.bone_marrow_id_seq OWNED BY clinical.bone_marrow.id;


--
-- Name: demographics; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.demographics (
    id integer NOT NULL,
    patient_mrn character varying(50),
    birth_date timestamp(6) with time zone,
    age integer,
    gender character varying(20),
    race character varying(50),
    ethnicity character varying(50),
    is_tobacco_user_yn character varying(10),
    alcohol_user_yn character varying(10),
    ill_drug_user_yn character varying(10),
    source character varying(50),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: demographics_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.demographics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: demographics_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.demographics_id_seq OWNED BY clinical.demographics.id;


--
-- Name: ip_admissions; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.ip_admissions (
    id bigint NOT NULL,
    patient_mrn character varying(50) NOT NULL,
    hsp_account_id character varying(50) NOT NULL,
    adm_date_time timestamp(6) with time zone NOT NULL,
    disch_date_time timestamp(6) with time zone,
    discharge_department character varying(200),
    discharge_disposition character varying(200),
    icu_admission_yn character varying(10),
    admit_dx_cd_1 character varying(50),
    admit_dx_description_1 text,
    admit_dx_cd_2 character varying(50),
    admit_dx_description_2 text,
    final_dx_cd_1 character varying(50),
    final_dx_description_1 text,
    final_dx_cd_2 character varying(50),
    final_dx_description_2 text,
    final_dx_cd_3 character varying(50),
    final_dx_description_3 text,
    final_dx_cd_4 character varying(50),
    final_dx_description_4 text,
    final_dx_cd_5 character varying(50),
    final_dx_description_5 text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    has_date_issues boolean DEFAULT false,
    date_issue_notes text
);


--
-- Name: ip_admissions_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.ip_admissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_admissions_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.ip_admissions_id_seq OWNED BY clinical.ip_admissions.id;


--
-- Name: ip_medications; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.ip_medications (
    id bigint NOT NULL,
    patient_mrn character varying(50) NOT NULL,
    hsp_account_id character varying(50) NOT NULL,
    adm_date_time timestamp(6) with time zone NOT NULL,
    disch_date_time timestamp(6) with time zone,
    medication character varying(200) NOT NULL,
    dosage character varying(100),
    unit character varying(50),
    frequency character varying(100),
    taken_time timestamp(6) with time zone,
    rx_class_name character varying(100),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    has_date_issues boolean DEFAULT false,
    date_issue_notes text
);


--
-- Name: ip_medications_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.ip_medications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ip_medications_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.ip_medications_id_seq OWNED BY clinical.ip_medications.id;


--
-- Name: op_medications; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.op_medications (
    id bigint NOT NULL,
    patient_mrn character varying(50) NOT NULL,
    hsp_account_id character varying(50) NOT NULL,
    visit_date timestamp(6) with time zone NOT NULL,
    order_med_id character varying(50),
    order_dttm timestamp(6) with time zone,
    rx_status character varying(50),
    generic_description text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: op_medications_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.op_medications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: op_medications_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.op_medications_id_seq OWNED BY clinical.op_medications.id;


--
-- Name: op_visits; Type: TABLE; Schema: clinical; Owner: -
--

CREATE TABLE clinical.op_visits (
    id bigint NOT NULL,
    patient_mrn character varying(50) NOT NULL,
    pat_id character varying(50),
    hsp_account_id character varying(50) NOT NULL,
    visit_date timestamp(6) with time zone NOT NULL,
    visit_type character varying(100),
    department_id character varying(50),
    department_name character varying(200),
    bp_systolic integer,
    bp_diastolic integer,
    weight_lbs numeric,
    weight_kg numeric,
    current_icd10_list text,
    dx_name text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: op_visits_id_seq; Type: SEQUENCE; Schema: clinical; Owner: -
--

CREATE SEQUENCE clinical.op_visits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: op_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: clinical; Owner: -
--

ALTER SEQUENCE clinical.op_visits_id_seq OWNED BY clinical.op_visits.id;


--
-- Name: omics_results; Type: TABLE; Schema: laboratory; Owner: -
--

CREATE TABLE laboratory.omics_results (
    id text NOT NULL,
    project character varying(20),
    subject_id character varying(20) NOT NULL,
    sample_number integer NOT NULL,
    sample_id character varying(50) NOT NULL,
    date_of_collection date,
    age_at_collection numeric,
    genotype character varying(50),
    sex character varying(20),
    therapies text,
    days_to_processing integer,
    steady_state character varying(50),
    transfusion_status character varying(50),
    transfusion_confirmed character varying(50),
    date_advia date,
    rbc_advia numeric,
    hb_advia numeric,
    hct_advia numeric,
    mcv_advia numeric,
    mch_advia numeric,
    mchc_advia numeric,
    rdw_advia numeric,
    hdw_advia numeric,
    plt_advia numeric,
    mpv_advia numeric,
    wbc_advia numeric,
    neut_advia numeric,
    retic_advia numeric,
    chr_advia numeric,
    hc41_v120_advia numeric,
    hc41_v60_120_advia numeric,
    hc41_v60_advia numeric,
    drbc_advia numeric,
    hyper_advia numeric,
    nrbc_advia numeric,
    qc_pass_advia character varying(50),
    qc_notes_advia text,
    date_lorrca date,
    ei_min_lorrca numeric,
    ei_max_lorrca numeric,
    ei_delta_lorrca numeric,
    pos_lorrca numeric,
    instrument_lorrca character varying(100),
    qc_pass_lorrca character varying(50),
    qc_notes_lorrca text,
    date_visc date,
    visc_45 numeric,
    visc_225 numeric,
    qc_pass_viscosity character varying(50),
    qc_notes_viscosity text,
    date_hvr date,
    hvr_45 numeric,
    hvr_225 numeric,
    qc_pass_hvr character varying(50),
    qc_notes_hvr text,
    date_dna date,
    concentration_1_dna numeric,
    purity_1_dna numeric,
    concentration_2_dna numeric,
    purity_2_dna numeric,
    qc_pass_dna character varying(50),
    qc_notes_dna text,
    date_plasma date,
    vol_plasma_1 numeric,
    vol_plasma_2 numeric,
    vol_plasma_3 numeric,
    qc_notes_plasma text,
    date_pmbc date,
    cell_number_1_pbmc numeric,
    cell_number_2_pbmc numeric,
    sent_to_gt_pbmc character varying(50),
    qc_notes_pbmc text,
    date_f_cells date,
    percent_f_cells numeric,
    stain_f_cells character varying(100),
    cytometer_f_cells character varying(100),
    qc_pass_f_cells character varying(50),
    qc_notes_f_cells text,
    date_adhesion date,
    cells_adhered_adhesion numeric,
    qc_pass_adhesion character varying(50),
    qc_notes_adhesion text,
    date_hplc date,
    hbf_percent_grady_hplc numeric,
    hba_percent_grady_hplc numeric,
    hbc_percent_grady_hplc numeric,
    hba2_percent_grady_hplc numeric,
    hbs_percent_grady_hplc numeric,
    hbf_percent_d10_hplc numeric,
    hba_percent_d10_hplc numeric,
    hbc_percent_d10_hplc numeric,
    hba2_percent_d10_hplc numeric,
    hbs_percent_d10_hplc numeric,
    hbf_percent_d10_fcell_ratio numeric,
    hbf_percent_grady_fcell_ratio numeric,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: omics_subjects; Type: TABLE; Schema: laboratory; Owner: -
--

CREATE TABLE laboratory.omics_subjects (
    subject_id character varying(20) NOT NULL,
    patient_mrn character varying(50) NOT NULL,
    project character varying(20) DEFAULT 'OMI'::character varying NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: patients; Type: TABLE; Schema: phi; Owner: -
--

CREATE TABLE phi.patients (
    patient_mrn character varying(50) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    birth_date date,
    sex character varying(20),
    race character varying(100),
    ethnicity character varying(100),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: audit_log id; Type: DEFAULT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_log ALTER COLUMN id SET DEFAULT nextval('audit.audit_log_id_seq'::regclass);


--
-- Name: bone_marrow id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.bone_marrow ALTER COLUMN id SET DEFAULT nextval('clinical.bone_marrow_id_seq'::regclass);


--
-- Name: demographics id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.demographics ALTER COLUMN id SET DEFAULT nextval('clinical.demographics_id_seq'::regclass);


--
-- Name: ip_admissions id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.ip_admissions ALTER COLUMN id SET DEFAULT nextval('clinical.ip_admissions_id_seq'::regclass);


--
-- Name: ip_medications id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.ip_medications ALTER COLUMN id SET DEFAULT nextval('clinical.ip_medications_id_seq'::regclass);


--
-- Name: op_medications id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.op_medications ALTER COLUMN id SET DEFAULT nextval('clinical.op_medications_id_seq'::regclass);


--
-- Name: op_visits id; Type: DEFAULT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.op_visits ALTER COLUMN id SET DEFAULT nextval('clinical.op_visits_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bone_marrow bone_marrow_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.bone_marrow
    ADD CONSTRAINT bone_marrow_pkey PRIMARY KEY (id);


--
-- Name: demographics demographics_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.demographics
    ADD CONSTRAINT demographics_pkey PRIMARY KEY (id);


--
-- Name: ip_admissions ip_admissions_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.ip_admissions
    ADD CONSTRAINT ip_admissions_pkey PRIMARY KEY (id);


--
-- Name: ip_medications ip_medications_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.ip_medications
    ADD CONSTRAINT ip_medications_pkey PRIMARY KEY (id);


--
-- Name: op_medications op_medications_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.op_medications
    ADD CONSTRAINT op_medications_pkey PRIMARY KEY (id);


--
-- Name: op_visits op_visits_pkey; Type: CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.op_visits
    ADD CONSTRAINT op_visits_pkey PRIMARY KEY (id);


--
-- Name: omics_results omics_results_pkey; Type: CONSTRAINT; Schema: laboratory; Owner: -
--

ALTER TABLE ONLY laboratory.omics_results
    ADD CONSTRAINT omics_results_pkey PRIMARY KEY (id);


--
-- Name: omics_subjects omics_subjects_pkey; Type: CONSTRAINT; Schema: laboratory; Owner: -
--

ALTER TABLE ONLY laboratory.omics_subjects
    ADD CONSTRAINT omics_subjects_pkey PRIMARY KEY (subject_id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: phi; Owner: -
--

ALTER TABLE ONLY phi.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (patient_mrn);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: idx_bone_marrow_date; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_bone_marrow_date ON clinical.bone_marrow USING btree (result_time);


--
-- Name: idx_bone_marrow_hsp_account; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_bone_marrow_hsp_account ON clinical.bone_marrow USING btree (hsp_account_id);


--
-- Name: idx_bone_marrow_mrn; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_bone_marrow_mrn ON clinical.bone_marrow USING btree (patient_mrn);


--
-- Name: idx_bone_marrow_order; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_bone_marrow_order ON clinical.bone_marrow USING btree (order_id);


--
-- Name: idx_demographics_birth_date; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_demographics_birth_date ON clinical.demographics USING btree (birth_date);


--
-- Name: idx_demographics_mrn; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_demographics_mrn ON clinical.demographics USING btree (patient_mrn);


--
-- Name: idx_ip_admissions_dates; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_ip_admissions_dates ON clinical.ip_admissions USING btree (adm_date_time, disch_date_time);


--
-- Name: idx_ip_admissions_hsp_account; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_ip_admissions_hsp_account ON clinical.ip_admissions USING btree (hsp_account_id);


--
-- Name: idx_ip_admissions_mrn; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_ip_admissions_mrn ON clinical.ip_admissions USING btree (patient_mrn);


--
-- Name: idx_ip_medications_dates; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_ip_medications_dates ON clinical.ip_medications USING btree (adm_date_time, disch_date_time, taken_time);


--
-- Name: idx_ip_medications_hsp_account; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_ip_medications_hsp_account ON clinical.ip_medications USING btree (hsp_account_id);


--
-- Name: idx_ip_medications_mrn; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_ip_medications_mrn ON clinical.ip_medications USING btree (patient_mrn);


--
-- Name: idx_op_medications_dates; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_medications_dates ON clinical.op_medications USING btree (visit_date, order_dttm);


--
-- Name: idx_op_medications_hsp_account; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_medications_hsp_account ON clinical.op_medications USING btree (hsp_account_id);


--
-- Name: idx_op_medications_mrn; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_medications_mrn ON clinical.op_medications USING btree (patient_mrn);


--
-- Name: idx_op_medications_order; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_medications_order ON clinical.op_medications USING btree (order_med_id);


--
-- Name: idx_op_visits_date; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_visits_date ON clinical.op_visits USING btree (visit_date);


--
-- Name: idx_op_visits_hsp_account; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_visits_hsp_account ON clinical.op_visits USING btree (hsp_account_id);


--
-- Name: idx_op_visits_mrn; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_visits_mrn ON clinical.op_visits USING btree (patient_mrn);


--
-- Name: idx_op_visits_pat_id; Type: INDEX; Schema: clinical; Owner: -
--

CREATE INDEX idx_op_visits_pat_id ON clinical.op_visits USING btree (pat_id);


--
-- Name: idx_omics_results_collection_date; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE INDEX idx_omics_results_collection_date ON laboratory.omics_results USING btree (date_of_collection);


--
-- Name: idx_omics_results_sample_number; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE INDEX idx_omics_results_sample_number ON laboratory.omics_results USING btree (subject_id, sample_number);


--
-- Name: idx_omics_results_subject_id; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE INDEX idx_omics_results_subject_id ON laboratory.omics_results USING btree (subject_id);


--
-- Name: idx_omics_subjects_mrn; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE INDEX idx_omics_subjects_mrn ON laboratory.omics_subjects USING btree (patient_mrn);


--
-- Name: omics_results_sample_id_key; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE UNIQUE INDEX omics_results_sample_id_key ON laboratory.omics_results USING btree (sample_id);


--
-- Name: omics_results_subject_id_sample_number_key; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE UNIQUE INDEX omics_results_subject_id_sample_number_key ON laboratory.omics_results USING btree (subject_id, sample_number);


--
-- Name: omics_subjects_patient_mrn_project_key; Type: INDEX; Schema: laboratory; Owner: -
--

CREATE UNIQUE INDEX omics_subjects_patient_mrn_project_key ON laboratory.omics_subjects USING btree (patient_mrn, project);


--
-- Name: bone_marrow bone_marrow_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.bone_marrow
    ADD CONSTRAINT bone_marrow_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: demographics demographics_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.demographics
    ADD CONSTRAINT demographics_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: ip_admissions ip_admissions_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.ip_admissions
    ADD CONSTRAINT ip_admissions_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: ip_medications ip_medications_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.ip_medications
    ADD CONSTRAINT ip_medications_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: op_medications op_medications_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.op_medications
    ADD CONSTRAINT op_medications_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: op_visits op_visits_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: clinical; Owner: -
--

ALTER TABLE ONLY clinical.op_visits
    ADD CONSTRAINT op_visits_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: omics_results omics_results_subject_id_fkey; Type: FK CONSTRAINT; Schema: laboratory; Owner: -
--

ALTER TABLE ONLY laboratory.omics_results
    ADD CONSTRAINT omics_results_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES laboratory.omics_subjects(subject_id);


--
-- Name: omics_subjects omics_subjects_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: laboratory; Owner: -
--

ALTER TABLE ONLY laboratory.omics_subjects
    ADD CONSTRAINT omics_subjects_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- PostgreSQL database dump complete
--


--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: phi; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA phi;


SET default_tablespace = '';

SET default_table_access_method = heap;

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
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    middle_name character varying(100)
);


--
-- Name: subject_registration; Type: TABLE; Schema: phi; Owner: -
--

CREATE TABLE phi.subject_registration (
    id integer NOT NULL,
    subject_id character varying(50) NOT NULL,
    registration_date date NOT NULL,
    consent_date date NOT NULL,
    corporate_id character varying(50),
    patient_mrn character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    last_name character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: subject_registration_id_seq; Type: SEQUENCE; Schema: phi; Owner: -
--

CREATE SEQUENCE phi.subject_registration_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subject_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: phi; Owner: -
--

ALTER SEQUENCE phi.subject_registration_id_seq OWNED BY phi.subject_registration.id;


--
-- Name: subject_registration id; Type: DEFAULT; Schema: phi; Owner: -
--

ALTER TABLE ONLY phi.subject_registration ALTER COLUMN id SET DEFAULT nextval('phi.subject_registration_id_seq'::regclass);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: phi; Owner: -
--

ALTER TABLE ONLY phi.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (patient_mrn);


--
-- Name: subject_registration subject_registration_pkey; Type: CONSTRAINT; Schema: phi; Owner: -
--

ALTER TABLE ONLY phi.subject_registration
    ADD CONSTRAINT subject_registration_pkey PRIMARY KEY (id);


--
-- Name: idx_subject_registration_mrn; Type: INDEX; Schema: phi; Owner: -
--

CREATE INDEX idx_subject_registration_mrn ON phi.subject_registration USING btree (patient_mrn);


--
-- Name: subject_registration_subject_id_key; Type: INDEX; Schema: phi; Owner: -
--

CREATE UNIQUE INDEX subject_registration_subject_id_key ON phi.subject_registration USING btree (subject_id);


--
-- Name: subject_registration subject_registration_patient_mrn_fkey; Type: FK CONSTRAINT; Schema: phi; Owner: -
--

ALTER TABLE ONLY phi.subject_registration
    ADD CONSTRAINT subject_registration_patient_mrn_fkey FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn);


--
-- Name: subject_registration subject_registration_subject_id_fkey; Type: FK CONSTRAINT; Schema: phi; Owner: -
--

ALTER TABLE ONLY phi.subject_registration
    ADD CONSTRAINT subject_registration_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES laboratory.omics_subjects(subject_id);


--
-- PostgreSQL database dump complete
--


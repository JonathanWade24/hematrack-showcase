CREATE TABLE IF NOT EXISTS phi.patients (
  patient_mrn character varying NOT NULL,
  first_name character varying,
  last_name character varying,
  birth_date date,
  sex character varying,
  race character varying,
  ethnicity character varying,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  middle_name character varying
);
ALTER TABLE phi.patients ADD PRIMARY KEY (patient_mrn);

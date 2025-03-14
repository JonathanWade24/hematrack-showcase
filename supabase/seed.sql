-- Seed data for phi.patients
INSERT INTO phi.patients (patient_mrn, first_name, last_name, birth_date, sex, race, ethnicity)
VALUES
  ('TEST001', 'John', 'Doe', '1980-01-15', 'Male', 'White', 'Non-Hispanic'),
  ('TEST002', 'Jane', 'Smith', '1985-03-22', 'Female', 'Black', 'Non-Hispanic'),
  ('TEST003', 'Robert', 'Johnson', '1975-07-10', 'Male', 'Asian', 'Non-Hispanic'),
  ('TEST004', 'Emily', 'Williams', '1990-11-05', 'Female', 'White', 'Hispanic'),
  ('TEST005', 'Michael', 'Brown', '1982-09-18', 'Male', 'Black', 'Non-Hispanic'),
  ('TEST006', 'Sarah', 'Jones', '1988-04-30', 'Female', 'White', 'Non-Hispanic'),
  ('TEST007', 'David', 'Miller', '1979-12-12', 'Male', 'Asian', 'Non-Hispanic'),
  ('TEST008', 'Lisa', 'Davis', '1992-06-25', 'Female', 'Black', 'Hispanic'),
  ('TEST009', 'James', 'Wilson', '1984-02-08', 'Male', 'White', 'Non-Hispanic'),
  ('TEST010', 'Jennifer', 'Taylor', '1991-08-17', 'Female', 'Black', 'Non-Hispanic')
ON CONFLICT (patient_mrn) DO NOTHING;

-- Seed data for laboratory.omics_subjects
INSERT INTO laboratory.omics_subjects (subject_id, patient_mrn, project)
VALUES
  ('SUBJ001', 'TEST001', 'OMI'),
  ('SUBJ002', 'TEST002', 'OMI'),
  ('SUBJ003', 'TEST003', 'OMI'),
  ('SUBJ004', 'TEST004', 'OMI'),
  ('SUBJ005', 'TEST005', 'OMI'),
  ('SUBJ006', 'TEST006', 'OMI'),
  ('SUBJ007', 'TEST007', 'OMI'),
  ('SUBJ008', 'TEST008', 'OMI'),
  ('SUBJ009', 'TEST009', 'OMI'),
  ('SUBJ010', 'TEST010', 'OMI')
ON CONFLICT (subject_id) DO NOTHING;

-- Seed data for phi.subject_registration
INSERT INTO phi.subject_registration (subject_id, registration_date, consent_date, patient_mrn, first_name, last_name, date_of_birth)
VALUES
  ('SUBJ001', CURRENT_DATE, CURRENT_DATE, 'TEST001', 'John', 'Doe', '1980-01-15'),
  ('SUBJ002', CURRENT_DATE, CURRENT_DATE, 'TEST002', 'Jane', 'Smith', '1985-03-22'),
  ('SUBJ003', CURRENT_DATE, CURRENT_DATE, 'TEST003', 'Robert', 'Johnson', '1975-07-10'),
  ('SUBJ004', CURRENT_DATE, CURRENT_DATE, 'TEST004', 'Emily', 'Williams', '1990-11-05'),
  ('SUBJ005', CURRENT_DATE, CURRENT_DATE, 'TEST005', 'Michael', 'Brown', '1982-09-18')
ON CONFLICT (subject_id) DO NOTHING;

-- Seed data for laboratory.omics_results
INSERT INTO laboratory.omics_results (id, project, subject_id, sample_number, sample_id, date_of_collection, genotype, sex)
VALUES
  ('OR001', 'OMI', 'SUBJ001', 1, 'SAMPLE001', CURRENT_DATE - INTERVAL '30 days', 'HbSS', 'Male'),
  ('OR002', 'OMI', 'SUBJ001', 2, 'SAMPLE002', CURRENT_DATE - INTERVAL '15 days', 'HbSS', 'Male'),
  ('OR003', 'OMI', 'SUBJ002', 1, 'SAMPLE003', CURRENT_DATE - INTERVAL '30 days', 'HbSC', 'Female'),
  ('OR004', 'OMI', 'SUBJ002', 2, 'SAMPLE004', CURRENT_DATE - INTERVAL '15 days', 'HbSC', 'Female'),
  ('OR005', 'OMI', 'SUBJ003', 1, 'SAMPLE005', CURRENT_DATE - INTERVAL '30 days', 'HbSS', 'Male'),
  ('OR006', 'OMI', 'SUBJ003', 2, 'SAMPLE006', CURRENT_DATE - INTERVAL '15 days', 'HbSS', 'Male'),
  ('OR007', 'OMI', 'SUBJ004', 1, 'SAMPLE007', CURRENT_DATE - INTERVAL '30 days', 'HbSC', 'Female'),
  ('OR008', 'OMI', 'SUBJ004', 2, 'SAMPLE008', CURRENT_DATE - INTERVAL '15 days', 'HbSC', 'Female'),
  ('OR009', 'OMI', 'SUBJ005', 1, 'SAMPLE009', CURRENT_DATE - INTERVAL '30 days', 'HbSS', 'Male'),
  ('OR010', 'OMI', 'SUBJ005', 2, 'SAMPLE010', CURRENT_DATE - INTERVAL '15 days', 'HbSS', 'Male')
ON CONFLICT (id) DO NOTHING;

-- Seed data for clinical.Labs
INSERT INTO clinical."Labs" (patient_mrn, pat_enc_csn_id, order_time, proc_code, proc_name, component_id, lab_component_description, lab_result_value, result_time)
VALUES
  ('TEST001', 'ENC001', CURRENT_TIMESTAMP - INTERVAL '10 days', 'CBC', 'Complete Blood Count', 'HGB', 'Hemoglobin', '14.2 g/dL', CURRENT_TIMESTAMP - INTERVAL '9 days'),
  ('TEST001', 'ENC001', CURRENT_TIMESTAMP - INTERVAL '10 days', 'CBC', 'Complete Blood Count', 'WBC', 'White Blood Cell Count', '7.5 K/uL', CURRENT_TIMESTAMP - INTERVAL '9 days'),
  ('TEST002', 'ENC002', CURRENT_TIMESTAMP - INTERVAL '15 days', 'CBC', 'Complete Blood Count', 'HGB', 'Hemoglobin', '13.8 g/dL', CURRENT_TIMESTAMP - INTERVAL '14 days'),
  ('TEST002', 'ENC002', CURRENT_TIMESTAMP - INTERVAL '15 days', 'CBC', 'Complete Blood Count', 'WBC', 'White Blood Cell Count', '6.8 K/uL', CURRENT_TIMESTAMP - INTERVAL '14 days'),
  ('TEST003', 'ENC003', CURRENT_TIMESTAMP - INTERVAL '20 days', 'CBC', 'Complete Blood Count', 'HGB', 'Hemoglobin', '15.1 g/dL', CURRENT_TIMESTAMP - INTERVAL '19 days'),
  ('TEST003', 'ENC003', CURRENT_TIMESTAMP - INTERVAL '20 days', 'CBC', 'Complete Blood Count', 'WBC', 'White Blood Cell Count', '8.2 K/uL', CURRENT_TIMESTAMP - INTERVAL '19 days'),
  ('TEST004', 'ENC004', CURRENT_TIMESTAMP - INTERVAL '25 days', 'CBC', 'Complete Blood Count', 'HGB', 'Hemoglobin', '12.9 g/dL', CURRENT_TIMESTAMP - INTERVAL '24 days'),
  ('TEST004', 'ENC004', CURRENT_TIMESTAMP - INTERVAL '25 days', 'CBC', 'Complete Blood Count', 'WBC', 'White Blood Cell Count', '5.9 K/uL', CURRENT_TIMESTAMP - INTERVAL '24 days'),
  ('TEST005', 'ENC005', CURRENT_TIMESTAMP - INTERVAL '30 days', 'CBC', 'Complete Blood Count', 'HGB', 'Hemoglobin', '14.7 g/dL', CURRENT_TIMESTAMP - INTERVAL '29 days'),
  ('TEST005', 'ENC005', CURRENT_TIMESTAMP - INTERVAL '30 days', 'CBC', 'Complete Blood Count', 'WBC', 'White Blood Cell Count', '7.1 K/uL', CURRENT_TIMESTAMP - INTERVAL '29 days')
ON CONFLICT DO NOTHING;

-- Seed data for clinical.demographics
INSERT INTO clinical.demographics (patient_mrn, birth_date, age, gender, race, ethnicity, is_tobacco_user_yn, alcohol_user_yn, ill_drug_user_yn, source)
VALUES
  ('TEST001', '1980-01-15', 44, 'Male', 'White', 'Non-Hispanic', 'N', 'N', 'N', 'EHR'),
  ('TEST002', '1985-03-22', 39, 'Female', 'Black', 'Non-Hispanic', 'N', 'Y', 'N', 'EHR'),
  ('TEST003', '1975-07-10', 49, 'Male', 'Asian', 'Non-Hispanic', 'Y', 'Y', 'N', 'EHR'),
  ('TEST004', '1990-11-05', 34, 'Female', 'White', 'Hispanic', 'N', 'N', 'N', 'EHR'),
  ('TEST005', '1982-09-18', 42, 'Male', 'Black', 'Non-Hispanic', 'Y', 'N', 'N', 'EHR'),
  ('TEST006', '1988-04-30', 36, 'Female', 'White', 'Non-Hispanic', 'N', 'Y', 'N', 'EHR'),
  ('TEST007', '1979-12-12', 45, 'Male', 'Asian', 'Non-Hispanic', 'N', 'N', 'N', 'EHR'),
  ('TEST008', '1992-06-25', 32, 'Female', 'Black', 'Hispanic', 'Y', 'Y', 'N', 'EHR'),
  ('TEST009', '1984-02-08', 40, 'Male', 'White', 'Non-Hispanic', 'N', 'N', 'N', 'EHR'),
  ('TEST010', '1991-08-17', 33, 'Female', 'Black', 'Non-Hispanic', 'N', 'Y', 'N', 'EHR')
ON CONFLICT DO NOTHING;

-- Seed data for clinical.bone_marrow
INSERT INTO clinical.bone_marrow (patient_mrn, hsp_account_id, order_id, result_time, lab_code, lab_name, component_id, lab_component_description, bone_marrow_results_by_component)
VALUES
  ('TEST001', 'HSP001', 'BM001', CURRENT_TIMESTAMP - INTERVAL '10 days', 'BM', 'Bone Marrow Biopsy', 'BM-CELL', 'Cellularity', 'Normal cellularity (50%)'),
  ('TEST002', 'HSP002', 'BM002', CURRENT_TIMESTAMP - INTERVAL '15 days', 'BM', 'Bone Marrow Biopsy', 'BM-CELL', 'Cellularity', 'Hypercellular (70%)'),
  ('TEST003', 'HSP003', 'BM003', CURRENT_TIMESTAMP - INTERVAL '20 days', 'BM', 'Bone Marrow Biopsy', 'BM-CELL', 'Cellularity', 'Normal cellularity (45%)'),
  ('TEST004', 'HSP004', 'BM004', CURRENT_TIMESTAMP - INTERVAL '25 days', 'BM', 'Bone Marrow Biopsy', 'BM-CELL', 'Cellularity', 'Hypocellular (20%)'),
  ('TEST005', 'HSP005', 'BM005', CURRENT_TIMESTAMP - INTERVAL '30 days', 'BM', 'Bone Marrow Biopsy', 'BM-CELL', 'Cellularity', 'Normal cellularity (55%)')
ON CONFLICT DO NOTHING;

-- Seed data for clinical.ip_admissions
INSERT INTO clinical.ip_admissions (patient_mrn, hsp_account_id, adm_date_time, disch_date_time, discharge_department, discharge_disposition, icu_admission_yn)
VALUES
  ('TEST001', 'HSP001', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Internal Medicine', 'Home', 'N'),
  ('TEST002', 'HSP002', CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Hematology', 'Home', 'N'),
  ('TEST003', 'HSP003', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '35 days', 'Emergency Medicine', 'Home', 'Y'),
  ('TEST004', 'HSP004', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '40 days', 'Internal Medicine', 'Home', 'N'),
  ('TEST005', 'HSP005', CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_TIMESTAMP - INTERVAL '45 days', 'Hematology', 'Home', 'N')
ON CONFLICT DO NOTHING;

-- Seed data for clinical.ip_medications
INSERT INTO clinical.ip_medications (patient_mrn, hsp_account_id, adm_date_time, disch_date_time, medication, dosage, unit, frequency, taken_time, rx_class_name)
VALUES
  ('TEST001', 'HSP001', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Hydroxyurea', '500', 'mg', 'Daily', CURRENT_TIMESTAMP - INTERVAL '28 days', 'Antineoplastic'),
  ('TEST001', 'HSP001', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Folic Acid', '1', 'mg', 'Daily', CURRENT_TIMESTAMP - INTERVAL '28 days', 'Vitamin'),
  ('TEST002', 'HSP002', CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Hydroxyurea', '1000', 'mg', 'Daily', CURRENT_TIMESTAMP - INTERVAL '33 days', 'Antineoplastic'),
  ('TEST002', 'HSP002', CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Folic Acid', '1', 'mg', 'Daily', CURRENT_TIMESTAMP - INTERVAL '33 days', 'Vitamin'),
  ('TEST003', 'HSP003', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '35 days', 'Morphine', '2', 'mg', 'PRN', CURRENT_TIMESTAMP - INTERVAL '38 days', 'Analgesic'),
  ('TEST003', 'HSP003', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '35 days', 'Hydroxyurea', '500', 'mg', 'Daily', CURRENT_TIMESTAMP - INTERVAL '38 days', 'Antineoplastic')
ON CONFLICT DO NOTHING;

-- Seed data for clinical.op_medications
INSERT INTO clinical.op_medications (patient_mrn, hsp_account_id, visit_date, order_med_id, order_dttm, rx_status, generic_description)
VALUES
  ('TEST001', 'HSP001', CURRENT_TIMESTAMP - INTERVAL '15 days', 'MED001', CURRENT_TIMESTAMP - INTERVAL '15 days', 'Active', 'Hydroxyurea 500mg'),
  ('TEST001', 'HSP001', CURRENT_TIMESTAMP - INTERVAL '15 days', 'MED002', CURRENT_TIMESTAMP - INTERVAL '15 days', 'Active', 'Folic Acid 1mg'),
  ('TEST002', 'HSP002', CURRENT_TIMESTAMP - INTERVAL '20 days', 'MED003', CURRENT_TIMESTAMP - INTERVAL '20 days', 'Active', 'Hydroxyurea 1000mg'),
  ('TEST002', 'HSP002', CURRENT_TIMESTAMP - INTERVAL '20 days', 'MED004', CURRENT_TIMESTAMP - INTERVAL '20 days', 'Active', 'Folic Acid 1mg'),
  ('TEST003', 'HSP003', CURRENT_TIMESTAMP - INTERVAL '25 days', 'MED005', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Active', 'Hydroxyurea 500mg'),
  ('TEST003', 'HSP003', CURRENT_TIMESTAMP - INTERVAL '25 days', 'MED006', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Active', 'Folic Acid 1mg')
ON CONFLICT DO NOTHING;

-- Seed data for clinical.op_visits
INSERT INTO clinical.op_visits (patient_mrn, pat_id, hsp_account_id, visit_date, visit_type, department_name, bp_systolic, bp_diastolic, weight_lbs, weight_kg)
VALUES
  ('TEST001', 'PAT001', 'HSP001', CURRENT_TIMESTAMP - INTERVAL '15 days', 'Office Visit', 'Hematology', 120, 80, 170, 77.1),
  ('TEST002', 'PAT002', 'HSP002', CURRENT_TIMESTAMP - INTERVAL '20 days', 'Office Visit', 'Hematology', 110, 70, 140, 63.5),
  ('TEST003', 'PAT003', 'HSP003', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Office Visit', 'Hematology', 130, 85, 180, 81.6),
  ('TEST004', 'PAT004', 'HSP004', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Office Visit', 'Hematology', 115, 75, 130, 59.0),
  ('TEST005', 'PAT005', 'HSP005', CURRENT_TIMESTAMP - INTERVAL '35 days', 'Office Visit', 'Hematology', 125, 82, 160, 72.6)
ON CONFLICT DO NOTHING;

-- Seed data for clinical.unified_visits
INSERT INTO clinical.unified_visits (id, patient_mrn, visit_id, visit_type, source_id, start_date, end_date, department)
VALUES
  ('UV001', 'TEST001', 'HSP001', 'IP', 'IP001', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '25 days', 'Internal Medicine'),
  ('UV002', 'TEST002', 'HSP002', 'IP', 'IP002', CURRENT_TIMESTAMP - INTERVAL '35 days', CURRENT_TIMESTAMP - INTERVAL '30 days', 'Hematology'),
  ('UV003', 'TEST003', 'HSP003', 'IP', 'IP003', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '35 days', 'Emergency Medicine'),
  ('UV004', 'TEST004', 'HSP004', 'IP', 'IP004', CURRENT_TIMESTAMP - INTERVAL '45 days', CURRENT_TIMESTAMP - INTERVAL '40 days', 'Internal Medicine'),
  ('UV005', 'TEST005', 'HSP005', 'IP', 'IP005', CURRENT_TIMESTAMP - INTERVAL '50 days', CURRENT_TIMESTAMP - INTERVAL '45 days', 'Hematology'),
  ('UV006', 'TEST001', 'HSP006', 'OP', 'OP001', CURRENT_TIMESTAMP - INTERVAL '15 days', NULL, 'Hematology'),
  ('UV007', 'TEST002', 'HSP007', 'OP', 'OP002', CURRENT_TIMESTAMP - INTERVAL '20 days', NULL, 'Hematology'),
  ('UV008', 'TEST003', 'HSP008', 'OP', 'OP003', CURRENT_TIMESTAMP - INTERVAL '25 days', NULL, 'Hematology'),
  ('UV009', 'TEST004', 'HSP009', 'OP', 'OP004', CURRENT_TIMESTAMP - INTERVAL '30 days', NULL, 'Hematology'),
  ('UV010', 'TEST005', 'HSP010', 'OP', 'OP005', CURRENT_TIMESTAMP - INTERVAL '35 days', NULL, 'Hematology')
ON CONFLICT DO NOTHING;

-- Seed data for audit.audit_log
INSERT INTO audit.audit_log (table_name, action, old_data, new_data, changed_by)
VALUES
  ('phi.patients', 'INSERT', NULL, '{"patient_mrn": "TEST001", "first_name": "John", "last_name": "Doe"}', 'system'),
  ('phi.patients', 'INSERT', NULL, '{"patient_mrn": "TEST002", "first_name": "Jane", "last_name": "Smith"}', 'system'),
  ('laboratory.omics_subjects', 'INSERT', NULL, '{"subject_id": "SUBJ001", "patient_mrn": "TEST001"}', 'system'),
  ('laboratory.omics_subjects', 'INSERT', NULL, '{"subject_id": "SUBJ002", "patient_mrn": "TEST002"}', 'system'),
  ('clinical.unified_visits', 'INSERT', NULL, '{"id": "UV001", "patient_mrn": "TEST001", "visit_type": "IP"}', 'system')
ON CONFLICT DO NOTHING; 
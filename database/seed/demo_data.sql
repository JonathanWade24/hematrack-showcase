-- Synthetic demo data for HemaTrack portfolio (no real PHI)
-- Run after schema is created via: cd app && npx drizzle-kit push

-- Demo patients (fictional)
INSERT INTO clinical.patients (patient_mrn, first_name, last_name, birth_date, sex, race, ethnicity)
VALUES
  ('DEMO-001', 'Alex', 'Rivera', '1995-03-15', 'Female', 'Black or African American', 'Not Hispanic'),
  ('DEMO-002', 'Jordan', 'Chen', '1988-07-22', 'Male', 'Black or African American', 'Not Hispanic'),
  ('DEMO-003', 'Taylor', 'Brooks', '2001-11-08', 'Female', 'Black or African American', 'Hispanic'),
  ('DEMO-004', 'Morgan', 'Patel', '1979-01-30', 'Male', 'Black or African American', 'Not Hispanic'),
  ('DEMO-005', 'Casey', 'Williams', '1992-09-12', 'Female', 'Black or African American', 'Not Hispanic')
ON CONFLICT (patient_mrn) DO NOTHING;

-- Omics subjects
INSERT INTO laboratory.omics_subjects (subject_id, patient_mrn, project)
VALUES
  ('SUBJ-001', 'DEMO-001', 'OMI'),
  ('SUBJ-002', 'DEMO-002', 'OMI'),
  ('SUBJ-003', 'DEMO-003', 'OMI'),
  ('SUBJ-004', 'DEMO-004', 'OMI'),
  ('SUBJ-005', 'DEMO-005', 'OMI')
ON CONFLICT (subject_id) DO NOTHING;

-- Samples
INSERT INTO laboratory.samples (sample_id, subject_id, sample_number, date_of_collection, genotype, steady_state)
VALUES
  ('SUBJ-001-001', 'SUBJ-001', 1, '2024-06-01', 'HbSS', 'Yes'),
  ('SUBJ-001-002', 'SUBJ-001', 2, '2024-09-15', 'HbSS', 'Yes'),
  ('SUBJ-002-001', 'SUBJ-002', 1, '2024-05-20', 'HbSC', 'Yes'),
  ('SUBJ-003-001', 'SUBJ-003', 1, '2024-08-10', 'HbSS', 'No'),
  ('SUBJ-004-001', 'SUBJ-004', 1, '2024-07-04', 'HbSS', 'Yes'),
  ('SUBJ-005-001', 'SUBJ-005', 1, '2024-10-01', 'HbS/beta0', 'Yes')
ON CONFLICT (sample_id) DO NOTHING;

-- Advia results (subset of fields)
INSERT INTO laboratory.results_advia (sample_id, date_advia, rbc_advia, hb_advia, hct_advia, plt_advia, wbc_advia, qc_pass_advia)
VALUES
  ('SUBJ-001-001', '2024-06-02', 3.2, 9.1, 27.5, 180, 8.2, 'Pass'),
  ('SUBJ-001-002', '2024-09-16', 3.5, 9.8, 29.1, 195, 7.9, 'Pass'),
  ('SUBJ-002-001', '2024-05-21', 4.1, 11.2, 33.0, 210, 6.5, 'Pass'),
  ('SUBJ-003-001', '2024-08-11', 2.8, 7.5, 22.8, 150, 12.1, 'Pass'),
  ('SUBJ-004-001', '2024-07-05', 3.0, 8.2, 25.0, 165, 9.0, 'Pass')
ON CONFLICT (sample_id) DO NOTHING;

-- LORRCA results
INSERT INTO laboratory.results_lorrca (sample_id, date_lorrca, ei_min_lorrca, ei_max_lorrca, ei_delta_lorrca, qc_pass_lorrca)
VALUES
  ('SUBJ-001-001', '2024-06-02', 0.45, 0.82, 0.37, 'Pass'),
  ('SUBJ-002-001', '2024-05-21', 0.52, 0.88, 0.36, 'Pass'),
  ('SUBJ-003-001', '2024-08-11', 0.38, 0.71, 0.33, 'Pass')
ON CONFLICT (sample_id) DO NOTHING;

-- Demo admin user (password: demo-admin-change-me — bcrypt hash below)
-- Generate your own: node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
INSERT INTO app."User" (id, name, email, password, role, is_active, settings)
VALUES (
  'demo-admin-001',
  'Demo Admin',
  'admin@demo.local',
  '$2b$10$O1Vq2mZJezY55lSmCJxVsupArPMeMJsr6MAsIpgwhwFWs/dXC9SBK',
  'admin',
  true,
  '{"show_phi": true}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

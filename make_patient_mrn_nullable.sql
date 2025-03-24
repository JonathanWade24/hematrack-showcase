-- Make patient_mrn column nullable in omics_subjects table
ALTER TABLE laboratory.omics_subjects 
ALTER COLUMN patient_mrn DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN laboratory.omics_subjects.patient_mrn IS 'Patient MRN (can be null for temporary subjects)'; 
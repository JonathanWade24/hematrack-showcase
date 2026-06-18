-- PHI Schema Tables
\connect scd_research_secure

BEGIN;

-- Patients table with PHI
CREATE TABLE phi.patients (
    patient_mrn VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date DATE,
    sex VARCHAR(20),
    race VARCHAR(100),
    ethnicity VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION phi.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_timestamp
    BEFORE UPDATE ON phi.patients
    FOR EACH ROW
    EXECUTE FUNCTION phi.update_timestamp();

-- Add audit trigger
CREATE TRIGGER audit_patients_changes
    AFTER INSERT OR UPDATE OR DELETE ON phi.patients
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

-- Create view for de-identified patient data
CREATE VIEW clinical.patient_demographics AS
SELECT 
    patient_mrn,
    sex,
    race,
    ethnicity,
    DATE_PART('year', AGE(CURRENT_DATE, birth_date)) as age,
    created_at,
    updated_at
FROM phi.patients;

COMMIT; 
CREATE TABLE inpatient_admissions (
    admission_id SERIAL PRIMARY KEY,
    mrn VARCHAR(50) REFERENCES patients(mrn),
    admission_date DATE,
    discharge_date DATE,
    diagnosis_codes TEXT,
    procedures TEXT,
    admission_type VARCHAR(50)
); 
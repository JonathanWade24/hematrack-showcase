CREATE TABLE outpatient_visits (
    visit_id SERIAL PRIMARY KEY,
    mrn VARCHAR(50) REFERENCES patients(mrn),
    visit_date DATE,
    visit_type VARCHAR(100),
    department_id VARCHAR(50),
    department_name VARCHAR(200),
    provider VARCHAR(100),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    weight_kg NUMERIC,
    icd_code VARCHAR(20),
    dx_description TEXT
); 
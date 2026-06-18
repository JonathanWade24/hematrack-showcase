CREATE TABLE medications (
    med_id SERIAL PRIMARY KEY,
    mrn VARCHAR(50) REFERENCES patients(mrn),
    admission_id INTEGER, -- can be linked to inpatient admitted encounters
    medication_name VARCHAR(200),
    generic_name VARCHAR(200),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    dose VARCHAR(50),
    unit VARCHAR(20),
    frequency VARCHAR(50),
    route VARCHAR(50),
    medication_status VARCHAR(50)
); 
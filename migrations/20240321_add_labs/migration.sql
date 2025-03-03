-- Create labs table
CREATE TABLE clinical.labs (
    id SERIAL PRIMARY KEY,
    patient_mrn VARCHAR(50) NOT NULL,
    pat_enc_csn_id VARCHAR(50),
    order_time TIMESTAMP,
    proc_code VARCHAR(50),
    proc_name VARCHAR(200),
    component_id VARCHAR(50),
    lab_component_description VARCHAR(200),
    lab_result_value TEXT,
    result_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_mrn) REFERENCES phi.patients(patient_mrn)
);

-- Create indexes
CREATE INDEX labs_result_time_idx ON clinical.labs(result_time);
CREATE INDEX labs_pat_enc_csn_id_idx ON clinical.labs(pat_enc_csn_id);
CREATE INDEX labs_patient_mrn_idx ON clinical.labs(patient_mrn);
CREATE INDEX labs_component_id_idx ON clinical.labs(component_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_labs_updated_at
    BEFORE UPDATE ON clinical.labs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
CREATE TABLE epic_labs (
    lab_id SERIAL PRIMARY KEY,
    mrn VARCHAR(50) REFERENCES patients(mrn),
    pat_enc_csn_id VARCHAR(50),
    order_time TIMESTAMP,
    result_time TIMESTAMP,
    proc_code VARCHAR(20),
    proc_name VARCHAR(100),
    component_id VARCHAR(50),
    lab_component_name VARCHAR(200),
    lab_result_value TEXT,
    unit VARCHAR(20),
    qc_flag VARCHAR(20)
); 
CREATE TABLE bone_marrow (
    result_id SERIAL PRIMARY KEY,
    mrn VARCHAR(50) REFERENCES patients(mrn),
    hsp_account_id VARCHAR(50),
    order_id VARCHAR(50),
    result_time TIMESTAMP,
    lab_code VARCHAR(20),
    lab_name VARCHAR(100),
    component_id VARCHAR(50),
    lab_component_description TEXT,
    result_text TEXT,
    qc_flag VARCHAR(20)
); 
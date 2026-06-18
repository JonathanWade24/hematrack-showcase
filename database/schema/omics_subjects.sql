CREATE TABLE omics_subjects (
    subject_id VARCHAR(20) PRIMARY KEY,
    mrn VARCHAR(50) REFERENCES patients(mrn),
    project VARCHAR(20) NOT NULL
); 
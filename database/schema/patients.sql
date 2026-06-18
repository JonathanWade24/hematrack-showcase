CREATE TABLE patients (
    mrn VARCHAR(50) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(20),
    race VARCHAR(50),
    ethnicity VARCHAR(50),
    address TEXT,
    phone_number VARCHAR(20),
    email VARCHAR(100),
    employment_status VARCHAR(50),
    insurance_type VARCHAR(50)
); 
-- Laboratory Schema Tables
\connect scd_research_secure

BEGIN;

-- Omics results table
CREATE TABLE laboratory.omics_results (
    -- Primary key and core fields
    sample_id VARCHAR(50) PRIMARY KEY CHECK (sample_id ~ '^\d+-\d+$'),
    subject_id VARCHAR(20) NOT NULL REFERENCES clinical.omics_subjects(subject_id),
    sample_number INTEGER NOT NULL,
    date_of_collection DATE NOT NULL,
    age_at_collection NUMERIC,
    genotype VARCHAR(50),
    sex VARCHAR(20),
    therapies TEXT,
    days_to_processing INTEGER,
    
    -- Ensure unique sample number per subject
    UNIQUE (subject_id, sample_number),
    
    -- ADVIA Data
    date_advia DATE,
    rbc_advia NUMERIC CHECK (rbc_advia > 0 AND rbc_advia < 10),
    hb_advia NUMERIC CHECK (hb_advia > 0 AND hb_advia < 25),
    hct_advia NUMERIC CHECK (hct_advia > 0 AND hct_advia < 100),
    mcv_advia NUMERIC CHECK (mcv_advia > 50 AND mcv_advia < 150),
    mch_advia NUMERIC CHECK (mch_advia > 15 AND mch_advia < 50),
    mchc_advia NUMERIC CHECK (mchc_advia > 20 AND mchc_advia < 50),
    rdw_advia NUMERIC CHECK (rdw_advia > 0 AND rdw_advia < 30),
    plt_advia NUMERIC CHECK (plt_advia > 0 AND plt_advia < 1000),
    wbc_advia NUMERIC CHECK (wbc_advia > 0 AND wbc_advia < 100),
    retic_advia NUMERIC CHECK (retic_advia > 0 AND retic_advia < 30),
    qc_pass_advia BOOLEAN,
    qc_notes_advia TEXT,
    
    -- DNA Data
    date_dna DATE,
    concentration_1_dna NUMERIC CHECK (concentration_1_dna >= 0 AND concentration_1_dna < 1000),
    purity_1_dna NUMERIC CHECK (purity_1_dna > 0 AND purity_1_dna < 10),
    concentration_2_dna NUMERIC CHECK (concentration_2_dna >= 0 AND concentration_2_dna < 1000),
    purity_2_dna NUMERIC CHECK (purity_2_dna > 0 AND purity_2_dna < 10),
    qc_pass_dna BOOLEAN,
    qc_notes_dna TEXT,
    
    -- F-cells Data
    date_f_cells DATE,
    stain_f_cells VARCHAR(100),
    cytometer_f_cells VARCHAR(100),
    percent_f_cells NUMERIC CHECK (percent_f_cells >= 0 AND percent_f_cells <= 100),
    qc_pass_f_cells BOOLEAN,
    qc_notes_f_cells TEXT,
    
    -- PBMC Data
    date_pbmc DATE,
    cell_number_1_pbmc NUMERIC CHECK (cell_number_1_pbmc >= 0 AND cell_number_1_pbmc < 1e9),
    cell_number_2_pbmc NUMERIC CHECK (cell_number_2_pbmc >= 0 AND cell_number_2_pbmc < 1e9),
    sent_to_gt_pbmc BOOLEAN,
    qc_notes_pbmc TEXT,
    
    -- Adhesion Data
    date_adhesion DATE,
    cells_adhered_adhesion NUMERIC CHECK (cells_adhered_adhesion >= 0 AND cells_adhered_adhesion < 1e6),
    qc_pass_adhesion BOOLEAN,
    qc_notes_adhesion TEXT,
    
    -- LORRCA Data
    date_lorrca DATE,
    ei_min_lorrca NUMERIC CHECK (ei_min_lorrca >= 0 AND ei_min_lorrca < 1),
    ei_max_lorrca NUMERIC CHECK (ei_max_lorrca >= 0 AND ei_max_lorrca < 1),
    ei_delta_lorrca NUMERIC CHECK (ei_delta_lorrca >= 0 AND ei_delta_lorrca < 1),
    instrument_lorrca VARCHAR(100),
    qc_pass_lorrca BOOLEAN,
    qc_notes_lorrca TEXT,
    
    -- Viscosity Data
    date_visc DATE,
    visc_45 NUMERIC CHECK (visc_45 >= 0 AND visc_45 < 100),
    visc_225 NUMERIC CHECK (visc_225 >= 0 AND visc_225 < 100),
    qc_pass_viscosity BOOLEAN,
    qc_notes_viscosity TEXT,
    
    -- Plasma Data
    date_plasma DATE,
    vol_plasma_1 NUMERIC CHECK (vol_plasma_1 >= 0 AND vol_plasma_1 < 100),
    vol_plasma_2 NUMERIC CHECK (vol_plasma_2 >= 0 AND vol_plasma_2 < 100),
    vol_plasma_3 NUMERIC CHECK (vol_plasma_3 >= 0 AND vol_plasma_3 < 100),
    qc_notes_plasma TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Constraints
    CONSTRAINT valid_age CHECK (age_at_collection >= 0),
    CONSTRAINT valid_days_processing CHECK (days_to_processing >= 0),
    CONSTRAINT valid_collection_date CHECK (date_of_collection <= CURRENT_DATE),
    CONSTRAINT valid_sex CHECK (sex IN ('Male', 'Female', 'Other', 'Unknown')),
    
    -- Ensure dates are in order
    CONSTRAINT valid_advia_date CHECK (date_advia >= date_of_collection),
    CONSTRAINT valid_dna_date CHECK (date_dna >= date_of_collection),
    CONSTRAINT valid_f_cells_date CHECK (date_f_cells >= date_of_collection),
    CONSTRAINT valid_pbmc_date CHECK (date_pbmc >= date_of_collection),
    CONSTRAINT valid_adhesion_date CHECK (date_adhesion >= date_of_collection),
    CONSTRAINT valid_lorrca_date CHECK (date_lorrca >= date_of_collection),
    CONSTRAINT valid_visc_date CHECK (date_visc >= date_of_collection),
    CONSTRAINT valid_plasma_date CHECK (date_plasma >= date_of_collection)
);

-- Create updated_at trigger
CREATE TRIGGER update_omics_results_timestamp
    BEFORE UPDATE ON laboratory.omics_results
    FOR EACH ROW
    EXECUTE FUNCTION phi.update_timestamp();

-- Add audit trigger
CREATE TRIGGER audit_omics_results_changes
    AFTER INSERT OR UPDATE OR DELETE ON laboratory.omics_results
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger();

-- Create indexes
CREATE INDEX idx_omics_results_subject_id ON laboratory.omics_results(subject_id);
CREATE INDEX idx_omics_results_collection_date ON laboratory.omics_results(date_of_collection);
CREATE INDEX idx_omics_results_sample_number ON laboratory.omics_results(subject_id, sample_number);

-- Create views for each assay type
CREATE VIEW laboratory.advia_results AS
SELECT sample_id, subject_id, date_of_collection, date_advia,
       rbc_advia, hb_advia, hct_advia, mcv_advia, mch_advia, mchc_advia,
       rdw_advia, plt_advia, wbc_advia, retic_advia,
       qc_pass_advia, qc_notes_advia
FROM laboratory.omics_results
WHERE date_advia IS NOT NULL;

CREATE VIEW laboratory.dna_results AS
SELECT sample_id, subject_id, date_of_collection, date_dna,
       concentration_1_dna, purity_1_dna, concentration_2_dna, purity_2_dna,
       qc_pass_dna, qc_notes_dna
FROM laboratory.omics_results
WHERE date_dna IS NOT NULL;

CREATE VIEW laboratory.f_cells_results AS
SELECT sample_id, subject_id, date_of_collection, date_f_cells,
       stain_f_cells, cytometer_f_cells, percent_f_cells,
       qc_pass_f_cells, qc_notes_f_cells
FROM laboratory.omics_results
WHERE date_f_cells IS NOT NULL;

-- Add similar views for other assay types...

COMMIT; 
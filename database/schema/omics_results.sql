CREATE TABLE omics_results (
    sample_id VARCHAR(50) PRIMARY KEY,
    project VARCHAR(20) NOT NULL,
    subject_id VARCHAR(20) REFERENCES omics_subjects(subject_id),
    sample_number INTEGER,
    date_of_collection DATE,
    age_at_collection NUMERIC,
    genotype VARCHAR(50),
    sex VARCHAR(20),
    therapies TEXT,
    days_to_processing INTEGER,
    
    -- ADVIA measurements
    date_advia DATE,
    rbc_advia NUMERIC,
    hb_advia NUMERIC,
    hct_advia NUMERIC,
    mcv_advia NUMERIC,
    mch_advia NUMERIC,
    mchc_advia NUMERIC,
    rdw_advia NUMERIC,
    hdw_advia NUMERIC,
    plt_advia NUMERIC,
    mpv_advia NUMERIC,
    wbc_advia NUMERIC,
    neut_advia NUMERIC,
    retic_advia NUMERIC,
    chr_advia NUMERIC,
    hc41_v120_advia NUMERIC,
    hc41_v60_120_advia NUMERIC,
    hc41_v60_advia NUMERIC,
    drbc_advia NUMERIC,
    hyper_advia NUMERIC,
    nrbc_advia NUMERIC,
    qc_pass_advia VARCHAR(20),
    qc_notes_advia TEXT,
    
    -- LORRCA measurements
    ei_min_lorrca NUMERIC,
    ei_max_lorrca NUMERIC,
    ei_delta_lorrca NUMERIC,
    pos_lorrca NUMERIC,
    date_lorrca DATE,
    instrument_lorrca VARCHAR(50),
    qc_pass_lorrca VARCHAR(20),
    qc_notes_lorrca TEXT,
    
    -- Viscosity measurements
    date_visc DATE,
    visc_45 NUMERIC,
    visc_225 NUMERIC,
    qc_pass_viscosity VARCHAR(20),
    qc_notes_viscosity TEXT,
    
    -- High-Value DNA extraction metrics
    date_dna DATE,
    concentration_1_dna NUMERIC,
    purity_1_dna NUMERIC,
    concentration_2_dna NUMERIC,
    purity_2_dna NUMERIC,
    qc_pass_dna VARCHAR(20),
    qc_notes_dna TEXT,
    
    -- Plasma measurements
    date_plasma DATE,
    vol_plasma_1 NUMERIC,
    vol_plasma_2 NUMERIC,
    vol_plasma_3 NUMERIC,
    qc_notes_plasma TEXT,
    
    -- PMBC measurements
    date_pmbc DATE,
    cell_number_1_pbmc NUMERIC,
    cell_number_2_pbmc NUMERIC,
    sent_to_gt_pbmc VARCHAR(20),
    qc_notes_pbmc TEXT,
    
    -- F-cells assay
    date_f_cells DATE,
    percent_f_cells NUMERIC,
    stain_f_cells VARCHAR(50),
    cytometer_f_cells VARCHAR(50),
    qc_pass_f_cells VARCHAR(20),
    qc_notes_f_cells TEXT,
    
    -- Adhesion assay
    date_adhesion DATE,
    cells_adhered_adhesion NUMERIC,
    qc_pass_adhesion VARCHAR(20),
    qc_notes_adhesion TEXT,
    
    -- HPLC assays
    date_hplc DATE,
    HbF_percent_grady_hplc NUMERIC,
    HbA_percent_grady_hplc NUMERIC,
    HbC_percent_grady_hplc NUMERIC,
    HbA2_percent_grady_hplc NUMERIC,
    HbS_percent_grady_hplc NUMERIC,
    HbF_percent_D10_hplc NUMERIC,
    HbA_percent_D10_hplc NUMERIC,
    HbC_percent_D10_hplc NUMERIC,
    HbA2_percent_D10_hplc NUMERIC,
    HbS_percent_D10_hplc NUMERIC,
    HbF_percent_D10_Fcell_ratio NUMERIC,
    HbF_percent_grady_Fcell_ratio NUMERIC,
    
    -- Clinical status fields
    steady_state VARCHAR(20),
    transfusion_status VARCHAR(20),
    transfusion_confirmed VARCHAR(20)
); 
#!/usr/bin/env Rscript

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(readxl)
  library(janitor)
  library(DBI)
  library(RPostgres)
  library(lubridate)
})

# Function to clean column names consistently
clean_names_custom <- function(df) {
  df %>%
    clean_names() %>%
    rename_with(~ str_replace_all(., "patient_patient_mrn", "patient_mrn"))
}

# Function to safely read a file with error handling
safe_read_file <- function(file_path, read_func, ...) {
  if (!file.exists(file_path)) {
    stop(sprintf("File not found: %s", file_path))
  }
  tryCatch({
    read_func(file_path, ...)
  }, error = function(e) {
    stop(sprintf("Error reading %s: %s", file_path, e$message))
  })
}

# Set the data directory (override with DATA_DIR env var)
data_dir <- Sys.getenv("DATA_DIR", unset = "./data/epic")

# Connect to database
message("Connecting to database...")
db <- tryCatch({
  dbConnect(
    Postgres(),
    dbname = Sys.getenv("PGDATABASE", unset = "hema_track_demo"),
    host = Sys.getenv("PGHOST", unset = "localhost"),
    port = as.integer(Sys.getenv("PGPORT", unset = "5432")),
    user = Sys.getenv("PGUSER", unset = "demo"),
    password = Sys.getenv("PGPASSWORD", unset = "demo")
  )
}, error = function(e) {
  stop(sprintf("Database connection error: %s", e$message))
})

# Import data in transaction
dbBegin(db)
tryCatch({
  # 1. Import Inpatient Admissions
  message("\nImporting Inpatient Admissions data...")
  ip_admissions_baseline_path <- file.path(data_dir, "IN495734_SCD_IP_Admissions_Baseline.txt")
  ip_admissions_lam_path <- file.path(data_dir, "IP_Admissions_Lam_20241004.txt")
  
  message(sprintf("Reading file: %s", ip_admissions_baseline_path))
  ip_admissions_baseline <- safe_read_file(
    ip_admissions_baseline_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  message(sprintf("Reading file: %s", ip_admissions_lam_path))
  ip_admissions_lam <- safe_read_file(
    ip_admissions_lam_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  # Combine and prepare admissions data
  ip_admissions <- bind_rows(
    ip_admissions_baseline,
    ip_admissions_lam
  ) %>%
    transmute(
      admission_id = as.character(admission_id),
      patient_mrn = as.character(patient_mrn),
      admission_date = as_datetime(admission_date),
      discharge_date = as_datetime(discharge_date),
      length_of_stay = as.numeric(length_of_stay),
      admission_type = admission_type,
      admission_source = admission_source,
      discharge_disposition = discharge_disposition,
      diagnosis_primary = primary_diagnosis,
      diagnosis_secondary = array_from_vec(secondary_diagnoses),
      drg_code = drg_code,
      drg_description = drg_description
    ) %>%
    distinct()  # Remove any duplicates
  
  message(sprintf("Upserting %d records into clinical.ip_admissions", nrow(ip_admissions)))
  
  # Create temporary table for the upsert operation
  dbExecute(db, "CREATE TEMP TABLE ip_admissions_temp (LIKE clinical.ip_admissions)")
  
  # Load data into temp table
  dbWriteTable(
    db,
    "ip_admissions_temp",
    ip_admissions,
    append = TRUE,
    temporary = TRUE
  )
  
  # Perform upsert operation
  dbExecute(db, "
    INSERT INTO clinical.ip_admissions
    SELECT * FROM ip_admissions_temp
    ON CONFLICT (admission_id)
    DO UPDATE SET
      patient_mrn = EXCLUDED.patient_mrn,
      admission_date = EXCLUDED.admission_date,
      discharge_date = EXCLUDED.discharge_date,
      length_of_stay = EXCLUDED.length_of_stay,
      admission_type = EXCLUDED.admission_type,
      admission_source = EXCLUDED.admission_source,
      discharge_disposition = EXCLUDED.discharge_disposition,
      diagnosis_primary = EXCLUDED.diagnosis_primary,
      diagnosis_secondary = EXCLUDED.diagnosis_secondary,
      drg_code = EXCLUDED.drg_code,
      drg_description = EXCLUDED.drg_description,
      updated_at = CURRENT_TIMESTAMP
  ")
  
  # Clean up temp table
  dbExecute(db, "DROP TABLE ip_admissions_temp")
  
  # 2. Import Inpatient Medications
  message("\nImporting Inpatient Medications data...")
  ip_meds_baseline_path <- file.path(data_dir, "IN495734_SCD_IP_Meds_Baseline.txt")
  ip_meds_lam_path <- file.path(data_dir, "IP_Meds_Lam_20241004.txt")
  
  message(sprintf("Reading file: %s", ip_meds_baseline_path))
  ip_meds_baseline <- safe_read_file(
    ip_meds_baseline_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  message(sprintf("Reading file: %s", ip_meds_lam_path))
  ip_meds_lam <- safe_read_file(
    ip_meds_lam_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  # Combine and prepare medications data
  ip_medications <- bind_rows(
    ip_meds_baseline,
    ip_meds_lam
  ) %>%
    transmute(
      medication_id = as.character(medication_id),
      patient_mrn = as.character(patient_mrn),
      admission_id = as.character(admission_id),
      order_date = as_datetime(order_date),
      start_date = as_datetime(start_date),
      end_date = as_datetime(end_date),
      medication_name = medication_name,
      generic_name = generic_name,
      therapeutic_class = therapeutic_class,
      order_type = order_type,
      order_status = order_status,
      dose = dose,
      dose_unit = dose_unit,
      frequency = frequency,
      route = route
    ) %>%
    distinct()  # Remove any duplicates
  
  message(sprintf("Upserting %d records into clinical.ip_medications", nrow(ip_medications)))
  
  # Create temporary table for the upsert operation
  dbExecute(db, "CREATE TEMP TABLE ip_medications_temp (LIKE clinical.ip_medications)")
  
  # Load data into temp table
  dbWriteTable(
    db,
    "ip_medications_temp",
    ip_medications,
    append = TRUE,
    temporary = TRUE
  )
  
  # Perform upsert operation
  dbExecute(db, "
    INSERT INTO clinical.ip_medications
    SELECT * FROM ip_medications_temp
    ON CONFLICT (medication_id)
    DO UPDATE SET
      patient_mrn = EXCLUDED.patient_mrn,
      admission_id = EXCLUDED.admission_id,
      order_date = EXCLUDED.order_date,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      medication_name = EXCLUDED.medication_name,
      generic_name = EXCLUDED.generic_name,
      therapeutic_class = EXCLUDED.therapeutic_class,
      order_type = EXCLUDED.order_type,
      order_status = EXCLUDED.order_status,
      dose = EXCLUDED.dose,
      dose_unit = EXCLUDED.dose_unit,
      frequency = EXCLUDED.frequency,
      route = EXCLUDED.route,
      updated_at = CURRENT_TIMESTAMP
  ")
  
  # Clean up temp table
  dbExecute(db, "DROP TABLE ip_medications_temp")
  
  # 3. Import Outpatient Visits
  message("\nImporting Outpatient Visits data...")
  op_visits_baseline_path <- file.path(data_dir, "IN495734_SCD_OP_Visits_Baseline.txt")
  op_visits_lam_path <- file.path(data_dir, "OP_Visits_Lam_20241004.txt")
  
  message(sprintf("Reading file: %s", op_visits_baseline_path))
  op_visits_baseline <- safe_read_file(
    op_visits_baseline_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  message(sprintf("Reading file: %s", op_visits_lam_path))
  op_visits_lam <- safe_read_file(
    op_visits_lam_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  # Combine and prepare visits data
  op_visits <- bind_rows(
    op_visits_baseline,
    op_visits_lam
  ) %>%
    transmute(
      visit_id = as.character(visit_id),
      patient_mrn = as.character(patient_mrn),
      visit_date = as_datetime(visit_date),
      visit_type = visit_type,
      department = department,
      provider = provider,
      visit_status = visit_status,
      cancel_reason = cancel_reason,
      diagnosis_primary = primary_diagnosis,
      diagnosis_secondary = array_from_vec(secondary_diagnoses)
    ) %>%
    distinct()  # Remove any duplicates
  
  message(sprintf("Upserting %d records into clinical.op_visits", nrow(op_visits)))
  
  # Create temporary table for the upsert operation
  dbExecute(db, "CREATE TEMP TABLE op_visits_temp (LIKE clinical.op_visits)")
  
  # Load data into temp table
  dbWriteTable(
    db,
    "op_visits_temp",
    op_visits,
    append = TRUE,
    temporary = TRUE
  )
  
  # Perform upsert operation
  dbExecute(db, "
    INSERT INTO clinical.op_visits
    SELECT * FROM op_visits_temp
    ON CONFLICT (visit_id)
    DO UPDATE SET
      patient_mrn = EXCLUDED.patient_mrn,
      visit_date = EXCLUDED.visit_date,
      visit_type = EXCLUDED.visit_type,
      department = EXCLUDED.department,
      provider = EXCLUDED.provider,
      visit_status = EXCLUDED.visit_status,
      cancel_reason = EXCLUDED.cancel_reason,
      diagnosis_primary = EXCLUDED.diagnosis_primary,
      diagnosis_secondary = EXCLUDED.diagnosis_secondary,
      updated_at = CURRENT_TIMESTAMP
  ")
  
  # Clean up temp table
  dbExecute(db, "DROP TABLE op_visits_temp")
  
  # 4. Import Outpatient Medications
  message("\nImporting Outpatient Medications data...")
  op_meds_baseline_path <- file.path(data_dir, "IN495734_SCD_OP_AVS_Meds_Baseline.txt")
  op_meds_lam_path <- file.path(data_dir, "OP_AVS_Lam_20241004.txt")
  
  message(sprintf("Reading file: %s", op_meds_baseline_path))
  op_meds_baseline <- safe_read_file(
    op_meds_baseline_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  message(sprintf("Reading file: %s", op_meds_lam_path))
  op_meds_lam <- safe_read_file(
    op_meds_lam_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  # Combine and prepare medications data
  op_medications <- bind_rows(
    op_meds_baseline,
    op_meds_lam
  ) %>%
    transmute(
      medication_id = as.character(medication_id),
      patient_mrn = as.character(patient_mrn),
      visit_id = as.character(visit_id),
      prescribed_date = as_datetime(prescribed_date),
      medication_name = medication_name,
      generic_name = generic_name,
      therapeutic_class = therapeutic_class,
      dose = dose,
      dose_unit = dose_unit,
      frequency = frequency,
      route = route,
      duration = as.numeric(duration),
      duration_unit = duration_unit,
      refills = as.numeric(refills)
    ) %>%
    distinct()  # Remove any duplicates
  
  message(sprintf("Upserting %d records into clinical.op_medications", nrow(op_medications)))
  
  # Create temporary table for the upsert operation
  dbExecute(db, "CREATE TEMP TABLE op_medications_temp (LIKE clinical.op_medications)")
  
  # Load data into temp table
  dbWriteTable(
    db,
    "op_medications_temp",
    op_medications,
    append = TRUE,
    temporary = TRUE
  )
  
  # Perform upsert operation
  dbExecute(db, "
    INSERT INTO clinical.op_medications
    SELECT * FROM op_medications_temp
    ON CONFLICT (medication_id)
    DO UPDATE SET
      patient_mrn = EXCLUDED.patient_mrn,
      visit_id = EXCLUDED.visit_id,
      prescribed_date = EXCLUDED.prescribed_date,
      medication_name = EXCLUDED.medication_name,
      generic_name = EXCLUDED.generic_name,
      therapeutic_class = EXCLUDED.therapeutic_class,
      dose = EXCLUDED.dose,
      dose_unit = EXCLUDED.dose_unit,
      frequency = EXCLUDED.frequency,
      route = EXCLUDED.route,
      duration = EXCLUDED.duration,
      duration_unit = EXCLUDED.duration_unit,
      refills = EXCLUDED.refills,
      updated_at = CURRENT_TIMESTAMP
  ")
  
  # Clean up temp table
  dbExecute(db, "DROP TABLE op_medications_temp")
  
  # 5. Import Bone Marrow Studies
  message("\nImporting Bone Marrow Studies data...")
  bone_marrow_baseline_path <- file.path(data_dir, "IN495734_SCD_Bone_Marrow_Baseline.txt")
  bone_marrow_lam_path <- file.path(data_dir, "Bone_Marrow_Lam_20241004.txt")
  
  message(sprintf("Reading file: %s", bone_marrow_baseline_path))
  bone_marrow_baseline <- safe_read_file(
    bone_marrow_baseline_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  message(sprintf("Reading file: %s", bone_marrow_lam_path))
  bone_marrow_lam <- safe_read_file(
    bone_marrow_lam_path,
    read_delim,
    delim = "|"
  ) %>%
    clean_names_custom() %>%
    mutate(patient_mrn = as.character(patient_mrn))
  
  # Combine and prepare bone marrow data
  bone_marrow <- bind_rows(
    bone_marrow_baseline,
    bone_marrow_lam
  ) %>%
    transmute(
      study_id = as.character(study_id),
      patient_mrn = as.character(patient_mrn),
      collection_date = as_datetime(collection_date),
      procedure_type = procedure_type,
      site = site,
      indication = indication,
      cellularity = as.numeric(cellularity),
      fibrosis_grade = fibrosis_grade,
      iron_stain = iron_stain,
      ringed_sideroblasts = as.numeric(ringed_sideroblasts),
      cytogenetics = cytogenetics,
      molecular_studies = molecular_studies,
      interpretation = interpretation
    ) %>%
    distinct()  # Remove any duplicates
  
  message(sprintf("Upserting %d records into clinical.bone_marrow", nrow(bone_marrow)))
  
  # Create temporary table for the upsert operation
  dbExecute(db, "CREATE TEMP TABLE bone_marrow_temp (LIKE clinical.bone_marrow)")
  
  # Load data into temp table
  dbWriteTable(
    db,
    "bone_marrow_temp",
    bone_marrow,
    append = TRUE,
    temporary = TRUE
  )
  
  # Perform upsert operation
  dbExecute(db, "
    INSERT INTO clinical.bone_marrow
    SELECT * FROM bone_marrow_temp
    ON CONFLICT (study_id)
    DO UPDATE SET
      patient_mrn = EXCLUDED.patient_mrn,
      collection_date = EXCLUDED.collection_date,
      procedure_type = EXCLUDED.procedure_type,
      site = EXCLUDED.site,
      indication = EXCLUDED.indication,
      cellularity = EXCLUDED.cellularity,
      fibrosis_grade = EXCLUDED.fibrosis_grade,
      iron_stain = EXCLUDED.iron_stain,
      ringed_sideroblasts = EXCLUDED.ringed_sideroblasts,
      cytogenetics = EXCLUDED.cytogenetics,
      molecular_studies = EXCLUDED.molecular_studies,
      interpretation = EXCLUDED.interpretation,
      updated_at = CURRENT_TIMESTAMP
  ")
  
  # Clean up temp table
  dbExecute(db, "DROP TABLE bone_marrow_temp")
  
  # Commit transaction
  dbCommit(db)
  message("\nAll data imported successfully!")
  
}, error = function(e) {
  # Rollback transaction on error
  dbRollback(db)
  stop(sprintf("Error during import: %s", e$message))
  
}, finally = {
  # Close database connection
  dbDisconnect(db)
}) 
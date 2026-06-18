#!/usr/bin/env Rscript

# Comprehensive data import script for SCD Research Database
# This script imports all data from the source files into the database

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(DBI)
  library(RPostgres)
  library(jsonlite)
  library(lubridate)
  library(glue)
  library(janitor)
})

# Helper function to print column names
print_columns <- function(df, source_name) {
  message("\nColumns in ", source_name, ":")
  message(paste(colnames(df), collapse = ", "))
  message("\n")
  return(df)
}

# Database connection parameters (override via environment variables)
db_name <- Sys.getenv("PGDATABASE", unset = "hema_track_demo")
db_host <- Sys.getenv("PGHOST", unset = "localhost")
db_port <- as.integer(Sys.getenv("PGPORT", unset = "5432"))
db_user <- Sys.getenv("PGUSER", unset = "demo")
db_password <- Sys.getenv("PGPASSWORD", unset = "demo")

# Connect to database
message("\nConnecting to database...")
con <- dbConnect(
  Postgres(),
  dbname = db_name,
  host = db_host,
  port = db_port,
  user = db_user,
  password = db_password
)

# Clear existing data
message("\nClearing existing data...")
dbExecute(con, "TRUNCATE TABLE clinical.ip_admissions CASCADE")
dbExecute(con, "TRUNCATE TABLE clinical.ip_medications CASCADE")
dbExecute(con, "TRUNCATE TABLE clinical.op_visits CASCADE")
dbExecute(con, "TRUNCATE TABLE clinical.op_medications CASCADE")
dbExecute(con, "TRUNCATE TABLE clinical.bone_marrow CASCADE")
dbExecute(con, "TRUNCATE TABLE clinical.demographics CASCADE")
dbExecute(con, "TRUNCATE TABLE phi.patients CASCADE")

# Set working directory to the baseline data folder
data_dir <- Sys.getenv("DATA_DIR", unset = "./data/epic")
setwd(data_dir)

# Import Demographics data
message("\nImporting Demographics data...")

# Read and clean demographics data
demographics_baseline <- read_delim("IN495734_SCD_Demographics_Social_Hx_Baseline.txt", delim = "|") %>% 
  clean_names()
demographics_lam <- read_delim("Demographics_Lam_20241004.txt", delim = "|") %>% 
  clean_names()

message("\nColumns in Demographics Baseline:")
cat(paste(colnames(demographics_baseline), collapse = ", "), "\n\n")

message("\nColumns in Demographics LAM:")
cat(paste(colnames(demographics_lam), collapse = ", "), "\n\n")

# Combine demographics data
demographics_combined <- bind_rows(
  demographics_baseline %>% mutate(source = "baseline"),
  demographics_lam %>% mutate(source = "lam")
) %>%
  distinct(patient_mrn, .keep_all = TRUE)

# Write to patients table
message("\nCreating patients...")
patients_data <- demographics_combined %>%
  transmute(
    patient_mrn = patient_mrn,
    first_name = str_extract(patient_name, "^[^,]+"),
    last_name = str_extract(patient_name, "(?<=, ).+"),
    birth_date = as_date(birth_date),
    sex = gender,
    race = race,
    ethnicity = ethnicity
  )

message(paste("Writing", nrow(patients_data), "patient records..."))
dbWriteTable(con, Id(schema = "phi", table = "patients"), patients_data, append = TRUE)

# Write to demographics table
message(paste("Writing", nrow(demographics_combined), "demographics records..."))
demographics_data <- demographics_combined %>%
  transmute(
    patient_mrn = patient_mrn,
    birth_date = as_date(birth_date),
    age = as.integer(age),
    gender = case_when(
      gender %in% c("Male", "Female") ~ gender,
      TRUE ~ "Unknown"
    ),
    race = race,
    ethnicity = ethnicity,
    is_tobacco_user_yn = case_when(
      is_tobacco_user_yn == "Y" ~ "Yes",
      is_tobacco_user_yn == "N" ~ "No",
      TRUE ~ "Unknown"
    ),
    alcohol_user_yn = case_when(
      alcohol_user_yn == "Y" ~ "Yes",
      alcohol_user_yn == "N" ~ "No",
      TRUE ~ "Unknown"
    ),
    ill_drug_user_yn = case_when(
      ill_drug_user_yn == "Y" ~ "Yes",
      ill_drug_user_yn == "N" ~ "No",
      TRUE ~ "Unknown"
    ),
    source = source
  )

dbWriteTable(con, Id(schema = "clinical", table = "demographics"), demographics_data, append = TRUE)

# Import Bone Marrow data
message("\nImporting Bone Marrow data...")

# Read and clean bone marrow data
bone_marrow_baseline <- read_delim("IN495734_SCD_Bone_Marrow_Baseline.txt", delim = "|") %>% 
  clean_names()
bone_marrow_lam <- read_delim("Bone_Marrow_Lam_20241004.txt", delim = "|") %>% 
  clean_names()

message("\nColumns in Bone Marrow Baseline:")
cat(paste(colnames(bone_marrow_baseline), collapse = ", "), "\n\n")

message("\nColumns in Bone Marrow LAM:")
cat(paste(colnames(bone_marrow_lam), collapse = ", "), "\n\n")

# Write bone marrow data
bone_marrow_data <- bind_rows(
  bone_marrow_baseline %>% mutate(source = "baseline"),
  bone_marrow_lam %>% mutate(source = "lam")
) %>%
  transmute(
    patient_mrn = patient_mrn,
    hsp_account_id = hsp_account_id,
    order_id = order_id,
    result_time = as.POSIXct(result_time),
    lab_code = lab_code,
    lab_name = lab_name,
    component_id = component_id,
    lab_component_description = lab_component_description,
    bone_marrow_results_by_component = bone_marrow_results_by_component
  )

message(paste("Writing", nrow(bone_marrow_data), "bone marrow records..."))
dbWriteTable(con, Id(schema = "clinical", table = "bone_marrow"), bone_marrow_data, append = TRUE)

# Import Inpatient Admissions data
message("\nImporting Inpatient Admissions data...")

# Read and clean inpatient admissions data
ip_admissions_baseline <- read_delim("IN495734_SCD_IP_Admissions_Baseline.txt", delim = "|") %>% 
  clean_names()
ip_admissions_lam <- read_delim("IP_Admissions_Lam_20241004.txt", delim = "|") %>% 
  clean_names()

message("\nColumns in Inpatient Admissions Baseline:")
cat(paste(colnames(ip_admissions_baseline), collapse = ", "), "\n\n")

message("\nColumns in Inpatient Admissions LAM:")
cat(paste(colnames(ip_admissions_lam), collapse = ", "), "\n\n")

# Write inpatient admissions data
ip_admissions_data <- bind_rows(
  ip_admissions_baseline %>% mutate(source = "baseline"),
  ip_admissions_lam %>% mutate(source = "lam")
) %>%
  transmute(
    patient_mrn = patient_mrn,
    hsp_account_id = hsp_account_id,
    adm_date_time = as.POSIXct(adm_date_time),
    disch_date_time = as.POSIXct(disch_date_time),
    discharge_department = discharge_department,
    discharge_disposition = discharge_disposition,
    icu_admission_yn = icu_admission_yn,
    admit_dx_cd_1 = admit_dx_cd_1,
    admit_dx_description_1 = admit_dx_description_1,
    admit_dx_cd_2 = admit_dx_cd_2,
    admit_dx_description_2 = admit_dx_description_2,
    final_dx_cd_1 = final_dx_cd_1,
    final_dx_description_1 = final_dx_description_1,
    final_dx_cd_2 = final_dx_cd_2,
    final_dx_description_2 = final_dx_description_2,
    final_dx_cd_3 = final_dx_cd_3,
    final_dx_description_3 = final_dx_description_3,
    final_dx_cd_4 = final_dx_cd_4,
    final_dx_description_4 = final_dx_description_4,
    final_dx_cd_5 = final_dx_cd_5,
    final_dx_description_5 = final_dx_description_5,
    has_date_issues = !is.na(disch_date_time) & disch_date_time < adm_date_time,
    date_issue_notes = case_when(
      !is.na(disch_date_time) & disch_date_time < adm_date_time ~ 
        paste0("Discharge date (", disch_date_time, ") is before admission date (", adm_date_time, ")"),
      TRUE ~ NA_character_
    )
  )

message(paste("Writing", nrow(ip_admissions_data), "inpatient admission records..."))
dbWriteTable(con, Id(schema = "clinical", table = "ip_admissions"), ip_admissions_data, append = TRUE)

# Import Inpatient Medications data
message("\nImporting Inpatient Medications data...")

# Read and clean inpatient medications data
ip_meds_baseline <- read_delim("IN495734_SCD_IP_Meds_Baseline.txt", delim = "|") %>% 
  clean_names()
ip_meds_lam <- read_delim("IP_Meds_Lam_20241004.txt", delim = "|") %>% 
  clean_names()

message("\nColumns in Inpatient Medications Baseline:")
cat(paste(colnames(ip_meds_baseline), collapse = ", "), "\n\n")

message("\nColumns in Inpatient Medications LAM:")
cat(paste(colnames(ip_meds_lam), collapse = ", "), "\n\n")

# Write inpatient medications data
ip_medications_data <- bind_rows(
  ip_meds_baseline %>% 
    mutate(
      source = "baseline",
      dosage = as.character(dosage)
    ),
  ip_meds_lam %>% 
    mutate(
      source = "lam",
      dosage = as.character(dosage)
    )
) %>%
  transmute(
    patient_mrn = patient_mrn,
    hsp_account_id = hsp_account_id,
    adm_date_time = as.POSIXct(adm_date_time),
    disch_date_time = as.POSIXct(disch_date_time),
    medication = medication,
    dosage = dosage,
    unit = unit,
    frequency = frequency,
    taken_time = as.POSIXct(taken_time),
    rx_class_name = rx_class_name,
    has_date_issues = case_when(
      is.na(taken_time) ~ FALSE,
      taken_time < adm_date_time ~ TRUE,
      !is.na(disch_date_time) & taken_time > disch_date_time ~ TRUE,
      TRUE ~ FALSE
    ),
    date_issue_notes = case_when(
      is.na(taken_time) ~ NA_character_,
      taken_time < adm_date_time ~ 
        paste0("Taken time (", taken_time, ") is before admission date (", adm_date_time, ")"),
      !is.na(disch_date_time) & taken_time > disch_date_time ~ 
        paste0("Taken time (", taken_time, ") is after discharge date (", disch_date_time, ")"),
      TRUE ~ NA_character_
    )
  )

message(paste("Writing", nrow(ip_medications_data), "inpatient medication records..."))
dbWriteTable(con, Id(schema = "clinical", table = "ip_medications"), ip_medications_data, append = TRUE)

# Import Outpatient Visits data
message("\nImporting Outpatient Visits data...")

# Read and clean outpatient visits data
op_visits_baseline <- read_delim("IN495734_SCD_OP_Visits_Baseline.txt", delim = "|") %>% 
  clean_names()
op_visits_lam <- read_delim("OP_Visits_Lam_20241004.txt", delim = "|") %>% 
  clean_names()

message("\n\nColumns in Outpatient Visits Baseline:\n")
cat(paste(names(op_visits_baseline), collapse = ", "))
cat("\n\n\nColumns in Outpatient Visits LAM:\n")
cat(paste(names(op_visits_lam), collapse = ", "))

op_visits_combined <- bind_rows(
  op_visits_baseline %>%
    transmute(
      patient_mrn = as.numeric(patient_mrn),
      pat_id,
      hsp_account_id = as.numeric(hsp_account_id),
      visit_date,
      visit_type,
      department_id = as.numeric(department_id),
      department_name,
      bp_systolic = as.integer(round(as.numeric(bp_systolic))),
      bp_diastolic = as.integer(round(as.numeric(bp_diastolic))),
      weight_lbs = as.numeric(weight_lbs),
      weight_kg = as.numeric(weight_kg),
      current_icd10_list,
      dx_name
    ),
  op_visits_lam %>%
    transmute(
      patient_mrn = as.numeric(patient_mrn),
      pat_id,
      hsp_account_id = as.numeric(hsp_account_id),
      visit_date,
      visit_type,
      department_id = as.numeric(department_id),
      department_name,
      bp_systolic = as.integer(round(as.numeric(bp_systolic))),
      bp_diastolic = as.integer(round(as.numeric(bp_diastolic))),
      weight_lbs = as.numeric(weight_lbs),
      weight_kg = as.numeric(weight_kg),
      current_icd10_list,
      dx_name
    )
)

# Write outpatient visits data
message(paste("Writing", nrow(op_visits_combined), "outpatient visit records..."))
dbWriteTable(con, Id(schema = "clinical", table = "op_visits"), op_visits_combined, append = TRUE)

# Import Outpatient Medications data
message("\nImporting Outpatient Medications data...")

# Read and clean outpatient medications data
op_meds_baseline <- read_delim("IN495734_SCD_OP_AVS_Meds_Baseline.txt", delim = "|") %>% 
  clean_names()
op_meds_lam <- read_delim("OP_AVS_Lam_20241004.txt", delim = "|") %>% 
  clean_names()

message("\nColumns in Outpatient Medications Baseline:")
cat(paste(colnames(op_meds_baseline), collapse = ", "), "\n\n")

message("\nColumns in Outpatient Medications LAM:")
cat(paste(colnames(op_meds_lam), collapse = ", "), "\n\n")

# Write outpatient medications data
op_medications_data <- bind_rows(
  op_meds_baseline %>% mutate(source = "baseline"),
  op_meds_lam %>% mutate(source = "lam")
) %>%
  transmute(
    patient_mrn = patient_mrn,
    hsp_account_id = hsp_account_id,
    visit_date = as.POSIXct(visit_date),
    order_med_id = order_med_id,
    order_dttm = as.POSIXct(order_dttm),
    rx_status = rx_status,
    generic_description = generic_description
  )

message(paste("Writing", nrow(op_medications_data), "outpatient medication records..."))
dbWriteTable(con, Id(schema = "clinical", table = "op_medications"), op_medications_data, append = TRUE)

# Close database connection
dbDisconnect(con)
message("\nImport complete!") 
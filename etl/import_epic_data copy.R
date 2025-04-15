# Import required libraries
library(tidyverse)
library(readr)
library(RPostgres)
library(lubridate)
library(janitor)
library(DBI)
library(glue)
library(digest)

# --- db_upsert Function Definition (Copied from full script) ---
# Function for upserting into PostgreSQL
# NOTE: This requires the table to have a unique constraint (like a PRIMARY KEY)
# on the columns specified in 'conflict_cols'.
db_upsert <- function(con, schema, table, data, conflict_cols, update_cols = NULL) {
  if (nrow(data) == 0) {
    cat("    No data to upsert for", paste(schema, table, sep = "."), "\n")
    return()
  }
  
  table_id <- Id(schema = schema, table = table)
  # Use table name directly in temp table name to avoid issues if table is Id object
  table_name_part <- if(inherits(table, "Id")) table@name[["table"]] else table 
  temp_table_name <- paste0("temp_", table_name_part, "_", digest(Sys.time())) # Unique temp table name
  temp_table_id <- Id(schema = "pg_temp", table = temp_table_name) # Use temp schema
  
  cat("    Upserting", nrow(data), "rows into", paste(schema, table_name_part, sep = "."), "using columns:", paste(colnames(data), collapse=", "), "\n")
  
  # 1. Write data to a temporary table
  cat("    Writing to temporary table...")
  dbWriteTable(con, name = temp_table_id, value = data, overwrite = TRUE, row.names = FALSE)
  cat(" Done.\n")
  
  # 2. Build the UPSERT SQL statement
  # Explicitly quote identifiers before using them in glue
  table_id_sql <- DBI::dbQuoteIdentifier(con, table_id)
  temp_table_id_sql <- DBI::dbQuoteIdentifier(con, temp_table_id)

  all_cols <- colnames(data)
  all_cols_sql <- paste(dbQuoteIdentifier(con, all_cols), collapse = " , ") # Quote individual columns too
  conflict_cols_sql <- paste(dbQuoteIdentifier(con, conflict_cols), collapse = ", ") # Quote conflict columns
  
  # Default update_cols to all columns except conflict_cols if not provided
  if (is.null(update_cols)) {
    update_cols <- setdiff(all_cols, conflict_cols)
  }
  
  # Build SET clause for updates, quoting column names
  quoted_update_cols <- dbQuoteIdentifier(con, update_cols)
  set_clause <- paste(quoted_update_cols, "= EXCLUDED.", quoted_update_cols, collapse = ", ", sep = "")
  
  # Add special handling for timestamp columns if they exist in update_cols
  update_cols_final <- update_cols # Start with potentially full list
  if ("created_at" %in% update_cols) {
      update_cols_final <- update_cols_final[update_cols_final != "created_at"]
  }
  
  quoted_update_cols_final <- dbQuoteIdentifier(con, update_cols_final)
  set_clause_final <- paste(quoted_update_cols_final, "= EXCLUDED.", quoted_update_cols_final, collapse = ", ", sep = "")
  
  if ("updated_at" %in% update_cols) {
      quoted_updated_at <- dbQuoteIdentifier(con, "updated_at")
      pattern_to_replace <- paste0(quoted_updated_at, "\\s*=\\s*EXCLUDED\\.", quoted_updated_at)
      if (grepl(pattern_to_replace, set_clause_final, perl=TRUE)) {
          set_clause_final <- sub(pattern_to_replace, paste0(quoted_updated_at, " = NOW()"), set_clause_final, perl=TRUE)
      } else if (!("created_at" %in% update_cols)) { 
          set_clause_final <- paste0(quoted_updated_at, " = NOW()") 
      }
      if (length(update_cols_final) == 0 && "updated_at" %in% update_cols) {
           set_clause_final <- paste0(quoted_updated_at, " = NOW()")
      }
  }

  upsert_sql <- glue::glue(
    "INSERT INTO {table_id_sql} ({all_cols_sql}) 
     SELECT {all_cols_sql} FROM {temp_table_id_sql} 
     ON CONFLICT ({conflict_cols_sql}) DO UPDATE SET {set_clause_final};"
  )
  
  cat("    Executing UPSERT...")
  dbBegin(con)
  tryCatch({
    result <- dbExecute(con, upsert_sql)
    dbCommit(con)
    cat(" Done. Affected rows (approx):", result, "\n")
  }, error = function(e) {
    dbRollback(con)
    cat(" FAILED.\n")
    # Use table_name_part for warning message
    warning("Upsert failed for table ", paste(schema, table_name_part, sep="."), ": ", conditionMessage(e))
    print(upsert_sql) 
  })
}
# --- End db_upsert Definition ---

# Establish a connection to your PostgreSQL database
con <- dbConnect(
  Postgres(),
  dbname = "scd_research_secure",  # Changed to secure_test which has the right schemas
  host = "localhost",
  port = 5432,
  user = "jonathanwade"
)

# Remove TRUNCATE commands - we are updating existing data
# dbExecute(con, "TRUNCATE clinical.demographics, clinical.ip_admissions, clinical.ip_medications, clinical.bone_marrow, clinical.op_visits, clinical.op_medications CASCADE;")
# dbExecute(con, "TRUNCATE phi.patients CASCADE;")

# Load April 2025 demographics data 
demographics_raw_april <- read_delim("April 2025/Demographics_Lam_20250404.txt", delim = "|") %>%
  clean_names()

# Use April data for patient extraction
patients_april <- demographics_raw_april %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    birth_date = as_date(birth_date)
  ) %>%
  # Extract first and last name from patient_name
  mutate(
    first_name = str_extract(patient_name, "(?<=, ).*"),
    last_name = str_extract(patient_name, "^[^,]+"),
    sex = gender,
    # Clean up fields that might be too long
    race = substr(race, 1, 100),
    ethnicity = substr(ethnicity, 1, 100)
  ) %>%
  select(patient_mrn, first_name, last_name, birth_date, sex, race, ethnicity) %>%
  distinct(patient_mrn, .keep_all = TRUE)

# --- Upsert Patients (PHI data) from April --- 
# Ensure required columns exist before upserting
required_patient_cols <- c("patient_mrn", "first_name", "last_name", "birth_date", "sex", "race", "ethnicity")
patients_to_upsert <- patients_april %>% select(any_of(required_patient_cols))

# Check if all required columns are present after selection
if(!all(required_patient_cols %in% colnames(patients_to_upsert))){
    missing_cols <- required_patient_cols[!required_patient_cols %in% colnames(patients_to_upsert)]
    warning("Skipping patient upsert. Missing required columns: ", paste(missing_cols, collapse=", "))
} else {
    db_upsert(con, schema = "phi", table = "patients", data = patients_to_upsert, 
              conflict_cols = c("patient_mrn"),
              update_cols = setdiff(required_patient_cols, "patient_mrn")) # Update all except MRN
}
# cat("Patient UPSERT from April needed - Skipped for now.\n") # Removed placeholder

# --- Process Demographics from April ---
demographics_april <- demographics_raw_april %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    birth_date = as_date(birth_date),
    source = "April 2025",
    # Normalize Y/N fields to consistent values within the 10 character limit
    is_tobacco_user_yn = case_when(
      tolower(is_tobacco_user_yn) %in% c("y", "yes", "current") ~ "Yes",
      tolower(is_tobacco_user_yn) %in% c("n", "no", "never", "not current", "not currently") ~ "No",
      TRUE ~ "Unknown"
    ),
    alcohol_user_yn = case_when(
      tolower(alcohol_user_yn) %in% c("y", "yes", "current") ~ "Yes",
      tolower(alcohol_user_yn) %in% c("n", "no", "never", "not current", "not currently") ~ "No", 
      TRUE ~ "Unknown"
    ),
    ill_drug_user_yn = case_when(
      tolower(ill_drug_user_yn) %in% c("y", "yes", "current") ~ "Yes",
      tolower(ill_drug_user_yn) %in% c("n", "no", "never", "not current", "not currently") ~ "No",
      TRUE ~ "Unknown"
    )
  ) %>%
  select(-patient_name)  # remove identifiable info, if necessary

# --- Update Demographics: Deduplicate April data then Append ---
# Define deduplication key
demo_dedup_key <- c("patient_mrn", "source") # Source is always "April 2025"

# Filter NAs in key columns
demographics_april_filtered <- demographics_april %>%
    filter(if_all(all_of(demo_dedup_key), ~ !is.na(.)))

# Deduplicate within April data
if(nrow(demographics_april_filtered) > 0) {
    demographics_final <- demographics_april_filtered %>%
        group_by(across(all_of(demo_dedup_key))) %>% 
        slice(1) %>% 
        ungroup()
    cat("    Deduplicated April demographics: Retaining", nrow(demographics_final), "rows.\n")
} else {
    demographics_final <- tibble()
}

# Append final April data 
if (nrow(demographics_final) > 0) {
  # Align with DB Schema before writing (ensure required columns exist)
  required_demo_cols <- c("patient_mrn", "birth_date", "age", "gender", "race", "ethnicity", "is_tobacco_user_yn", "alcohol_user_yn", "ill_drug_user_yn", "source")
  demographics_to_write <- demographics_final %>% select(any_of(required_demo_cols))
  
  if(!all(required_demo_cols %in% colnames(demographics_to_write))) {
      missing_cols <- required_demo_cols[!required_demo_cols %in% colnames(demographics_to_write)]
      warning("Skipping demographics write. Missing required columns: ", paste(missing_cols, collapse=", "))
  } else {
      dbWriteTable(con, name = Id(schema = "clinical", table = "demographics"), value = demographics_to_write, append = TRUE, row.names = FALSE)
      cat("Appended April demographics data.\n")
  }
} else {
    cat("No valid April demographics data to append.\n")
}
# cat("Demographics update from April needed - Appending for now (potential duplicates).\n") # Removed placeholder

# --- Process Inpatient Admissions from April --- 
ip_admissions_april <- read_delim("April 2025/IP_Admissions_Lam_20250404.txt", delim = "|") %>%
  clean_names() %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    adm_date_time = as_datetime(adm_date_time),
    disch_date_time = as_datetime(disch_date_time),
    has_date_issues = !is.na(disch_date_time) & disch_date_time < adm_date_time,
    date_issue_notes = case_when(
      !is.na(disch_date_time) & disch_date_time < adm_date_time ~ 
        paste0("Discharge date (", disch_date_time, ") is before admission date (", adm_date_time, ")"),
      TRUE ~ NA_character_
    ),
    # Normalize Y/N fields to consistent values within the 10 character limit
    icu_admission_yn = case_when(
      tolower(icu_admission_yn) %in% c("y", "yes") ~ "Yes",
      tolower(icu_admission_yn) %in% c("n", "no") ~ "No",
      TRUE ~ "Unknown"
    )
  ) %>%
  # Only process data for patients from the April file
  inner_join(patients_april %>% select(patient_mrn), by = "patient_mrn")

# --- Update IP Admissions: Deduplicate April data then Append ---
ipad_dedup_key <- c("patient_mrn", "hsp_account_id", "adm_date_time")
ipad_april_filtered <- ip_admissions_april %>%
    filter(if_all(all_of(ipad_dedup_key), ~ !is.na(.)))
    
if(nrow(ipad_april_filtered) > 0) {
    ipad_final <- ipad_april_filtered %>%
        group_by(across(all_of(ipad_dedup_key))) %>% 
        slice(1) %>% 
        ungroup()
    cat("    Deduplicated April IP Admissions: Retaining", nrow(ipad_final), "rows.\n")
} else {
    ipad_final <- tibble()
}

if (nrow(ipad_final) > 0) {
  # Align with DB schema
  required_ipad_cols <- c("patient_mrn", "hsp_account_id", "adm_date_time", "disch_date_time", "discharge_department", "discharge_disposition", "icu_admission_yn", "has_date_issues", "date_issue_notes")
  ipad_to_write <- ipad_final %>% select(any_of(required_ipad_cols))
  
  if(!all(required_ipad_cols %in% colnames(ipad_to_write))) {
      missing_cols <- required_ipad_cols[!required_ipad_cols %in% colnames(ipad_to_write)]
      warning("Skipping IP Admissions write. Missing required columns: ", paste(missing_cols, collapse=", "))
  } else {
      dbWriteTable(con, name = Id(schema = "clinical", table = "ip_admissions"), value = ipad_to_write, append = TRUE, row.names = FALSE)
      cat("Appended April IP Admissions data.\n")
  }
} else {
    cat("No valid April IP Admissions data to append.\n")
}
# cat("IP Admissions update from April needed - Appending for now (potential duplicates).\n") # Removed placeholder

# --- Process Inpatient Medications from April --- 
ip_meds_april <- read_delim("April 2025/IP_Meds_Lam_20250404.txt", delim = "|") %>%
  clean_names() %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    adm_date_time = as_datetime(adm_date_time),
    disch_date_time = as_datetime(disch_date_time),
    taken_time = as_datetime(taken_time),
    dosage = as.character(dosage),
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
  ) %>%
  # Only process data for patients from the April file
  inner_join(patients_april %>% select(patient_mrn), by = "patient_mrn")

# --- Update IP Meds: Deduplicate April data then Append ---
ipmed_dedup_key <- c("patient_mrn", "hsp_account_id", "medication", "taken_time")
ipmed_april_filtered <- ip_meds_april %>%
    filter(if_all(all_of(ipmed_dedup_key), ~ !is.na(.)))

if(nrow(ipmed_april_filtered) > 0) {
    ipmed_final <- ipmed_april_filtered %>%
        group_by(across(all_of(ipmed_dedup_key))) %>% 
        slice(1) %>% 
        ungroup()
    cat("    Deduplicated April IP Meds: Retaining", nrow(ipmed_final), "rows.\n")
} else {
    ipmed_final <- tibble()
}

if (nrow(ipmed_final) > 0) {
  # Align with DB schema
  required_ipmed_cols <- c("patient_mrn", "hsp_account_id", "adm_date_time", "disch_date_time", "medication", "dosage", "unit", "frequency", "taken_time", "rx_class_name", "has_date_issues", "date_issue_notes")
  ipmed_to_write <- ipmed_final %>% select(any_of(required_ipmed_cols))
  
  if(!all(required_ipmed_cols %in% colnames(ipmed_to_write))) {
      missing_cols <- required_ipmed_cols[!required_ipmed_cols %in% colnames(ipmed_to_write)]
      warning("Skipping IP Meds write. Missing required columns: ", paste(missing_cols, collapse=", "))
  } else {
      dbWriteTable(con, name = Id(schema = "clinical", table = "ip_medications"), value = ipmed_to_write, append = TRUE, row.names = FALSE)
      cat("Appended April IP Medications data.\n")
  }
} else {
    cat("No valid April IP Medications data to append.\n")
}
# cat("IP Medications update from April needed - Appending for now (potential duplicates).n") # Removed placeholder

# --- Process Bone Marrow from April --- 
bone_marrow_april <- read_delim("April 2025/Bone_Marrow_Lam_20250404.txt", delim = "|") %>%
  clean_names() %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    result_time = as_datetime(result_time)
  ) %>%
  # Only process data for patients from the April file
  inner_join(patients_april %>% select(patient_mrn), by = "patient_mrn")

# --- Update Bone Marrow: Deduplicate April data then Append ---
# NOTE: April source file might be missing some key columns (order_id, lab_code). 
# Deduplicating based on available columns.
bm_dedup_key <- c("patient_mrn", "result_time") 
# Add other keys like hsp_account_id, order_id, lab_code if available in bone_marrow_april and needed

bm_april_filtered <- bone_marrow_april %>%
    filter(if_all(all_of(bm_dedup_key), ~ !is.na(.)))
    
if(nrow(bm_april_filtered) > 0) {
    bm_final <- bm_april_filtered %>%
        group_by(across(all_of(bm_dedup_key))) %>% 
        # If multiple results for same patient/time, need better logic? Taking first for now.
        slice(1) %>% 
        ungroup()
    cat("    Deduplicated April Bone Marrow: Retaining", nrow(bm_final), "rows.\n")
} else {
    bm_final <- tibble()
}

if (nrow(bm_final) > 0) {
  # Align with DB schema
  # Need hsp_account_id, order_id, lab_code etc if required by DB table NOT NULL constraints 
  # and if available in bm_final
  required_bm_cols <- c("patient_mrn", "hsp_account_id", "order_id", "result_time", "lab_code", "lab_name")
  bm_to_write <- bm_final %>% select(any_of(required_bm_cols))
  
  # Minimal check - adjust required_cols based on actual DB constraints
  if(!("patient_mrn" %in% colnames(bm_to_write) && "hsp_account_id" %in% colnames(bm_to_write) && "result_time" %in% colnames(bm_to_write))) {
      warning("Skipping Bone Marrow write. Missing key columns (mrn, hsp_account_id, result_time).")
  } else {
      dbWriteTable(con, name = Id(schema = "clinical", table = "bone_marrow"), value = bm_to_write, append = TRUE, row.names = FALSE)
      cat("Appended April Bone Marrow data.\n")
  }
} else {
    cat("No valid April Bone Marrow data to append.\n")
}
# cat("Bone Marrow update from April needed - Appending for now (potential duplicates).\n") # Removed placeholder

# --- Process Outpatient Visits from April --- 
op_visits_april <- read_delim("April 2025/OP_Visits_Lam_20250404.txt", delim = "|") %>%
  clean_names() %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    visit_date = as_datetime(visit_date),
    bp_systolic = as.integer(round(as.numeric(bp_systolic))),
    bp_diastolic = as.integer(round(as.numeric(bp_diastolic))),
    weight_lbs = as.numeric(weight_lbs),
    weight_kg = as.numeric(weight_kg)
  ) %>%
  # Only process data for patients from the April file
  inner_join(patients_april %>% select(patient_mrn), by = "patient_mrn")

# --- Update OP Visits: Deduplicate April data then Append ---
opv_dedup_key <- c("patient_mrn", "hsp_account_id", "visit_date") 
# Consider adding pat_id if available and needed for uniqueness

opv_april_filtered <- op_visits_april %>%
    filter(if_all(all_of(opv_dedup_key), ~ !is.na(.)))

if(nrow(opv_april_filtered) > 0) {
    opv_final <- opv_april_filtered %>%
        group_by(across(all_of(opv_dedup_key))) %>% 
        slice(1) %>% 
        ungroup()
    cat("    Deduplicated April OP Visits: Retaining", nrow(opv_final), "rows.\n")
} else {
    opv_final <- tibble()
}

if (nrow(opv_final) > 0) {
  # Align with DB Schema 
  required_opv_cols <- c("patient_mrn", "pat_id", "hsp_account_id", "visit_date", "visit_type", "department_id", "department_name", "bp_systolic", "bp_diastolic", "weight_lbs", "weight_kg", "current_icd10_list", "dx_name")
  opv_to_write <- opv_final %>% select(any_of(required_opv_cols))
  
  if(!("patient_mrn" %in% colnames(opv_to_write) && "hsp_account_id" %in% colnames(opv_to_write) && "visit_date" %in% colnames(opv_to_write))) {
      warning("Skipping OP Visits write. Missing key columns (mrn, hsp_account_id, visit_date).")
  } else {
      dbWriteTable(con, name = Id(schema = "clinical", table = "op_visits"), value = opv_to_write, append = TRUE, row.names = FALSE)
      cat("Appended April OP Visits data.\n")
  }
} else {
    cat("No valid April OP Visits data to append.\n")
}
# cat("OP Visits update from April needed - Appending for now (potential duplicates).n") # Removed placeholder

# --- Process Outpatient Medications from April --- 
op_meds_april <- read_delim("April 2025/OP_AVS_Lam_20250404.txt", delim = "|") %>%
  clean_names() %>%
  mutate(
    patient_mrn = as.character(patient_mrn),
    visit_date = as_datetime(visit_date),
    order_dttm = as_datetime(order_dttm)
  ) %>%
  # Only process data for patients from the April file
  inner_join(patients_april %>% select(patient_mrn), by = "patient_mrn")

# --- Update OP Meds: Deduplicate April data then Append ---
opm_dedup_key <- c("patient_mrn", "order_med_id", "order_dttm")
opm_april_filtered <- op_meds_april %>%
    filter(if_all(all_of(opm_dedup_key), ~ !is.na(.)))
    
if(nrow(opm_april_filtered) > 0) {
    opm_final <- opm_april_filtered %>%
        group_by(across(all_of(opm_dedup_key))) %>% 
        slice(1) %>% 
        ungroup()
    cat("    Deduplicated April OP Meds: Retaining", nrow(opm_final), "rows.\n")
} else {
    opm_final <- tibble()
}

if (nrow(opm_final) > 0) {
  # Align with DB schema
  required_opm_cols <- c("patient_mrn", "hsp_account_id", "visit_date", "order_med_id", "order_dttm", "rx_status", "generic_description")
  opm_to_write <- opm_final %>% select(any_of(required_opm_cols))
  
  # Check required columns - adjust as needed based on actual schema NOT NULL constraints
  if(!("patient_mrn" %in% colnames(opm_to_write) && "hsp_account_id" %in% colnames(opm_to_write) && "visit_date" %in% colnames(opm_to_write))) {
      warning("Skipping OP Meds write. Missing key columns (mrn, hsp_account_id, visit_date).")
  } else {
      dbWriteTable(con, name = Id(schema = "clinical", table = "op_medications"), value = opm_to_write, append = TRUE, row.names = FALSE)
      cat("Appended April OP Medications data.\n")
  }
} else {
    cat("No valid April OP Medications data to append.\n")
}
# cat("OP Medications update from April needed - Appending for now (potential duplicates).n") # Removed placeholder

# Verification counts will now reflect the combined baseline + appended April data
patient_count <- dbGetQuery(con, "SELECT COUNT(*) AS count FROM phi.patients")
cat("\nPatient count:", as.integer(patient_count$count), "\n")

demo_count <- dbGetQuery(con, "SELECT COUNT(*) AS count FROM clinical.demographics")
cat("Demographics count:", as.integer(demo_count$count), "\n")

ip_adm_count <- dbGetQuery(con, "SELECT COUNT(*) AS count FROM clinical.ip_admissions")
cat("IP Admissions count:", as.integer(ip_adm_count$count), "\n")

ip_med_count <- dbGetQuery(con, "SELECT COUNT(*) AS count FROM clinical.ip_medications")
cat("IP Medications count:", as.integer(ip_med_count$count), "\n")

op_visit_count <- dbGetQuery(con, "SELECT COUNT(*) AS count FROM clinical.op_visits")
cat("OP Visits count:", as.integer(op_visit_count$count), "\n")

op_med_count <- dbGetQuery(con, "SELECT COUNT(*) AS count FROM clinical.op_medications")
cat("OP Medications count:", as.integer(op_med_count$count), "\n")

# Disconnect from database
dbDisconnect(con)
cat("\nEPIC April 2025 data processing completed (manual UPSERT/Append logic needed).\n") 

#!/usr/bin/env Rscript

# Import required libraries
library(tidyverse)
library(readr)
library(RPostgres)
library(lubridate)
library(janitor)
library(DBI)
library(digest) # For creating unique IDs for deduplication

# --- Configuration ---
# Define source directories relative to the script's execution directory
source_dirs <- c(
  "April 2025",
  "Baseline Data Jan2011-Jun2024",
  "October Data"
)

# Define file patterns for each table type
file_patterns <- list(
  demographics = c("Demographics_Lam_*.txt", "IN495734_SCD_Demographics_Social_Hx_Baseline.txt"),
  ip_admissions = c("IP_Admissions_Lam_*.txt", "IN495734_SCD_IP_Admissions_Baseline.txt"),
  ip_meds = c("IP_Meds_Lam_*.txt", "IN495734_SCD_IP_Meds_Baseline.txt"),
  bone_marrow = c("Bone_Marrow_Lam_*.txt", "IN495734_SCD_Bone_Marrow_Baseline.txt"),
  op_visits = c("OP_Visits_Lam_*.txt", "IN495734_SCD_OP_Visits_Baseline.txt"),
  op_meds = c("OP_AVS_Lam_*.txt", "IN495734_SCD_OP_AVS_Meds_Baseline.txt"),
  labs = c("*Labs*.txt") # Added pattern for Labs files
)

# Database connection parameters
db_params <- list(
  dbname = "scd_research_secure",
  host = "localhost",
  port = 5432,
  user = "jonathanwade"
  # Add password if required: password = "your_password"
)

# --- Helper Functions ---

# Function to find files matching patterns across source directories
find_data_files <- function(patterns, dirs) {
  all_files <- character(0)
  for (dir in dirs) {
    for (pattern in patterns) {
      # --- Revert: Look for files relative to current dir --- 
      # search_path <- file.path(\"etl\", dir) # Removed this modification
      found <- list.files(path = dir, pattern = pattern, full.names = TRUE, recursive = TRUE)
      # Filter out ~$ temporary excel files if pattern accidentally matches
      found <- found[!grepl(\"~/[$]\", found)]
      all_files <- c(all_files, found)
    }
  }
  unique_files <- unique(all_files)
  cat(paste0("  find_data_files found ", length(unique_files), " files for patterns: ", paste(patterns, collapse="; "), "\n"))
  print(unique_files) # Optional: Uncomment to print full paths
  return(unique_files)
}

# Function to safely read and combine delimited files
read_and_combine_delim <- function(files, delim = "|") {
  data_list <- list()
  for (f in files) {
    cat("  Attempting to read file path:", f, "...\n")
    tryCatch({
      # Temporarily treat warnings as errors for debugging this read
      old_warn <- options(warn = 2)
      
      lines_to_skip <- if (grepl("IN495734_SCD_IP_Admissions_Baseline.txt", f, fixed = TRUE)) 2 else 0
      
      df_raw <- read_delim(f, 
                           delim = "|", 
                           quote = "", 
                           skip = lines_to_skip, 
                           col_types = cols(.default = col_character()))
                           
      # Restore default warning behavior
      options(warn = old_warn$warn)
      
      # Apply cleaning and add source file AFTER reading
      df <- df_raw %>% 
        clean_names() %>%
        mutate(source_file = basename(f))
      
      # Minimal cleaning: remove potential UTF-8 BOM if present in column names
      names(df) <- gsub("^\\xef\\xbb\\xbf", "", names(df))
      
      data_list[[f]] <- df
      cat("    Read", nrow(df), "rows.", ncol(df), "columns.\n")
    }, error = function(e) {
      # Restore default warning behavior in case of error too
      options(warn = old_warn$warn) 
      cat("    ERROR reading file:", basename(f), "-", conditionMessage(e), "\n")
    })
  }
  
  if (length(data_list) == 0) {
    cat("    No data loaded from provided files.\n")
    return(tibble()) # Return empty tibble if no files read
  }
  
  # Combine using bind_rows (handles differing columns)
  combined_df <- bind_rows(data_list)
  cat("  Combined total:", nrow(combined_df), "rows from", length(data_list), "files.\n")
  return(combined_df)
}

# Function for upserting into PostgreSQL
# NOTE: This requires the table to have a unique constraint (like a PRIMARY KEY)
# on the columns specified in 'conflict_cols'.
db_upsert <- function(con, schema, table, data, conflict_cols, update_cols = NULL) {
  if (nrow(data) == 0) {
    cat("    No data to upsert for", paste(schema, table, sep = "."), "\n")
    return()
  }
  
  table_id <- Id(schema = schema, table = table)
  temp_table_name <- paste0("temp_", table, "_", digest(Sys.time())) # Unique temp table name
  temp_table_id <- Id(schema = "pg_temp", table = temp_table_name) # Use temp schema
  
  cat("    Upserting", nrow(data), "rows into", paste(schema, table, sep = "."), "using columns:", paste(colnames(data), collapse=", "), "\n")
  
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
  # Example: col_a = EXCLUDED.col_a, col_b = EXCLUDED.col_b (Simplified comment)
  quoted_update_cols <- dbQuoteIdentifier(con, update_cols)
  set_clause <- paste(quoted_update_cols, "= EXCLUDED.", quoted_update_cols, collapse = ", ", sep = "")
  
  # Add special handling for timestamp columns if they exist in update_cols
  # Note: We need to adjust the raw column names ('updated_at', 'created_at')
  # before quoting, or adjust the quoted names. Let's adjust before quoting.
  
  update_cols_final <- update_cols # Start with potentially full list
  
  if ("created_at" %in% update_cols) {
      # Prevent created_at from being updated on conflict
      update_cols_final <- update_cols_final[update_cols_final != "created_at"]
  }
  
  # Rebuild set clause with potentially filtered columns
  quoted_update_cols_final <- dbQuoteIdentifier(con, update_cols_final)
  set_clause_final <- paste(quoted_update_cols_final, "= EXCLUDED.", quoted_update_cols_final, collapse = ", ", sep = "")
  
  # Add special handling for updated_at AFTER building the main clause
  if ("updated_at" %in% update_cols) {
      # Replace the quoted updated_at assignment with NOW()
      # Need to construct the quoted name pattern carefully
      quoted_updated_at <- dbQuoteIdentifier(con, "updated_at")
      pattern_to_replace <- paste0(quoted_updated_at, "\\s*=\\s*EXCLUDED\\.", quoted_updated_at)
      # Ensure it's only replaced if it was part of the set_clause_final
      if (grepl(pattern_to_replace, set_clause_final, perl=TRUE)) {
          set_clause_final <- sub(pattern_to_replace, paste0(quoted_updated_at, " = NOW()"), set_clause_final, perl=TRUE)
      } else if (!("created_at" %in% update_cols)) { 
          # If updated_at was the *only* column and created_at wasn't excluded, handle it
          # This edge case is less likely but possible if update_cols was specifically just "updated_at"
          set_clause_final <- paste0(quoted_updated_at, " = NOW()") 
      }
      # Handle case where updated_at might be the only column *after* created_at was removed
      if (length(update_cols_final) == 0 && "updated_at" %in% update_cols) {
           set_clause_final <- paste0(quoted_updated_at, " = NOW()")
      }

  }

  # Build the final SQL using pre-quoted identifiers and the potentially modified set clause
  upsert_sql <- glue::glue(
    "INSERT INTO {table_id_sql} ({all_cols_sql}) 
     SELECT {all_cols_sql} FROM {temp_table_id_sql} 
     ON CONFLICT ({conflict_cols_sql}) DO UPDATE SET {set_clause_final};"
  )
  
  cat("    Executing UPSERT...")
  dbBegin(con) # Start transaction
  tryCatch({
    result <- dbExecute(con, upsert_sql)
    dbCommit(con) # Commit transaction
    cat(" Done. Affected rows (approx):", result, "\n")
  }, error = function(e) {
    dbRollback(con) # Rollback on error
    cat(" FAILED.\n")
    warning("Upsert failed for table ", table_id, ": ", conditionMessage(e))
    print(upsert_sql) # Print the SQL that failed
  })
  
  # 3. Drop the temporary table (optional, but good practice)
  # dbExecute(con, paste0("DROP TABLE IF EXISTS ", temp_table_id, ";"))
}


# --- Main Script Logic ---

# Establish database connection
con <- do.call(dbConnect, c(list(drv = Postgres()), db_params))

# Set search path (important for functions like NOW())
# dbExecute(con, "SET search_path TO clinical, phi, audit, laboratory, app, public;")

# --- 1. Load, Combine, and Upsert Patients (from Demographics) --- 
cat("\n--- Processing Demographics and Patients ---\n")
demo_files <- find_data_files(file_patterns$demographics, source_dirs)
demographics_all_raw <- read_and_combine_delim(demo_files)

# --- Debugging: Check for unexpected birth_date formats --- 
expected_format_mdy <- "^\\d{1,2}/\\d{1,2}/\\d{4}"
expected_format_ymd <- "^\\d{4}-\\d{1,2}-\\d{1,2}"

unexpected_birth_dates <- demographics_all_raw %>%
  filter(
    !is.na(birth_date) & # Ignore rows where birth_date is already NA
    !grepl(expected_format_mdy, birth_date) & 
    !grepl(expected_format_ymd, birth_date)
  ) %>% 
  pull(birth_date) %>% 
  unique()

if (length(unexpected_birth_dates) > 0) {
  cat("\nWARNING: Found unexpected birth_date formats:\n")
  print(unexpected_birth_dates)
  cat("--------------------------------------------\n")
} else {
  cat("\nINFO: All non-NA birth_date formats match expected patterns (MDY or YMD).\n")
}

# Basic Cleaning & Patient Extraction
patients_intermediate <- demographics_all_raw %>% 
  # Ensure MRN is character and handle potential NAs
  mutate(patient_mrn = as.character(patient_mrn)) %>% 
  filter(!is.na(patient_mrn) & patient_mrn != "") %>% 
  mutate(
    # Attempt to parse birth_date - use flexible parsing
    birth_date = case_when(
      grepl("^\\d{1,2}/\\d{1,2}/\\d{4}", birth_date) ~ mdy(birth_date),
      grepl("^\\d{4}-\\d{1,2}-\\d{1,2}", birth_date) ~ ymd(birth_date),
      TRUE ~ NA_Date_ # Default to NA if format is unexpected
    ),
    # Extract names robustly
    first_name = str_extract(patient_name, "(?<=, ).*") %>% str_trim(),
    last_name = str_extract(patient_name, "^[^,]+") %>% str_trim(),
    sex = toupper(substr(gender, 1, 1)), # Take first char, uppercase
    # Limit length of text fields
    race = substr(race, 1, 100),
    ethnicity = substr(ethnicity, 1, 100),
    # Handle potential variations in sex/gender mapping
    sex = case_when(
        sex %in% c("F", "M", "U") ~ sex,
        tolower(gender) %in% c("female") ~ "F",
        tolower(gender) %in% c("male") ~ "M",
        TRUE ~ "U" # Default to Unknown
    )
  ) %>% 
  select(patient_mrn, first_name, last_name, birth_date, sex, race, ethnicity) %>%
  # Calculate completeness score first
  mutate(completeness_score = rowSums(!is.na(select(., -patient_mrn)))) %>% 
  # Deduplicate based on MRN, prioritize rows with the highest completeness score
  group_by(patient_mrn) %>% 
  slice_max(order_by = completeness_score, n = 1, with_ties = FALSE) %>% 
  ungroup() %>% 
  select(-completeness_score) # Remove the temporary score column
  
cat("  Extracted", nrow(patients_intermediate), "unique patients for upsert.\n")

# Upsert Patients into phi.patients (conflict on patient_mrn)
# Assuming phi.patients has a UNIQUE constraint or PRIMARY KEY on patient_mrn
db_upsert(con, schema = "phi", table = "patients", data = patients_intermediate, 
          conflict_cols = c("patient_mrn"),
          # Update all columns except MRN on conflict
          update_cols = setdiff(colnames(patients_intermediate), "patient_mrn"))

# --- 2. Load, Combine, and Insert Demographics (Clinical) --- 
# Reprocess combined demographics data for the clinical table
demographics_clinical <- demographics_all_raw %>% 
  mutate(
    patient_mrn = as.character(patient_mrn),
    # Reparse birth_date as above
    birth_date = case_when(
      grepl("^\\d{1,2}/\\d{1,2}/\\d{4}", birth_date) ~ mdy(birth_date),
      grepl("^\\d{4}-\\d{1,2}-\\d{1,2}", birth_date) ~ ymd(birth_date),
      TRUE ~ NA_Date_
    ),
    # Standardize Y/N fields (adjust based on observed values)
    is_tobacco_user_yn = case_when(
      tolower(is_tobacco_user_yn) %in% c("y", "yes", "current") ~ "Yes",
      tolower(is_tobacco_user_yn) %in% c("n", "no", "never", "former", "not current") ~ "No", # Added former
      TRUE ~ "Unknown"
    ),
    alcohol_user_yn = case_when(
      tolower(alcohol_user_yn) %in% c("y", "yes", "current", "social drinker") ~ "Yes", # Added social
      tolower(alcohol_user_yn) %in% c("n", "no", "never", "former", "not current") ~ "No",
      TRUE ~ "Unknown"
    ),
    ill_drug_user_yn = case_when(
      tolower(ill_drug_user_yn) %in% c("y", "yes", "current") ~ "Yes",
      tolower(ill_drug_user_yn) %in% c("n", "no", "never", "former", "not current") ~ "No",
      TRUE ~ "Unknown"
    ),
    # Rename source_system to source to match DB
    source = case_when( 
        grepl("April 2025", source_file) ~ "April 2025",
        grepl("Baseline", source_file) ~ "Baseline Jan2011-Jun2024",
        grepl("October Data", source_file) ~ "October 2024",
        TRUE ~ "Unknown"
    )
  ) %>% 
  # Select columns present in the clinical.demographics table
  # Note: Using 'gender' from source, not 'sex' from patient processing
  # Note: Converting birth_date to datetime for DB compatibility
  mutate(birth_date = as_datetime(birth_date)) %>% 
  select(any_of(c("patient_mrn", "birth_date", "age", "gender", # Using gender from source
                 # "language", # Not in DB
                 # "primary_care_provider", # Not in DB
                 # "is_deceased_yn", # Not in DB
                 "is_tobacco_user_yn", "alcohol_user_yn", "ill_drug_user_yn",
                 # "preferred_pharmacy", # Not in DB
                 # "religion", # Not in DB
                 # "marital_status", # Not in DB
                 # "occupation", # Not in DB
                 "source" # Renamed from source_system
                 # "data_source_batch", # Not in DB
                 # "source_file" # Not in DB
                 ))) %>% 
  # Filter to include only patients successfully upserted into phi.patients
  inner_join(patients_intermediate %>% select(patient_mrn), by = "patient_mrn") %>% 
  # Deduplicate: Use MRN + source (derived from source_file) as the key
  distinct(patient_mrn, source, .keep_all = TRUE)
  
cat("  Prepared", nrow(demographics_clinical), "demographics records for insertion.\n")

# Insert Demographics 
dbWriteTable(con, name = Id(schema = "clinical", table = "demographics"), value = demographics_clinical, append = TRUE, row.names = FALSE)
# NOTE: Decided against simple append. Need a unique key for meaningful upsert/deduplication.
# Add a unique ID based on content?
# demographics_clinical <- demographics_clinical %>% 
#   mutate(unique_row_id = map_chr(1:nrow(.), ~ digest(.x, algo = "sha1"))) 
# Let's just append for now, assuming TRUNCATE was the main issue.
# Re-enable TRUNCATE temporarily for this full load?
# Consider adding a unique constraint in the DB: ALTER TABLE clinical.demographics ADD CONSTRAINT unique_demographic_row UNIQUE (patient_mrn, data_source_batch); -- Example


# --- Function to Process Other Clinical Tables ---
process_clinical_table <- function(con, table_name, schema, files, patient_mrns, processing_func = NULL, id_cols = NULL) {
  # Create a display name for logging, handle Id objects
  if (inherits(table_name, "Id")) {
    # Use dbQuoteIdentifier for proper quoting, then paste
    display_table_name <- paste(DBI::dbQuoteIdentifier(con, table_name), collapse=".")
  } else {
    # Assume it's already a simple name or schema.table string
    display_table_name <- table_name 
  }
  
  cat(paste0("\n--- Processing ", display_table_name, " ---\n"))
  raw_data <- read_and_combine_delim(files)
  
  if (nrow(raw_data) == 0) return()
  
  processed_data <- raw_data %>% 
    mutate(patient_mrn = as.character(patient_mrn)) %>% 
    # Keep only records for patients present in phi.patients
    inner_join(patient_mrns, by = "patient_mrn")
  
  # --- Comment out diagnostic print again ---
  # cat("    Columns before processing_func:\n")
  # print(colnames(processed_data))
  # --------------------------------
  
  # Apply table-specific processing if provided
  if (!is.null(processing_func)) {
    processed_data <- processing_func(processed_data)
  }
  
  # Select columns matching the target table (important!) - This needs DB schema check ideally
  # target_cols <- dbListFields(con, Id(schema=schema, table=table_name)) # Get cols from DB
  # processed_data <- processed_data %>% select(any_of(target_cols))
  # For now, assume processing_func selects the right columns or handle manually below
  
  # Deduplication based on provided ID columns
  if (!is.null(id_cols) && all(id_cols %in% names(processed_data))) {
      original_rows <- nrow(processed_data)

      # First, filter out rows where any of the ID columns are NA
      processed_data <- processed_data %>%
          filter(if_all(all_of(id_cols), ~ !is.na(.)))

      # Check if rows remain after filtering NAs
      if(nrow(processed_data) > 0) {
          # Now, group by the ID columns and take the first row within each group
          processed_data <- processed_data %>%
              group_by(across(all_of(id_cols))) %>% 
              # Prioritize rows? For now, just take the first occurrence.
              slice(1) %>% 
              ungroup()
          deduped_rows <- nrow(processed_data)
          cat("    Removed NAs and deduplicated based on:", paste(id_cols, collapse=", "), ". Retaining", deduped_rows, "rows (started with", original_rows, "rows).\n")
      } else {
          cat("    All rows removed after filtering NAs in ID columns:", paste(id_cols, collapse=", "), ".\n")
          deduped_rows <- 0 # Set deduped_rows to 0 if all rows were filtered out
      }
  } else if (!is.null(id_cols)) {
      cat("    WARNING: Cannot deduplicate - ID columns not found:", paste(id_cols[!id_cols %in% names(processed_data)], collapse=", "), "\n")
  }
  
  cat("  Prepared", nrow(processed_data), "records for", display_table_name, "insertion.\n")
  
  # Append data to the table
  if (nrow(processed_data) > 0) {
    dbWriteTable(con, name = Id(schema = schema, table = table_name), value = processed_data, append = TRUE, row.names = FALSE)
  }
}

# Get the list of valid patient MRNs once
valid_patient_mrns <- patients_intermediate %>% select(patient_mrn)

# --- 3. Process IP Admissions --- 
ip_adm_files <- find_data_files(file_patterns$ip_admissions, source_dirs)
process_ip_admissions <- function(df) {
  df %>% mutate(
    adm_date_time = ymd_hms(adm_date_time), # Use ymd_hms for flexibility
    disch_date_time = ymd_hms(disch_date_time),
    # Ensure hsp_account_id is suitable as a key (e.g., numeric or char)
    hsp_account_id = as.character(hsp_account_id),
    # Clean other fields as needed...
    icu_admission_yn = case_when(
      tolower(icu_admission_yn) %in% c("y", "yes") ~ "Yes",
      tolower(icu_admission_yn) %in% c("n", "no") ~ "No",
      TRUE ~ "Unknown"
    )
  ) %>% 
  select(any_of(c("patient_mrn", "hsp_account_id", "adm_date_time", "disch_date_time", 
                 "discharge_department", "discharge_disposition",
                 "icu_admission_yn"
                 # Ensure closing parenthesis for select is correct
                 ))) # End select() call correctly
  # Comment can be placed after the chain is finished
}
process_clinical_table(con, "ip_admissions", "clinical", ip_adm_files, valid_patient_mrns,
                      processing_func = process_ip_admissions, 
                      id_cols = c("patient_mrn", "hsp_account_id", "adm_date_time")) # Use MRN+Account+AdmTime as likely key

# --- 4. Process IP Medications --- 
ip_med_files <- find_data_files(file_patterns$ip_meds, source_dirs)
process_ip_meds <- function(df) {
  df %>% mutate(
    adm_date_time = ymd_hms(adm_date_time),
    disch_date_time = ymd_hms(disch_date_time),
    # order_date_time = ymd_hms(order_date_time), # Column does not exist
    taken_time = ymd_hms(taken_time),
    hsp_account_id = as.character(hsp_account_id),
    # order_med_id = as.character(order_med_id), # Column does not exist
    dosage = as.character(dosage)
    # Clean other fields...
  ) %>% 
  # Need to identify unique key - MRN + Account + Medication + TakenTime?
  # Select relevant columns for ip_medications table - REMOVED non-existent cols
  select(any_of(c("patient_mrn", "hsp_account_id", "adm_date_time", "disch_date_time",
                 # "order_med_id", "order_date_time", 
                 "medication", 
                 # "medication_generic_name",
                 "dosage", "unit", "frequency", 
                 # "route", 
                 "taken_time", 
                 # "prn_yn",
                 "rx_class_name"
                 # "source_file" # Not in DB schema
                 ))) # Adjust cols
}
process_clinical_table(con, "ip_medications", "clinical", ip_med_files, valid_patient_mrns,
                       processing_func = process_ip_meds,
                       id_cols = c("patient_mrn", "hsp_account_id", "medication", "taken_time")) # Updated Key

# --- 5. Process Bone Marrow --- 
bm_files <- find_data_files(file_patterns$bone_marrow, source_dirs)
process_bone_marrow <- function(df) {
  df %>% mutate(
    result_time = ymd_hms(result_time),
    order_id = as.character(order_id) # Example
    # Clean fields...
  ) %>% 
  select(any_of(c("patient_mrn", "hsp_account_id", "order_id", "result_time", 
                 "lab_code", "lab_name"
                 # "result_text", # Not in DB schema
                 # "result_value", # Not in DB schema
                 # "result_unit", # Not in DB schema
                 # "reference_range", # Not in DB schema
                 # "abnormal_flag", # Not in DB schema
                 # "source_file" # Not in DB schema
                 ))) # Adjust cols
}
process_clinical_table(con, "bone_marrow", "clinical", bm_files, valid_patient_mrns,
                       processing_func = process_bone_marrow,
                       id_cols = c("patient_mrn", "order_id", "result_time", "lab_code")) # Example Key

# --- 6. Process OP Visits --- 
op_visit_files <- find_data_files(file_patterns$op_visits, source_dirs)
process_op_visits <- function(df) {
  df %>% mutate(
    visit_date = ymd_hms(visit_date), # Assuming timestamp, adjust if just date
    hsp_account_id = as.character(hsp_account_id),
    # Clean vitals and other fields
    bp_systolic = as.integer(round(as.numeric(bp_systolic))),
    bp_diastolic = as.integer(round(as.numeric(bp_diastolic))),
    weight_lbs = as.numeric(weight_lbs),
    weight_kg = as.numeric(weight_kg),
    # height_inches = as.numeric(height_inches), # Column does not exist
    # temperature_f = as.numeric(temperature_f), # Column does not exist
    # pulse = as.integer(pulse), # Column does not exist
    # respirations = as.integer(respirations), # Column does not exist
    # o2_saturation = as.numeric(o2_saturation) # Column does not exist
  ) %>% 
  select(any_of(c("patient_mrn", "hsp_account_id", "visit_date", 
                 # "pat_enc_csn_id", # Column does not exist, DB has pat_id
                 "pat_id", # Added based on DB schema & source data check
                 "visit_type", "department_name", "department_id", 
                 # "attending_provider", # Column does not exist
                 "bp_systolic", "bp_diastolic", "weight_lbs", "weight_kg", 
                 # "height_inches", # Column does not exist
                 # "temperature_f", "pulse", "respirations", "o2_saturation", # Columns do not exist
                 "current_icd10_list", "dx_name"
                 # "source_file" # Not in DB schema
                 ))) # Adjust cols
}
process_clinical_table(con, "op_visits", "clinical", op_visit_files, valid_patient_mrns,
                       processing_func = process_op_visits,
                       id_cols = c("patient_mrn", "hsp_account_id", "visit_date")) # Updated Key: MRN + Account ID + Visit Date

# --- 7. Process OP Medications --- 
op_med_files <- find_data_files(file_patterns$op_meds, source_dirs)
process_op_meds <- function(df) {
  df %>% mutate(
    visit_date = ymd_hms(visit_date), # Timestamp?
    order_dttm = ymd_hms(order_dttm),
    order_med_id = as.character(order_med_id),
    hsp_account_id = as.character(hsp_account_id)
    # Clean fields...
  ) %>% 
  # Rename medication_generic_name to match DB schema - Removing as source col doesn't exist
  # rename(generic_description = medication_generic_name) %>% 
  select(any_of(c("patient_mrn", "hsp_account_id", "visit_date", "order_med_id", "order_dttm",
                 # "medication_name", # Not in DB schema
                 # "medication_generic_name", # Renamed to generic_description
                 "generic_description", # Target DB column name
                 # "sig", # Not in DB schema
                 # "quantity_ordered", # Not in DB schema
                 # "unit_ordered", # Not in DB schema
                 # "duration", # Not in DB schema
                 # "refills_ordered", # Not in DB schema
                 # "prescribing_provider", # Not in DB schema
                 "rx_status"
                 # "source_file" # Not in DB schema
                 ))) # Adjust cols
}
process_clinical_table(con, "op_medications", "clinical", op_med_files, valid_patient_mrns,
                       processing_func = process_op_meds,
                       id_cols = c("patient_mrn", "order_med_id", "order_dttm")) # MRN + Order ID + Order Time key

# --- 8. Process Labs (Explicitly) --- 
cat("\n--- Processing clinical.\"Labs\" (Explicitly) ---\n")
lab_files <- find_data_files(file_patterns$labs, source_dirs)

# Read each lab file individually and combine
all_labs_data_list <- list()
for(lab_file in lab_files) {
  cat("  Attempting to read labs file:", lab_file, "...\n")
  tryCatch({
    # Use basic read_delim, add quote="" which seemed necessary before
    # No special skipping needed for labs files based on prior checks
    df_raw <- read_delim(lab_file, 
                         delim = "|", 
                         quote = "", 
                         col_types = cols(.default = col_character()))
                         
    # Add source file info
    df <- df_raw %>%
      clean_names() %>%
      mutate(source_file = basename(lab_file))
      
    all_labs_data_list[[lab_file]] <- df
    cat("    Read", nrow(df), "rows from", basename(lab_file), "\n")
    
  }, error = function(e) {
    cat("    ERROR reading labs file:", basename(lab_file), "-", conditionMessage(e), "\n")
    # Optionally, decide whether to skip the file or stop the script
  })
}

if (length(all_labs_data_list) > 0) {
  labs_combined_raw <- bind_rows(all_labs_data_list)
  cat("  Combined total labs data:", nrow(labs_combined_raw), "rows from", length(all_labs_data_list), "files.\n")

  # Apply cleaning and transformations
  labs_processed <- labs_combined_raw %>% 
    mutate(
      patient_mrn = as.character(patient_mrn),
      order_time = ymd_hms(order_time), 
      result_time = ymd_hms(result_time),
      pat_enc_csn_id = as.character(pat_enc_csn_id),
      proc_code = as.character(proc_code),
      component_id = as.character(component_id),
      lab_result_value = as.character(lab_result_value)
    ) %>% 
    select(any_of(c("patient_mrn", "pat_enc_csn_id", "order_time", "proc_code", 
                   "proc_name", "component_id", "lab_component_description",
                   "lab_result_value", "result_time")))

  # Filter out rows with NA in key columns before deduplication
  labs_dedup_key <- c("patient_mrn", "result_time", "component_id")
  original_rows_labs <- nrow(labs_processed)
  labs_processed <- labs_processed %>%
      filter(if_all(all_of(labs_dedup_key), ~ !is.na(.)))
      
  # Deduplicate
  if(nrow(labs_processed) > 0) {
      labs_final <- labs_processed %>%
          group_by(across(all_of(labs_dedup_key))) %>% 
          slice(1) %>% 
          ungroup()
      deduped_rows_labs <- nrow(labs_final)
      cat("    Removed NAs and deduplicated labs based on:", paste(labs_dedup_key, collapse=", "), ". Retaining", deduped_rows_labs, "rows (started with", original_rows_labs, "rows).\n")
  } else {
      cat("    All labs rows removed after filtering NAs in ID columns.\n")
      labs_final <- tibble() # Ensure labs_final is an empty tibble if all rows removed
  }

  # Write to database
  cat("  Prepared", nrow(labs_final), "records for clinical.\"Labs\" insertion.\n")
  if (nrow(labs_final) > 0) {
    dbWriteTable(con, name = Id(schema = "clinical", table = "Labs"), value = labs_final, append = TRUE, row.names = FALSE)
  }

} else {
  cat("  No labs data successfully read to process.\n")
}

# Define processing function for Labs - COMMENTED OUT as logic moved above
# process_labs <- function(df) { ... }

# Call process_clinical_table for labs - COMMENTED OUT
# process_clinical_table(con, Id(schema = "clinical", table = "Labs"), # Use Id() for case-sensitive table
#                        lab_files, valid_patient_mrns,
#                        processing_func = process_labs,
#                        id_cols = c("patient_mrn", "result_time", "component_id")) # Key: MRN + Result Time + Component ID


# --- Final Verification (Optional) ---
cat("\n--- Verifying Final Counts ---\n")
tables_to_check <- c("phi.patients", "clinical.demographics", "clinical.ip_admissions", 
                     "clinical.ip_medications", "clinical.bone_marrow", "clinical.op_visits",
                     "clinical.op_medications", 
                     'clinical."Labs"') # Added Labs table (with quotes for case sensitivity)
for (tbl in tables_to_check) {
  tryCatch({
    count_query <- paste0("SELECT COUNT(*) AS count FROM ", tbl, ";")
    count_result <- dbGetQuery(con, count_query)
    cat(paste0("Final count for ", tbl, ": ", as.integer(count_result$count), "\n"))
  }, error = function(e) {
    cat(paste0("Could not get count for ", tbl, ": ", conditionMessage(e), "\n"))
  })
}

# Disconnect from database
dbDisconnect(con)
cat("\nFull EPIC data import process completed. Data written to tables.\n") 
# Check and install required packages
if (!require("uuid")) {
  install.packages("uuid")
  library(uuid)
}

# Load necessary libraries
library(tidyverse)
library(readxl)
library(RPostgres)
library(lubridate)
library(glue)

# Helper functions
clean_numeric <- function(x) {
  if (all(is.na(x))) return(x)
  result <- rep(NA_real_, length(x))
  
  for (i in seq_along(x)) {
    if (is.na(x[i]) || x[i] == "") {
      result[i] <- NA_real_
    } else {
      # Convert to character and clean
      val <- as.character(x[i])
      val <- gsub("\\s*\\([^)]*\\)", "", val) %>% trimws()
      
      # Check if it's a recognized NA value
      na_values <- c("NA", "n/a", "N/A", "error", "not calibrated", 
                     "DNA only", "no volume", "Not enough", "", "missing")
      if (val %in% na_values) {
        result[i] <- NA_real_
      } else {
        # Try to convert to numeric
        tryCatch({
          num <- as.numeric(val)
          if (!is.na(num)) {
            result[i] <- num
          }
        }, warning = function(w) {
          # Quietly ignore warnings
        }, error = function(e) {
          # Quietly ignore errors
        })
      }
    }
  }
  return(result)
}

clean_date <- function(x) {
  if (all(is.na(x))) return(as.Date(x))
  result <- rep(as.Date(NA), length(x))
  
  for (i in seq_along(x)) {
    if (is.na(x[i]) || x[i] == "" || is.null(x[i])) {
      result[i] <- as.Date(NA)
      next
    }
    
    value <- as.character(x[i])
    value <- gsub("\\s+.*$", "", value) %>% trimws()
    if (value %in% c("NA", "n/a", "N/A", "", "missing")) {
      result[i] <- as.Date(NA)
      next
    }
    
    # Try different date formats
    tryCatch({
      result[i] <- as.Date(parse_date_time(value, orders = c("ymd", "mdy", "dmy")))
    }, error = function(e) {
      result[i] <- as.Date(NA)
      warning(paste("Failed to parse date:", value))
    })
  }
  return(result)
}

clean_boolean <- function(x) {
  if (all(is.na(x))) return(x)
  result <- rep(NA, length(x))
  
  for (i in seq_along(x)) {
    if (is.na(x[i])) {
      result[i] <- NA
    } else if (is.logical(x[i])) {
      result[i] <- x[i]
    } else if (is.numeric(x[i])) {
      result[i] <- x[i] == 1
    } else {
      val <- tolower(trimws(x[i]))
      if (val %in% c("yes", "y", "true", "t", "pass", "1")) {
        result[i] <- TRUE
      } else if (val %in% c("no", "n", "false", "f", "fail", "0")) {
        result[i] <- FALSE
      } else {
        result[i] <- NA
      }
    }
  }
  return(result)
}

# Database connection
con <- dbConnect(
  Postgres(),
  dbname = "scd_research_secure_test",
  host = "localhost",
  port = 5432,
  user = "jonathanwade",
  password = "Bnyj1L930"
)

# Set search path
dbExecute(con, "SET search_path TO laboratory, phi, clinical, audit, app;")

# Start transaction
dbBegin(con)
tryCatch({
  # Clear existing data
  dbExecute(con, "TRUNCATE laboratory.omics_subjects, laboratory.omics_results CASCADE;")
  
  # Verify tables are empty
  empty_check <- dbGetQuery(con, "
    SELECT 'subjects' as table_name, COUNT(*) as count FROM laboratory.omics_subjects
    UNION ALL
    SELECT 'results', COUNT(*) FROM laboratory.omics_results;
  ")
  print("Tables after truncate:")
  print(empty_check)
  
  # Load and prepare subjects data
  cat("\nLoading subjects data...\n")
  subjects_raw <- read_xlsx('MRNs 4-8-25.xlsx')
  
  # Check for column names in the file
  cat("Column names in the MRN file:", paste(names(subjects_raw), collapse=", "), "\n")
  
  # Adjust column selection based on actual column names (they might be different)
  if ("Subject ID" %in% names(subjects_raw) && "MRN" %in% names(subjects_raw)) {
    id_col <- "Subject ID"
    mrn_col <- "MRN"
  } else {
    # Try to find columns that might contain subject ID and MRN
    id_col <- names(subjects_raw)[grep("ID|Id|id", names(subjects_raw))][1]
    mrn_col <- names(subjects_raw)[grep("MRN|Mrn|mrn", names(subjects_raw))][1]
    
    if (is.na(id_col) || is.na(mrn_col)) {
      stop("Cannot identify Subject ID and MRN columns in the Excel file. Please check the column names.")
    } else {
      cat("Using", id_col, "for Subject ID and", mrn_col, "for MRN based on column name patterns.\n")
    }
  }
  
  # Check for duplicate MRNs
  duplicates <- subjects_raw %>%
    mutate(
      subject_id = as.character(.data[[id_col]]),
      patient_mrn = as.character(.data[[mrn_col]])
    ) %>%
    group_by(patient_mrn) %>%
    filter(n() > 1)
  
  if (nrow(duplicates) > 0) {
    cat("\nFound duplicate MRNs (keeping first occurrence):\n")
    print(duplicates)
  }
  
  # Prepare subjects data
  subjects_data <- subjects_raw %>%
    mutate(
      subject_id = as.character(.data[[id_col]]),
      patient_mrn = as.character(.data[[mrn_col]]),
      project = 'OMI'
    ) %>%
    select(subject_id, patient_mrn, project) %>%
    # Filter out NULL or empty values
    filter(!is.na(subject_id), !is.na(patient_mrn), 
           subject_id != "", patient_mrn != "") %>%
    distinct(patient_mrn, .keep_all = TRUE)
  
  # Check which patients exist
  existing_patients <- dbGetQuery(con, glue("
    SELECT DISTINCT patient_mrn 
    FROM phi.patients 
    WHERE patient_mrn IN ('", paste(subjects_data$patient_mrn, collapse = "','"), "')
  "))
  
  # Identify missing patients
  missing_patients <- subjects_data %>%
    filter(!patient_mrn %in% existing_patients$patient_mrn) %>%
    select(patient_mrn)
  
  # Create missing patient records
  if (nrow(missing_patients) > 0) {
    cat("\nCreating", nrow(missing_patients), "missing patient records...\n")
    
    # Add default values for required fields
    missing_patients <- missing_patients %>%
      mutate(
        first_name = NA_character_,
        last_name = NA_character_,
        birth_date = as.Date(NA),
        sex = NA_character_,
        race = "Black or African American",
        ethnicity = "Not Hispanic or Latino",
        created_at = now(),
        updated_at = now(),
        middle_name = NA_character_
      )
    
    # Insert missing patients
    dbWriteTable(
      con,
      name = Id(schema = "phi", table = "patients"),
      value = missing_patients,
      append = TRUE
    )
  }
  
  # Use all subjects
  subjects_filtered <- subjects_data
  
  cat("\nSubjects summary:\n")
  cat("Total subjects with valid IDs and MRNs:", nrow(subjects_data), "\n")
  cat("Existing patients:", nrow(existing_patients), "\n")
  cat("Created patients:", nrow(missing_patients), "\n")
  cat("Subjects being imported:", nrow(subjects_filtered), "\n")
  
  # Insert subjects
  dbWriteTable(
    con, 
    name = Id(schema = "laboratory", table = "omics_subjects"),
    value = subjects_filtered,
    append = TRUE
  )
  
  # Load and prepare results data
  cat("\nLoading results data...\n")
  results_raw <- read_csv('Omics_reformatted_2025-04-08.csv',
                         col_types = cols(.default = col_character()))
  
  # Clean and transform results data
  cat("\nExamining results data columns...\n")
  cat("Results data columns:", paste(names(results_raw), collapse=", "), "\n")
  
  # First check if any columns need cleaning
  date_columns <- grep("^date_", names(results_raw), value = TRUE)
  if (length(date_columns) > 0) {
    cat("\nFound date columns:", paste(date_columns, collapse=", "), "\n")
  } else {
    cat("\nNo date columns found with 'date_' prefix.\n")
  }
  
  boolean_columns <- grep("^qc_pass_", names(results_raw), value = TRUE)
  if (length(boolean_columns) > 0) {
    cat("\nFound boolean columns:", paste(boolean_columns, collapse=", "), "\n")
  } else {
    cat("\nNo boolean columns found with 'qc_pass_' prefix.\n")
  }
  
  # Begin the data cleaning process more carefully
  results_data <- results_raw %>%
    # Ensure all column names are lowercase
    rename_with(tolower)
  
  # Handle dates with more care
  date_columns <- grep("^date_", names(results_data), value = TRUE)
  for (col in date_columns) {
    cat("Cleaning date column:", col, "\n")
    results_data[[col]] <- clean_date(results_data[[col]])
  }
  
  # Handle boolean columns with more care
  boolean_columns <- grep("^qc_pass_", names(results_data), value = TRUE)
  for (col in boolean_columns) {
    cat("Cleaning boolean column:", col, "\n")
    results_data[[col]] <- clean_boolean(results_data[[col]])
  }
  
  # Handle numeric columns with more care
  numeric_pattern <- "concentration|number|value|vol|purity|percent|min|max|delta|pos|rbc|hb|hct|mcv|mch|mchc|rdw|plt|wbc"
  numeric_columns <- grep(numeric_pattern, names(results_data), value = TRUE)
  cat("\nCleaning", length(numeric_columns), "numeric columns...\n")
  for (col in numeric_columns) {
    results_data[[col]] <- clean_numeric(results_data[[col]])
  }
  
  # Format subject_id and additional transformations
  results_data <- results_data %>%
    mutate(
      subject_id = if_else(!is.na(subject_id) & nchar(subject_id) == 4, paste0("OMI-", subject_id), subject_id),
      sample_number = as.integer(sample_number)
    )
  
  # Check if subject_id exists in results data
  if (!"subject_id" %in% names(results_data)) {
    stop("Column 'subject_id' not found in results data. Available columns: ", 
         paste(names(results_data), collapse=", "))
  }
  
  # Check if any subject_ids match our filtered subjects
  matching_subjects <- results_data$subject_id[results_data$subject_id %in% subjects_filtered$subject_id]
  cat("\nFound", length(unique(matching_subjects)), "matching subject IDs in results data\n")
  
  if (length(matching_subjects) == 0) {
    cat("\nWARNING: No matching subject IDs found between results and subjects data!\n")
    cat("Results subject ID examples:", paste(head(results_data$subject_id), collapse=", "), "...\n")
    cat("Filtered subjects ID examples:", paste(head(subjects_filtered$subject_id), collapse=", "), "...\n")
  }
  
  # Continue with filtering and validation
  results_data <- results_data %>%
    # Filter for valid subjects
    filter(subject_id %in% subjects_filtered$subject_id)
  
  # Only filter for date_of_collection if the column exists
  if ("date_of_collection" %in% names(results_data)) {
    results_data <- results_data %>%
      filter(!is.na(date_of_collection))
  }
  
  # Validate numeric ranges more safely
  results_data <- results_data %>%
    mutate(
      # Make sure all these fields are numeric before applying the validation
      # For each field, check if it's numeric, then apply validation or use NA if it's not
      rbc_advia = case_when(
        is.numeric(rbc_advia) & !is.na(rbc_advia) & rbc_advia > 0 & rbc_advia < 10 ~ as.numeric(rbc_advia),
        TRUE ~ NA_real_
      ),
      hb_advia = case_when(
        is.numeric(hb_advia) & !is.na(hb_advia) & hb_advia > 0 & hb_advia < 25 ~ as.numeric(hb_advia),
        TRUE ~ NA_real_
      ),
      hct_advia = case_when(
        is.numeric(hct_advia) & !is.na(hct_advia) & hct_advia > 0 & hct_advia < 100 ~ as.numeric(hct_advia),
        TRUE ~ NA_real_
      ),
      mcv_advia = case_when(
        is.numeric(mcv_advia) & !is.na(mcv_advia) & mcv_advia > 50 & mcv_advia < 150 ~ as.numeric(mcv_advia),
        TRUE ~ NA_real_
      ),
      mch_advia = case_when(
        is.numeric(mch_advia) & !is.na(mch_advia) & mch_advia > 15 & mch_advia < 50 ~ as.numeric(mch_advia),
        TRUE ~ NA_real_
      ),
      mchc_advia = case_when(
        is.numeric(mchc_advia) & !is.na(mchc_advia) & mchc_advia > 20 & mchc_advia < 50 ~ as.numeric(mchc_advia),
        TRUE ~ NA_real_
      ),
      rdw_advia = case_when(
        is.numeric(rdw_advia) & !is.na(rdw_advia) & rdw_advia > 0 & rdw_advia < 30 ~ as.numeric(rdw_advia),
        TRUE ~ NA_real_
      ),
      plt_advia = case_when(
        is.numeric(plt_advia) & !is.na(plt_advia) & plt_advia > 0 & plt_advia < 1000 ~ as.numeric(plt_advia),
        TRUE ~ NA_real_
      ),
      wbc_advia = case_when(
        is.numeric(wbc_advia) & !is.na(wbc_advia) & wbc_advia > 0 & wbc_advia < 100 ~ as.numeric(wbc_advia),
        TRUE ~ NA_real_
      ),
      retic_advia = case_when(
        is.numeric(retic_advia) & !is.na(retic_advia) & retic_advia > 0 & retic_advia < 30 ~ as.numeric(retic_advia),
        TRUE ~ NA_real_
      )
    )
  
  # Make sample_id unique by adding row number when duplicates exist
  results_data <- results_data %>%
    group_by(sample_id) %>%
    mutate(
      sample_id_count = n(),
      sample_id_idx = row_number(),
      sample_id = if_else(sample_id_count > 1, 
                         paste0(sample_id, "_", sample_id_idx), 
                         sample_id)
    ) %>%
    ungroup() %>%
    select(-sample_id_count, -sample_id_idx)
  
  # Add a unique ID to each record using subject_id, sample_number, and a UUID suffix
  results_data <- results_data %>%
    rowwise() %>%
    mutate(
      id = paste0(subject_id, "_", sample_number, "_", substr(UUIDgenerate(), 1, 8))
    ) %>%
    ungroup()
  
  # Insert results
  cat("\nInserting", nrow(results_data), "results records...\n")
  dbWriteTable(
    con,
    name = Id(schema = "laboratory", table = "omics_results"),
    value = results_data,
    append = TRUE
  )
  
  # Verify final counts
  final_counts <- dbGetQuery(con, "
    SELECT 'subjects' as table_name, COUNT(*) as count FROM laboratory.omics_subjects
    UNION ALL
    SELECT 'results', COUNT(*) FROM laboratory.omics_results;
  ")
  
  cat("\nFinal record counts:\n")
  print(final_counts)
  
  # Commit transaction
  dbCommit(con)
  cat("\nData import completed successfully!\n")
  
}, error = function(e) {
  # Rollback on error
  dbRollback(con)
  cat("\nError during import:", conditionMessage(e), "\n")
  cat("Transaction rolled back.\n")
}, finally = {
  # Close connection
  dbDisconnect(con)
})

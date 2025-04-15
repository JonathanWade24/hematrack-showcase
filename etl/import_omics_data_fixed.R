#!/usr/bin/env Rscript

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
  dbname = "scd_research_secure",  # Using production database
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
    filter(!is.na(subject_id), !is.na(patient_mrn), 
           subject_id != "", patient_mrn != "") %>%
    distinct(patient_mrn, .keep_all = TRUE)
  
  # Check which patients exist
  existing_patients <- dbGetQuery(con, glue("
    SELECT DISTINCT patient_mrn 
    FROM phi.patients 
    WHERE patient_mrn IN ('", paste(subjects_data$patient_mrn, collapse = "','"), "')
  "))
  
  # Filter for only patients that exist in the database
  subjects_filtered <- subjects_data %>%
    filter(patient_mrn %in% existing_patients$patient_mrn)
  
  # Get existing subjects to determine what to update vs. insert
  existing_subjects <- dbGetQuery(con, "SELECT subject_id, patient_mrn, project FROM laboratory.omics_subjects")
  
  # Separate subjects for insert and update
  subjects_to_insert <- subjects_filtered %>%
    anti_join(existing_subjects, by = "subject_id")
  
  subjects_to_update <- subjects_filtered %>%
    inner_join(existing_subjects, by = "subject_id") %>%
    filter(patient_mrn.x != patient_mrn.y | project.x != project.y) %>%
    select(subject_id, patient_mrn = patient_mrn.x, project = project.x)
  
  cat("\nSubjects summary:\n")
  cat("Total subjects with valid IDs and MRNs:", nrow(subjects_data), "\n")
  cat("Subjects with existing patients:", nrow(subjects_filtered), "\n")
  cat("Subjects to insert:", nrow(subjects_to_insert), "\n")
  cat("Subjects to update:", nrow(subjects_to_update), "\n")
  
  # Insert new subjects
  if (nrow(subjects_to_insert) > 0) {
    dbWriteTable(
      con, 
      name = Id(schema = "laboratory", table = "omics_subjects"),
      value = subjects_to_insert,
      append = TRUE
    )
    cat("Inserted", nrow(subjects_to_insert), "new subjects\n")
  }
  
  # Update existing subjects
  if (nrow(subjects_to_update) > 0) {
    for (i in 1:nrow(subjects_to_update)) {
      update_query <- sprintf(
        "UPDATE laboratory.omics_subjects SET patient_mrn = '%s', project = '%s', updated_at = NOW() WHERE subject_id = '%s'",
        subjects_to_update$patient_mrn[i],
        subjects_to_update$project[i],
        subjects_to_update$subject_id[i]
      )
      dbExecute(con, update_query)
    }
    cat("Updated", nrow(subjects_to_update), "existing subjects\n")
  }
  
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
  
  # Get new list of all subjects after inserts/updates
  all_subjects <- dbGetQuery(con, "SELECT subject_id FROM laboratory.omics_subjects")
  
  # Check if any subject_ids match our subjects
  matching_subjects <- results_data$subject_id[results_data$subject_id %in% all_subjects$subject_id]
  cat("\nFound", length(unique(matching_subjects)), "matching subject IDs in results data\n")
  
  if (length(matching_subjects) == 0) {
    cat("\nWARNING: No matching subject IDs found between results and subjects data!\n")
    cat("Results subject ID examples:", paste(head(results_data$subject_id), collapse=", "), "...\n")
    cat("Subject ID examples:", paste(head(all_subjects$subject_id), collapse=", "), "...\n")
  }
  
  # Continue with filtering and validation
  results_data <- results_data %>%
    # Filter for valid subjects
    filter(subject_id %in% all_subjects$subject_id)
  
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
  
  # Generate sample_id from subject_id and sample_number if not already provided
  results_data <- results_data %>%
    mutate(
      sample_id = if_else(is.na(sample_id) | sample_id == "", 
                          paste0(subject_id, "_", sample_number), 
                          sample_id)
    )
  
  # Handle duplicate sample_ids by adding a suffix
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
  
  # Get existing results based on subject_id and sample_number (which must be unique in the DB)
  existing_results <- dbGetQuery(con, "
    SELECT id, subject_id, sample_number, sample_id 
    FROM laboratory.omics_results
  ")
  
  # Check for potential duplicates before processing
  cat("\nChecking for potential duplicates in the database...\n")
  potential_duplicates <- results_data %>%
    inner_join(existing_results, by = c("subject_id", "sample_number"))
  
  # Rename columns in potential_duplicates to avoid confusion
  if(nrow(potential_duplicates) > 0) {
    cat("Found", nrow(potential_duplicates), "potential duplicate records based on subject_id and sample_number\n")
    
    # First check what columns actually exist
    pd_cols <- names(potential_duplicates)
    cat("Columns in potential_duplicates:", paste(head(pd_cols, 10), collapse=", "), "...\n")
    
    # Only rename columns if they exist with the expected suffix
    if("sample_id.x" %in% pd_cols && "sample_id.y" %in% pd_cols) {
      potential_duplicates <- potential_duplicates %>%
        rename(
          new_sample_id = sample_id.x,
          existing_sample_id = sample_id.y
        )
      print(head(potential_duplicates[, c("subject_id", "sample_number", "id", "new_sample_id", "existing_sample_id")]))
    } else {
      # Safely show what we can
      show_cols <- intersect(c("subject_id", "sample_number", "id", "sample_id"), pd_cols)
      print(head(potential_duplicates[, show_cols]))
    }
  }
  
  # Get a list of all existing IDs to check for UUID collisions
  all_existing_ids <- dbGetQuery(con, "SELECT id FROM laboratory.omics_results")$id
  
  # Join with existing data to identify records for insert vs update
  # Rename any conflicting columns from the existing_results table
  results_with_ids <- results_data %>%
    left_join(existing_results, by = c("subject_id", "sample_number"))
  
  # Print column names to debug
  cat("\nColumns in results_with_ids after join:", paste(head(names(results_with_ids), 10), collapse=", "), "...\n")
  
  # Ensure proper column naming for safe filtering
  if("id" %in% names(results_with_ids)) {
    # Use direct filtering if 'id' exists
    results_new <- results_with_ids %>%
      filter(is.na(id)) %>%
      select(-id)
  } else if("id.y" %in% names(results_with_ids)) {
    # Handle case where join results in .y suffix
    results_with_ids <- results_with_ids %>%
      rename(db_id = id.y)
    
    if("id.x" %in% names(results_with_ids)) {
      results_with_ids <- results_with_ids %>%
        rename(id = id.x)
    }
    
    # Filter using the renamed column
    results_new <- results_with_ids %>%
      filter(is.na(db_id)) %>%
      select(-starts_with("db_"), -ends_with(".y"))
  } else {
    # Fall back to safest approach if column naming is unexpected
    cat("\nWARNING: Unexpected column naming after join. Using a different approach.\n")
    results_new <- results_data %>%
      anti_join(existing_results, by = c("subject_id", "sample_number"))
  }
  
  # Initialize vectors for new IDs and timestamps
  new_ids <- character(nrow(results_new))
  
  # Generate unique UUIDs for each new record, ensuring no collisions
  if(nrow(results_new) > 0) {
    for(i in 1:nrow(results_new)) {
      # Keep generating UUIDs until we find one that doesn't exist
      repeat {
        new_id <- UUIDgenerate()
        if(!(new_id %in% all_existing_ids) && !(new_id %in% new_ids[1:(i-1)])) {
          new_ids[i] <- new_id
          break
        }
      }
    }
    
    # Add generated IDs and timestamps to the data
    results_new <- results_new %>%
      mutate(
        id = new_ids,
        created_at = Sys.time(),
        updated_at = Sys.time()
      )
    
    # Add the new IDs to our tracking list to prevent duplicates even within this batch
    all_existing_ids <- c(all_existing_ids, new_ids)
  }
  
  # Handle existing records similarly with safer column detection
  if("id" %in% names(results_with_ids)) {
    results_existing <- results_with_ids %>%
      filter(!is.na(id)) %>%
      mutate(updated_at = Sys.time())
  } else if("id.y" %in% names(results_with_ids)) {
    results_existing <- results_with_ids %>%
      filter(!is.na(id.y)) %>%
      mutate(
        id = id.y,
        updated_at = Sys.time()
      ) %>%
      select(-ends_with(".y"))
  } else {
    # Fall back to safest approach if column naming is unexpected
    cat("\nWARNING: Unexpected column naming after join. Using a different approach for existing records.\n")
    results_existing <- results_data %>%
      inner_join(existing_results, by = c("subject_id", "sample_number")) %>%
      mutate(
        id = id.y,
        updated_at = Sys.time()
      ) %>%
      select(-ends_with(".y"))
  }
  
  cat("\nResults summary:\n")
  cat("Total results after filtering:", nrow(results_data), "\n")
  cat("New results to insert:", nrow(results_new), "\n")
  cat("Existing results to update:", nrow(results_existing), "\n")
  
  # Insert new results
  if (nrow(results_new) > 0) {
    cat("\nInserting", nrow(results_new), "new results records...\n")
    
    # Get actual column names in the target table
    target_cols <- dbGetQuery(con, "
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'laboratory' AND table_name = 'omics_results'
      ORDER BY ordinal_position;
    ")
    
    # Print the required columns and their nullability
    required_cols <- dbGetQuery(con, "
      SELECT column_name, is_nullable 
      FROM information_schema.columns
      WHERE table_schema = 'laboratory' AND table_name = 'omics_results'
      AND is_nullable = 'NO'
      ORDER BY ordinal_position;
    ")
    
    cat("\nRequired non-nullable columns in the database:\n")
    print(required_cols)
    
    # Handle the case where sample_id might be in sample_id.x after the join
    if(!("sample_id" %in% names(results_new)) && "sample_id.x" %in% names(results_new)) {
      results_new <- results_new %>%
        mutate(sample_id = sample_id.x) %>%
        select(-sample_id.x)
      cat("Fixed sample_id column from sample_id.x\n")
    }
    
    # Ensure all required non-nullable columns have values
    if("sample_id" %in% names(results_new)) {
      # Check for any NULL or NA values
      null_sample_ids <- sum(is.na(results_new$sample_id) | results_new$sample_id == "")
      if(null_sample_ids > 0) {
        cat("WARNING:", null_sample_ids, "rows have null sample_id values. Generating values based on subject_id and sample_number.\n")
        
        # Generate sample_id for rows with missing values
        results_new <- results_new %>%
          mutate(
            sample_id = ifelse(is.na(sample_id) | sample_id == "", 
                              paste0(subject_id, "_", sample_number), 
                              sample_id)
          )
      }
    } else {
      # If sample_id column doesn't exist at all, create it
      cat("WARNING: sample_id column is missing. Generating values based on subject_id and sample_number.\n")
      results_new <- results_new %>%
        mutate(
          sample_id = paste0(subject_id, "_", sample_number)
        )
    }
    
    # Ensure we only have columns that exist in the target table
    valid_cols <- intersect(names(results_new), target_cols$column_name)
    extra_cols <- setdiff(names(results_new), target_cols$column_name)
    
    if(length(extra_cols) > 0) {
      cat("Removing extra columns that don't exist in the target table:", paste(extra_cols, collapse=", "), "\n")
      # Remove extra columns that aren't in the target table
      results_new <- results_new %>% select(all_of(valid_cols))
    }
    
    # Double-check for any remaining required columns that might be null
    for(col in required_cols$column_name) {
      if(col %in% names(results_new)) {
        null_count <- sum(is.na(results_new[[col]]))
        if(null_count > 0) {
          cat("WARNING: Column", col, "has", null_count, "NULL values but is required by the database schema.\n")
        }
      } else if(col != "id" && col != "created_at" && col != "updated_at") {
        # Skip id, created_at, and updated_at as we handle those separately
        cat("ERROR: Required column", col, "is missing from the data.\n")
      }
    }
    
    # Double-check for any remaining duplicates before inserting
    if(any(duplicated(results_new$id))) {
      stop("ERROR: Duplicate UUIDs detected in new records. This should not happen with our prevention logic.")
    }
    
    # Double-check that none of the new IDs exist in the database
    existing_id_check <- dbGetQuery(con, 
      sprintf("SELECT id FROM laboratory.omics_results WHERE id IN ('%s')",
              paste(results_new$id, collapse = "','")))
    
    if(nrow(existing_id_check) > 0) {
      stop("ERROR: Some generated UUIDs already exist in the database. Aborting to prevent data corruption.")
    }
    
    # If all checks pass, insert the records
    dbWriteTable(
      con,
      name = Id(schema = "laboratory", table = "omics_results"),
      value = results_new,
      append = TRUE
    )
  }
  
  # Update existing results
  if (nrow(results_existing) > 0) {
    cat("\nUpdating", nrow(results_existing), "existing results records...\n")
    
    # Handle the case where sample_id might be in sample_id.x after the join
    if(!("sample_id" %in% names(results_existing)) && "sample_id.x" %in% names(results_existing)) {
      results_existing <- results_existing %>%
        mutate(sample_id = sample_id.x) %>%
        select(-sample_id.x)
      cat("Fixed sample_id column from sample_id.x for existing records\n")
    }
    
    # We'll update one at a time since potentially many columns could change
    for (i in 1:nrow(results_existing)) {
      row <- results_existing[i, ]
      id_val <- row$id
      
      # Create SET clause for all columns except id, subject_id, and sample_number
      # (which are used to identify the record)
      columns_to_update <- setdiff(names(row), c("id", "subject_id", "sample_number"))
      
      # Build SET clauses for each column
      set_clauses <- c()
      for (col in columns_to_update) {
        val <- row[[col]]
        
        if (is.na(val)) {
          # Skip updating to NULL for required columns like sample_id
          if (col %in% required_cols$column_name && required_cols$is_nullable[required_cols$column_name == col] == "NO") {
            cat("Skipping update of required column", col, "to NULL for record", id_val, "\n")
            next
          }
          set_clauses <- c(set_clauses, sprintf("%s = NULL", col))
        } else if (is.character(val)) {
          # Escape single quotes in text values
          val <- gsub("'", "''", val)
          set_clauses <- c(set_clauses, sprintf("%s = '%s'", col, val))
        } else if (is.numeric(val)) {
          set_clauses <- c(set_clauses, sprintf("%s = %s", col, val))
        } else if (inherits(val, "Date")) {
          set_clauses <- c(set_clauses, sprintf("%s = '%s'", col, format(val, "%Y-%m-%d")))
        } else if (is.logical(val)) {
          set_clauses <- c(set_clauses, sprintf("%s = %s", col, ifelse(val, "TRUE", "FALSE")))
        }
      }
      
      # Only proceed if we have columns to update
      if (length(set_clauses) > 0) {
        # Add updated_at timestamp
        set_clauses <- c(set_clauses, "updated_at = NOW()")
        
        # Combine all SET clauses
        set_clause <- paste(set_clauses, collapse = ", ")
        
        # Execute update
        update_query <- sprintf(
          "UPDATE laboratory.omics_results SET %s WHERE id = '%s'",
          set_clause,
          id_val
        )
        
        tryCatch({
          dbExecute(con, update_query)
        }, error = function(e) {
          cat(sprintf("Error updating record %d (ID: %s): %s\n", i, id_val, conditionMessage(e)))
        })
      } else {
        cat(sprintf("No columns to update for record %d (ID: %s)\n", i, id_val))
      }
    }
  }
  
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
  cat("\nData update completed successfully!\n")
  
}, error = function(e) {
  # Rollback on error
  dbRollback(con)
  cat("\nError during import:", conditionMessage(e), "\n")
  cat("Transaction rolled back.\n")
}, finally = {
  # Close connection
  dbDisconnect(con)
}) 
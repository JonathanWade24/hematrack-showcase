#!/usr/bin/env Rscript

# Load necessary libraries
library(tidyverse)
library(readxl)
library(RPostgres)
library(lubridate)
library(uuid)
library(glue)

# --- Load MRN Mapping ---
cat("\n==== LOADING MRN MAPPING ====\n")
mrn_mapping_raw <- read_csv("MRNs 4-8-25.csv", 
                            col_types = cols(.default = col_character()))

mrn_mapping <- mrn_mapping_raw %>% 
  rename_with(tolower) %>% 
  rename(subject_id = `subject id`, patient_mrn = `grady mrn`) %>% 
  mutate(subject_id = trimws(subject_id), patient_mrn = trimws(patient_mrn)) %>% 
  filter(!is.na(subject_id) & !is.na(patient_mrn)) # Remove rows with missing crucial info

cat("Loaded", nrow(mrn_mapping), "subject ID to MRN mappings.\n")

# Enhanced date cleaning function
clean_date <- function(x) {
  if (all(is.na(x))) return(as.Date(x))
  result <- rep(as.Date(NA), length(x))
  
  for (i in seq_along(x)) {
    if (is.na(x[i]) || x[i] == "" || is.null(x[i])) {
      result[i] <- as.Date(NA)
      next
    }
    
    value <- as.character(x[i])
    
    # Skip obvious non-date values
    if (value %in% c("NA", "n/a", "N/A", "", "missing")) {
      result[i] <- as.Date(NA)
      next
    }
    
    # Special handling for Excel date numbers (stored as days since 1900-01-01)
    if (grepl("^\\d{5}$", value)) {
      tryCatch({
        # Excel date number - convert to actual date
        result[i] <- as.Date(as.numeric(value), origin = "1899-12-30")
      }, error = function(e) {
        result[i] <- as.Date(NA)
      })
      next
    }
    
    # Try different date formats
    tryCatch({
      result[i] <- as.Date(parse_date_time(value, orders = c("ymd", "mdy", "dmy")))
    }, error = function(e) {
      result[i] <- as.Date(NA)
    })
  }
  return(result)
}

# Enhanced numeric cleaning function
clean_numeric <- function(x) {
  if (all(is.na(x))) return(x)
  result <- rep(NA_real_, length(x))
  
  for (i in seq_along(x)) {
    if (is.na(x[i]) || x[i] == "") {
      result[i] <- NA_real_
    } else {
      # Convert to character and clean
      val <- as.character(x[i])
      # Remove parentheses and trim
      val <- gsub("\\s*\\([^)]*\\)", "", val) %>% trimws()
      
      # Check if it's a recognized NA value
      na_values <- c("NA", "n/a", "N/A", "error", "not calibrated", 
                     "DNA only", "no volume", "Not enough", "", "missing")
      if (val %in% na_values) {
        result[i] <- NA_real_
      } else {
        # Handle scientific notation with spaces (e.g., "5.4 e6")
        val <- gsub("\\s+e\\s*", "e", val, ignore.case = TRUE)
        
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

# Helper function to print data structure
debug_structure <- function(df, label) {
  cat("\n==== DEBUG:", label, "====\n")
  cat("Dimensions:", nrow(df), "rows,", ncol(df), "columns\n")
  
  # Check for key columns
  for (col in c("id", "subject_id", "sample_id", "sample_number")) {
    if (col %in% names(df)) {
      nulls <- sum(is.na(df[[col]]) | df[[col]] == "")
      cat(col, "column:", nulls, "null values out of", nrow(df), "\n")
    } else {
      cat(col, "column: NOT PRESENT\n")
    }
  }
}

# Function to truncate character fields based on database column sizes
truncate_to_column_size <- function(df, column_info) {
  for (i in 1:nrow(column_info)) {
    col_name <- column_info$column_name[i]
    data_type <- column_info$data_type[i]
    
    # Only process character columns with size limitation
    if (grepl("character varying", data_type) && col_name %in% names(df)) {
      # Extract the size limitation
      size_match <- regexpr("\\((\\d+)\\)", data_type)
      if (size_match > 0) {
        size_text <- regmatches(data_type, size_match)
        size <- as.numeric(gsub("[\\(\\)]", "", size_text))
        
        # Truncate the column if it's character type
        if (is.character(df[[col_name]])) {
          # Check if truncation is needed
          needs_truncation <- any(nchar(df[[col_name]], na.rm = TRUE) > size)
          if (needs_truncation) {
            cat("Truncating column", col_name, "to maximum length of", size, "characters\n")
            df[[col_name]] <- substr(df[[col_name]], 1, size)
          } 
        }
      }
    }
  }
  return(df)
}

# Database connection
con <- dbConnect(
  Postgres(),
  dbname = "scd_research_secure",
  host = "localhost",
  port = 5432,
  user = "jonathanwade",
  password = "Bnyj1L930"
)

# Set search path
dbExecute(con, "SET search_path TO laboratory, phi, clinical, audit, app;")

# Get database table structure
cat("\n==== DATABASE TABLE STRUCTURE ====\n")
table_structure <- dbGetQuery(con, "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'laboratory' AND table_name = 'omics_results'
  ORDER BY ordinal_position;
")

# Get column size information
column_size_info <- dbGetQuery(con, "
  SELECT column_name, data_type, character_maximum_length
  FROM information_schema.columns
  WHERE table_schema = 'laboratory' AND table_name = 'omics_results'
  ORDER BY ordinal_position;
")

# Print character columns with their size limits
char_columns <- column_size_info %>%
  filter(grepl("character", data_type)) %>%
  arrange(character_maximum_length)

cat("\nCharacter columns with size limits:\n")
print(char_columns)

# Get required columns
required_cols <- table_structure %>%
  filter(is_nullable == 'NO') %>%
  pull(column_name)
cat("\nRequired columns:", paste(required_cols, collapse=", "), "\n")

# Get date columns
date_cols <- table_structure %>%
  filter(data_type == 'date') %>%
  pull(column_name)
cat("\nDate columns:", paste(date_cols, collapse=", "), "\n")

# Get numeric columns
numeric_cols <- table_structure %>%
  filter(data_type %in% c('numeric', 'integer')) %>%
  pull(column_name)
cat("\nNumeric columns:", length(numeric_cols), "columns\n")

# Load results data
cat("\n==== LOADING RESULTS DATA ====\n")
results_raw <- read_csv('Omics_reformatted_2025-04-14.csv',
                       col_types = cols(.default = col_character()))

# Clean and transform results data
results_data <- results_raw %>%
  # Ensure all column names are lowercase
  rename_with(tolower) %>%
  # Format subject_id correctly
  mutate(
    # Ensure subject_id is character
    subject_id = as.character(subject_id),
    # Add OMI- prefix and zero-padding if needed
    subject_id = case_when(
      # Already correctly formatted
      !is.na(subject_id) & startsWith(subject_id, "OMI-") ~ subject_id,
      # Numeric or shorter string - format it
      !is.na(subject_id) ~ sprintf("OMI-%04d", as.integer(subject_id)),
      # Handle NA cases
      TRUE ~ NA_character_
    ),
    # Ensure sample_number is integer for consistent joining
    sample_number = as.integer(sample_number)
    # No need to ensure patient_mrn is char here, it comes from mapping file
  )

# Fix date columns
for (col in intersect(names(results_data), date_cols)) {
  cat("Cleaning date column:", col, "\n")
  results_data[[col]] <- clean_date(results_data[[col]])
}

# Fix numeric columns
for (col in intersect(names(results_data), numeric_cols)) {
  cat("Cleaning numeric column:", col, "\n")
  results_data[[col]] <- clean_numeric(results_data[[col]])
}

# Truncate character columns to match database column limits
results_data <- truncate_to_column_size(results_data, table_structure)

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

debug_structure(results_data, "Cleaned Results")

# Get existing results from omics_results table
cat("\n==== GETTING EXISTING OMICS RESULTS ====\n")
existing_omics_results <- dbGetQuery(con, "
  SELECT id, subject_id, sample_number, sample_id 
  FROM laboratory.omics_results
")
debug_structure(existing_omics_results, "Existing Omics Results")

# Separate new vs existing based on omics_results table
# Identify new records without joining to avoid column name conflicts
new_records <- anti_join(
  results_data, 
  existing_omics_results, 
  by = c("subject_id", "sample_number")
)
cat("\nIdentified", nrow(new_records), "new records for omics_results insertion\n")

# Identify existing records for potential update
existing_records_for_update <- inner_join(
    results_data, 
    existing_omics_results, 
    by = c("subject_id", "sample_number")
) %>%
  rename(db_id = id, db_sample_id = sample_id.y) %>%
  rename(sample_id = sample_id.x)  # Keep our current sample_id

cat("\nIdentified", nrow(existing_records_for_update), "existing records for omics_results update\n")


# Double check for missing sample_ids in the final results_data
missing_sample_ids <- sum(is.na(results_data$sample_id) | results_data$sample_id == "")
if (missing_sample_ids > 0) {
  cat("\nWARNING: Found", missing_sample_ids, "records with missing sample_id even after generation\n")
  
  # Fix any remaining missing sample_ids
  results_data <- results_data %>%
    mutate(
      sample_id = ifelse(is.na(sample_id) | sample_id == "", 
                        paste0(subject_id, "_", sample_number, "_fixed"), 
                        sample_id)
    )
}


# ===== PRE-INSERT/UPDATE: Handle Missing Subjects in omics_subjects =====
cat("\n==== CHECKING FOR MISSING SUBJECTS IN omics_subjects ====\n")

# 1. Get unique subject IDs from the *entire* loaded dataset 
all_subject_ids_in_file <- results_data %>% 
  distinct(subject_id) %>% 
  filter(!is.na(subject_id)) %>% # Exclude any NA subject IDs
  pull(subject_id)

# 2. Find which of these subjects are missing from omics_subjects
if (length(all_subject_ids_in_file) > 0) {
  query_existing_subjects <- sprintf(
    "SELECT subject_id FROM laboratory.omics_subjects WHERE subject_id IN (%s)",
    paste0("'", all_subject_ids_in_file, "'", collapse = ", ")
  )
  subjects_already_in_db <- dbGetQuery(con, query_existing_subjects) %>% pull(subject_id)
  
  subjects_to_insert <- setdiff(all_subject_ids_in_file, subjects_already_in_db)
} else {
  subjects_to_insert <- character(0) # Ensure it's an empty character vector
}


# 3. Prepare and insert missing subjects if any
if (length(subjects_to_insert) > 0) {
  cat(length(subjects_to_insert), "subjects need to be added to laboratory.omics_subjects.\n")
  
  # Prepare data for insert - JOIN results_data with mrn_mapping to get MRN
  new_subjects_data_prep <- results_data %>% 
    filter(subject_id %in% subjects_to_insert) %>% 
    distinct(subject_id, .keep_all = TRUE) %>% # Get one row per new subject
    select(subject_id) # Only need subject_id for joining
  
  # Join with the mapping file
  new_subjects_data <- new_subjects_data_prep %>% 
    inner_join(mrn_mapping, by = "subject_id") %>% 
    select(subject_id, patient_mrn) %>% 
    mutate(project = "OMI") # Add the project column
    
  # Check if join produced the expected number of rows
  if (nrow(new_subjects_data) != length(subjects_to_insert)) {
    missing_from_mapping <- setdiff(subjects_to_insert, new_subjects_data$subject_id)
    cat("\nERROR: Could not find MRN mapping for the following subject IDs:", 
        paste(missing_from_mapping, collapse=", "), "\n")
    cat("Please check the 'etl/MRNs 4-8-25.csv' file.\n")
    stop("Cannot insert new subjects due to missing MRN mappings.")
  }

  # **** Verification Step: Check if MRNs exist in phi.patients ****
  mrns_to_check <- unique(new_subjects_data$patient_mrn)
  query_phi_patients <- sprintf(
      "SELECT patient_mrn FROM phi.patients WHERE patient_mrn IN (%s)",
      paste0("'", mrns_to_check, "'", collapse = ", ")
  )
  mrns_in_phi <- dbGetQuery(con, query_phi_patients) %>% pull(patient_mrn)
  
  missing_mrns <- setdiff(mrns_to_check, mrns_in_phi)
  
  if (length(missing_mrns) > 0) {
      cat("\nERROR: The following patient MRNs required for new subjects do not exist in phi.patients:", 
          paste(missing_mrns, collapse=", "), "\n")
      cat("Please ensure these patients are added to phi.patients (e.g., via EPIC import) before running this script again.\n")
      stop("Cannot insert new subjects due to missing patient MRNs in phi.patients.")
  }
  # **** End Verification ****

  cat("Attempting to insert new subjects into laboratory.omics_subjects...\n")
  dbBegin(con)
  tryCatch({
      dbWriteTable(
          con,
          name = Id(schema = "laboratory", table = "omics_subjects"),
          value = new_subjects_data,
          append = TRUE,
          row.names = FALSE # Important for dbWriteTable appends
      )
      dbCommit(con)
      cat("Successfully inserted", nrow(new_subjects_data), "new subjects into laboratory.omics_subjects.\n")
  }, error = function(e) {
      dbRollback(con)
      cat("Error inserting new subjects into laboratory.omics_subjects:", conditionMessage(e), "\n")
      stop("Failed to insert required subjects, cannot proceed with omics_results insert/update.")
  })
  
} else {
  cat("No new subjects need to be added to laboratory.omics_subjects.\n")
}
# ===== END PRE-INSERT/UPDATE =====



# ===== INSERT NEW RECORDS into omics_results =====
# Insert new records if any
if (nrow(new_records) > 0) {
  cat("\n==== INSERTING NEW RECORDS INTO omics_results ====\n")
  dbBegin(con)
  tryCatch({
    # Generate UUIDs
    new_ids <- uuid::UUIDgenerate(n = nrow(new_records))
    insert_data <- new_records %>%
      mutate(
        id = new_ids,
        created_at = Sys.time(),
        updated_at = Sys.time()
      )
    
    # Ensure we only use columns that exist in the target table
    valid_cols <- intersect(names(insert_data), table_structure$column_name)
    insert_data <- insert_data %>% select(all_of(valid_cols))
    
    # Final truncation before insert to ensure no values exceed limits
    insert_data <- truncate_to_column_size(insert_data, table_structure)
    
    # Check for null values in required columns
    for (col in required_cols) {
      if (col %in% names(insert_data)) {
        null_count <- sum(is.na(insert_data[[col]]))
        if (null_count > 0) {
          cat("ERROR: Required column", col, "has", null_count, "NULL values in new records for omics_results\n")
          stop(paste("Cannot insert records into omics_results with NULL values in required column:", col))
        }
      }
    }
    
    # Insert data
    dbWriteTable(
      con, 
      name = Id(schema = "laboratory", table = "omics_results"),
      value = insert_data,
      append = TRUE,
      row.names = FALSE
    )
    
    dbCommit(con)
    cat("Successfully inserted", nrow(new_records), "new records into omics_results\n")
  }, error = function(e) {
    dbRollback(con)
    cat("Error during omics_results insert:", conditionMessage(e), "\n")
  })
}

# ===== UPDATE EXISTING RECORDS in omics_results =====
# Initialize successful_updates before the update block
successful_updates <- 0

# Use the previously identified existing records
update_data <- existing_records_for_update

# Apply truncation to update data
update_data <- truncate_to_column_size(update_data, table_structure)

# Process updates in smaller batches
if (nrow(update_data) > 0) {
  cat("\n==== UPDATING EXISTING RECORDS IN omics_results ====\n")
  
  # Process in batches
  batch_size <- 50
  num_batches <- ceiling(nrow(update_data) / batch_size)
  
  for (batch in 1:num_batches) {
    batch_start <- (batch - 1) * batch_size + 1
    batch_end <- min(batch * batch_size, nrow(update_data))
    
    batch_records <- update_data[batch_start:batch_end, ]
    cat("Processing update batch", batch, "of", num_batches, "-", nrow(batch_records), "records\n")
    
    dbBegin(con)
    batch_success <- TRUE
    
    tryCatch({
      for (i in 1:nrow(batch_records)) {
        row <- batch_records[i, ]
        id_val <- row$db_id  # Use the database ID
        
        # Skip columns we don't want to update
        skip_cols <- c("db_id", "subject_id", "sample_number", "db_sample_id")
        cols_to_update <- setdiff(names(row), skip_cols)
        
        # Build update clauses
        set_clauses <- c()
        
        for (col in cols_to_update) {
          # Skip any column not in the database table
          if (!col %in% table_structure$column_name) next
          
          val <- row[[col]]
          
          # Skip updating required fields to NULL
          if (is.na(val) && col %in% required_cols) {
            next
          }
          
          # Handle special column types
          if (col == "sample_id") {
            # For sample_id, always use our current value
            set_clauses <- c(set_clauses, sprintf("sample_id = '%s'", gsub("'", "''", row$sample_id)))
          } else if (col %in% date_cols) {
            # Special handling for date columns
            if (is.na(val)) {
              set_clauses <- c(set_clauses, sprintf("%s = NULL", col))
            } else if (inherits(val, "Date")) {
              # Ensure proper date format for PostgreSQL
              date_str <- format(val, "%Y-%m-%d")
              set_clauses <- c(set_clauses, sprintf("%s = '%s'", col, date_str))
            } else {
              # Skip invalid dates
              cat("Skipping invalid date value for", col, ":", val, "\n")
              next
            }
          } else if (is.na(val)) {
            set_clauses <- c(set_clauses, sprintf("%s = NULL", col))
          } else if (is.character(val)) {
            val <- gsub("'", "''", val)  # Escape single quotes
            
            # For character columns, check if we need to truncate further
            max_length <- NULL
            col_info <- filter(table_structure, column_name == col)
            if (nrow(col_info) > 0 && grepl("character varying", col_info$data_type)) {
              size_match <- regexpr("\\((\\d+)\\)", col_info$data_type)
              if (size_match > 0) {
                size_text <- regmatches(col_info$data_type, size_match)
                max_length <- as.numeric(gsub("[\\(\\)]", "", size_text))
                
                if (nchar(val) > max_length) {
                  cat("Truncating value for column", col, "from", nchar(val), "to", max_length, "characters\n")
                  val <- substr(val, 1, max_length)
                }
              }
            }
            
            set_clauses <- c(set_clauses, sprintf("%s = '%s'", col, val))
          } else if (is.numeric(val)) {
            set_clauses <- c(set_clauses, sprintf("%s = %s", col, val))
          } else if (is.logical(val)) {
            set_clauses <- c(set_clauses, sprintf("%s = %s", col, ifelse(val, "TRUE", "FALSE")))
          }
        }
        
        # Only proceed if we have clauses to update
        if (length(set_clauses) > 0) {
          # Add updated_at timestamp
          set_clauses <- c(set_clauses, "updated_at = NOW()")
          
          # Create and execute update statement
          update_stmt <- sprintf(
            "UPDATE laboratory.omics_results SET %s WHERE id = '%s'",
            paste(set_clauses, collapse = ", "),
            id_val
          )
          
          tryCatch({
            dbExecute(con, update_stmt)
          }, error = function(e) {
            cat("Error updating record", i, "(ID:", id_val, "):", conditionMessage(e), "\n")
            batch_success <- FALSE
          })
        }
      }
      
      if (batch_success) {
        dbCommit(con)
        successful_updates <- successful_updates + nrow(batch_records)
        cat("Successfully committed batch", batch, "\n")
      } else {
        dbRollback(con)
        cat("Rolled back batch", batch, "due to errors\n")
      }
    }, error = function(e) {
      dbRollback(con)
      cat("Error processing batch", batch, ":", conditionMessage(e), "\n")
    })
  }
}

cat("Successfully updated", successful_updates, "out of", nrow(update_data), "records\n")

# Verify final counts
final_counts <- dbGetQuery(con, "
  SELECT COUNT(*) as count FROM laboratory.omics_results;
")

# Fix final count printing
cat("\nFinal record count in omics_results:", as.integer(final_counts$count), "\n")

# Close connection
dbDisconnect(con)
cat("\nDatabase connection closed\n") 
#!/usr/bin/env Rscript

# Load necessary libraries
library(tidyverse)
library(readxl)
library(RPostgres)
library(lubridate)
library(uuid)
library(glue)

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
results_raw <- read_csv('Omics_reformatted_2025-04-08.csv',
                       col_types = cols(.default = col_character()))

# Clean and transform results data
results_data <- results_raw %>%
  # Ensure all column names are lowercase
  rename_with(tolower) %>%
  # Format subject_id
  mutate(
    subject_id = if_else(!is.na(subject_id) & nchar(subject_id) == 4, 
                         paste0("OMI-", subject_id), 
                         subject_id),
    # Ensure sample_number is numeric
    sample_number = as.integer(sample_number)
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

# Get existing results
cat("\n==== GETTING EXISTING RESULTS ====\n")
existing_results <- dbGetQuery(con, "
  SELECT id, subject_id, sample_number, sample_id 
  FROM laboratory.omics_results
")
debug_structure(existing_results, "Existing Results")

# Double check for missing sample_ids
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

# ===== INSERT NEW RECORDS =====
# Identify new records without joining to avoid column name conflicts
new_records <- anti_join(
  results_data, 
  existing_results, 
  by = c("subject_id", "sample_number")
)
cat("\nIdentified", nrow(new_records), "new records for insertion\n")

# Insert new records if any
if (nrow(new_records) > 0) {
  cat("\n==== INSERTING NEW RECORDS ====\n")
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
    
    # Check for null values in required columns
    for (col in required_cols) {
      if (col %in% names(insert_data)) {
        null_count <- sum(is.na(insert_data[[col]]))
        if (null_count > 0) {
          cat("ERROR: Required column", col, "has", null_count, "NULL values\n")
          stop(paste("Cannot insert records with NULL values in required column:", col))
        }
      }
    }
    
    # Insert data
    dbWriteTable(
      con, 
      name = Id(schema = "laboratory", table = "omics_results"),
      value = insert_data,
      append = TRUE
    )
    
    dbCommit(con)
    cat("Successfully inserted", nrow(new_records), "new records\n")
  }, error = function(e) {
    dbRollback(con)
    cat("Error during insert:", conditionMessage(e), "\n")
  })
}

# ===== UPDATE EXISTING RECORDS =====
# Identify existing records by joining to get the database IDs
update_data <- results_data %>%
  inner_join(existing_results, by = c("subject_id", "sample_number")) %>%
  rename(db_id = id, db_sample_id = sample_id.y) %>%
  rename(sample_id = sample_id.x)  # Keep our current sample_id

cat("\nIdentified", nrow(update_data), "existing records to update\n")

# Process updates in smaller batches
if (nrow(update_data) > 0) {
  cat("\n==== UPDATING EXISTING RECORDS ====\n")
  
  # Process in batches
  batch_size <- 50
  num_batches <- ceiling(nrow(update_data) / batch_size)
  
  successful_updates <- 0
  
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

cat("\nFinal record count:", final_counts$count, "\n")

# Close connection
dbDisconnect(con)
cat("\nDatabase connection closed\n") 
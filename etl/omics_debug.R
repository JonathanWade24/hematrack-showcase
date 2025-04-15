#!/usr/bin/env Rscript

# Load necessary libraries
library(tidyverse)
library(readxl)
library(RPostgres)
library(lubridate)
library(uuid)
library(glue)

# Helper function to print data structure
debug_structure <- function(df, label) {
  cat("\n==== DEBUG:", label, "====\n")
  cat("Dimensions:", nrow(df), "rows,", ncol(df), "columns\n")
  cat("Column names:", paste(names(df), collapse=", "), "\n")
  
  # Check for key columns
  for (col in c("id", "subject_id", "sample_id", "sample_number")) {
    if (col %in% names(df)) {
      nulls <- sum(is.na(df[[col]]) | df[[col]] == "")
      cat(col, "column:", nulls, "null values out of", nrow(df), "\n")
    } else {
      cat(col, "column: NOT PRESENT\n")
    }
  }
  
  # Show first few rows of key columns
  if (nrow(df) > 0) {
    key_cols <- intersect(c("id", "subject_id", "sample_id", "sample_number"), names(df))
    if (length(key_cols) > 0) {
      cat("\nSample data (first 5 rows):\n")
      print(head(df[, key_cols], 5))
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
print(table_structure)

# Get required columns
required_cols <- table_structure %>%
  filter(is_nullable == 'NO') %>%
  pull(column_name)
cat("\nRequired columns:", paste(required_cols, collapse=", "), "\n")

# Load results data
cat("\n==== LOADING RESULTS DATA ====\n")
results_raw <- read_csv('Omics_reformatted_2025-04-08.csv',
                       col_types = cols(.default = col_character()))

# Examine raw results data
debug_structure(results_raw, "Raw Results")

# Clean and transform results data (simplified for debugging)
results_data <- results_raw %>%
  # Ensure all column names are lowercase
  rename_with(tolower) %>%
  # Format subject_id
  mutate(
    subject_id = if_else(!is.na(subject_id) & nchar(subject_id) == 4, 
                         paste0("OMI-", subject_id), 
                         subject_id)
  )

# Generate sample_id from subject_id and sample_number if not already provided
results_data <- results_data %>%
  mutate(
    # Ensure sample_number is numeric
    sample_number = as.integer(sample_number),
    # Create sample_id if missing
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

# Examine cleaned results data
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

# Join with existing data to identify new vs existing records
cat("\n==== JOINING WITH EXISTING DATA ====\n")
results_with_ids <- results_data %>%
  left_join(existing_results, by = c("subject_id", "sample_number"))

# Debug join results
debug_structure(results_with_ids, "Results After Join")

# Show any conflicts in column names
if (any(grepl("\\.x", names(results_with_ids)))) {
  cat("\nWARNING: Found conflicts in column names after join:\n")
  conflict_cols <- grep("\\.x", names(results_with_ids), value = TRUE)
  for (col in conflict_cols) {
    base_col <- gsub("\\.x", "", col)
    cat("  Conflict:", base_col, "split into", col, "and", paste0(base_col, ".y"), "\n")
  }
}

# Handle the sample_id column correctly
if ("sample_id.x" %in% names(results_with_ids) && "sample_id.y" %in% names(results_with_ids)) {
  cat("\nFixing sample_id column conflict...\n")
  
  # Use our sample_id.x (from the data) but preserve it as sample_id
  results_with_ids <- results_with_ids %>%
    mutate(
      orig_sample_id = sample_id.x,
      db_sample_id = sample_id.y
    ) %>%
    select(-sample_id.x, -sample_id.y) %>%
    rename(sample_id = orig_sample_id)
}

# Split into new and existing records
cat("\n==== SPLITTING INTO NEW AND EXISTING RECORDS ====\n")
results_new <- results_with_ids %>%
  filter(is.na(id)) %>%
  select(-id)

results_existing <- results_with_ids %>%
  filter(!is.na(id))

debug_structure(results_new, "New Results")
debug_structure(results_existing, "Existing Results")

# TRANSACTION for insert only
cat("\n==== STARTING INSERT TRANSACTION ====\n")
dbBegin(con)
tryCatch({
  if (nrow(results_new) > 0) {
    cat("\nInserting", nrow(results_new), "new records...\n")
    
    # Generate UUIDs for new records
    new_ids <- uuid::UUIDgenerate(n = nrow(results_new))
    results_new$id <- new_ids
    results_new$created_at <- Sys.time()
    results_new$updated_at <- Sys.time()
    
    # Verify required columns have values
    for (col in required_cols) {
      if (col %in% names(results_new)) {
        null_count <- sum(is.na(results_new[[col]]))
        if (null_count > 0) {
          cat("ERROR: Required column", col, "has", null_count, "NULL values\n")
          stop(paste("Cannot insert records with NULL values in required column:", col))
        }
      } else if (!col %in% c("id", "created_at", "updated_at")) {
        cat("ERROR: Required column", col, "is missing from the data\n")
        stop(paste("Required column is missing:", col))
      }
    }
    
    # Get valid columns for insert
    valid_cols <- intersect(names(results_new), table_structure$column_name)
    
    # Prepare final data for insert
    insert_data <- results_new %>% 
      select(all_of(valid_cols))
    
    # Preview insert data
    cat("\nPreview of insert data (first 5 rows, key columns):\n")
    print(head(insert_data[, intersect(c("id", "subject_id", "sample_id", "sample_number"), valid_cols)], 5))
    
    # Insert the data
    dbWriteTable(
      con, 
      name = Id(schema = "laboratory", table = "omics_results"),
      value = insert_data,
      append = TRUE
    )
    cat("Insert completed successfully\n")
  } else {
    cat("No new records to insert\n")
  }
  
  # Commit the transaction
  dbCommit(con)
  cat("Insert transaction committed successfully\n")
}, error = function(e) {
  # Rollback on error
  dbRollback(con)
  cat("\nError during insert:", conditionMessage(e), "\n")
  cat("Insert transaction rolled back\n")
})

# SEPARATE TRANSACTION for updates
if (nrow(results_existing) > 0) {
  cat("\n==== STARTING UPDATE TRANSACTION ====\n")
  cat("Updating", nrow(results_existing), "existing records...\n")
  
  # Process updates in batches to avoid hitting statement length limits
  batch_size <- 50
  num_batches <- ceiling(nrow(results_existing) / batch_size)
  
  for (batch in 1:num_batches) {
    cat("Processing update batch", batch, "of", num_batches, "\n")
    
    start_idx <- (batch - 1) * batch_size + 1
    end_idx <- min(batch * batch_size, nrow(results_existing))
    
    batch_data <- results_existing[start_idx:end_idx, ]
    
    dbBegin(con)
    tryCatch({
      # Process each record in the batch
      for (i in 1:nrow(batch_data)) {
        row <- batch_data[i, ]
        id_val <- row$id
        
        # Create SET clause for relevant columns
        # Skip id, subject_id, sample_number and any columns with NULL for required fields
        columns_to_update <- setdiff(names(row), c("id", "subject_id", "sample_number"))
        
        # Build SET clauses
        set_clauses <- c()
        for (col in columns_to_update) {
          val <- row[[col]]
          
          # Skip updating required fields to NULL
          if (is.na(val) && col %in% required_cols) {
            next
          }
          
          if (is.na(val)) {
            set_clauses <- c(set_clauses, sprintf("%s = NULL", col))
          } else if (is.character(val)) {
            # Escape single quotes
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
        
        # Add updated_at timestamp
        set_clauses <- c(set_clauses, "updated_at = NOW()")
        
        # Only update if we have something to set
        if (length(set_clauses) > 0) {
          # Combine SET clauses
          set_clause <- paste(set_clauses, collapse = ", ")
          
          # Execute update
          update_query <- sprintf(
            "UPDATE laboratory.omics_results SET %s WHERE id = '%s'",
            set_clause,
            id_val
          )
          
          dbExecute(con, update_query)
        }
      }
      
      # Commit this batch
      dbCommit(con)
      cat("Batch", batch, "committed successfully\n")
    }, error = function(e) {
      # Rollback on error
      dbRollback(con)
      cat("\nError during batch", batch, "update:", conditionMessage(e), "\n")
      cat("Batch transaction rolled back\n")
    })
  }
}

# Verify final counts
final_counts <- dbGetQuery(con, "
  SELECT COUNT(*) as count FROM laboratory.omics_results;
")

cat("\nFinal record count:", final_counts$count, "\n")

# Close connection
dbDisconnect(con)
cat("\nDatabase connection closed\n") 
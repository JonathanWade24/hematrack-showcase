#!/usr/bin/env Rscript

# Load necessary libraries
library(RPostgres)
library(tidyverse)
library(lubridate)

# Current timestamp for backup file names
timestamp <- format(now(), "%Y%m%d_%H%M%S")

# Database connection to production
con <- dbConnect(
  Postgres(),
  dbname = "scd_research_secure",  # Note: Using the production database
  host = "localhost",
  port = 5432,
  user = "jonathanwade",
  password = "Bnyj1L930"
)

# Create backup directory if it doesn't exist
backup_dir <- "backups"
dir.create(backup_dir, showWarnings = FALSE)

# Function to back up an entire schema
backup_schema <- function(schema) {
  cat(sprintf("\nBacking up schema '%s'...\n", schema))
  
  # Get list of tables in schema - make sure to handle case sensitivity
  tables_query <- sprintf("
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '%s'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  ", schema)
  
  tables <- dbGetQuery(con, tables_query)
  
  if (nrow(tables) == 0) {
    cat(sprintf("No tables found in schema '%s'\n", schema))
    return(data.frame(
      schema = schema,
      table = character(0),
      rows = integer(0),
      status = character(0),
      filename = character(0)
    ))
  }
  
  cat(sprintf("Found %d tables in schema '%s'\n", nrow(tables), schema))
  
  # Create schema directory if it doesn't exist
  schema_dir <- file.path(backup_dir, schema)
  dir.create(schema_dir, showWarnings = FALSE)
  
  # Create results data frame
  results <- data.frame(
    schema = character(nrow(tables)),
    table = character(nrow(tables)),
    rows = integer(nrow(tables)),
    status = character(nrow(tables)),
    filename = character(nrow(tables)),
    stringsAsFactors = FALSE
  )
  
  # Backup each table
  for (i in 1:nrow(tables)) {
    table_name <- tables$table_name[i]
    
    results$schema[i] <- schema
    results$table[i] <- table_name
    
    tryCatch({
      cat(sprintf("  Backing up table '%s.%s'...", schema, table_name))
      
      # Get exact case-sensitive table name by quoting
      quoted_table <- paste0('"', schema, '"."', table_name, '"')
      
      # Create table backup file
      filename <- file.path(schema_dir, paste0(table_name, "_", timestamp, ".csv"))
      results$filename[i] <- filename
      
      # Export table data
      data_query <- sprintf("SELECT * FROM %s", quoted_table)
      table_data <- dbGetQuery(con, data_query)
      
      # Get row count
      results$rows[i] <- nrow(table_data)
      
      # Write to CSV
      write_csv(table_data, filename)
      
      cat(sprintf(" (%d rows)\n", nrow(table_data)))
      results$status[i] <- "SUCCESS"
      
    }, error = function(e) {
      cat(sprintf(" ERROR: %s\n", conditionMessage(e)))
      results$status[i] <- paste("ERROR:", conditionMessage(e))
      results$rows[i] <- 0
    })
  }
  
  return(results)
}

# Schemas to back up
schemas <- c("phi", "laboratory", "clinical")

# Run backups for each schema
all_results <- lapply(schemas, backup_schema)
backup_results <- do.call(rbind, all_results)

# Print summary
cat("\nBackup Summary:\n")
successful <- backup_results[backup_results$status == "SUCCESS", ]
failed <- backup_results[backup_results$status != "SUCCESS", ]

cat(sprintf("Successfully backed up %d tables with %d total rows\n", 
            nrow(successful), 
            sum(successful$rows)))

if (nrow(failed) > 0) {
  cat(sprintf("Failed to back up %d tables:\n", nrow(failed)))
  for (i in 1:nrow(failed)) {
    cat(sprintf("  %s.%s: %s\n", 
                failed$schema[i], 
                failed$table[i], 
                failed$status[i]))
  }
}

# Close connection
dbDisconnect(con)
cat("\nBackup complete!\n") 
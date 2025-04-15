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

# Set search path
dbExecute(con, "SET search_path TO laboratory, phi, clinical, audit, app;")

# Create backup directory if it doesn't exist
dir.create("backups", showWarnings = FALSE)

# Function to back up a table
backup_table <- function(schema, table) {
  tryCatch({
    # Get data
    cat(sprintf("Backing up %s.%s...\n", schema, table))
    query <- sprintf("SELECT * FROM %s.%s", schema, table)
    data <- dbGetQuery(con, query)
    
    # Save to CSV
    filename <- sprintf("backups/%s_%s_%s.csv", schema, table, timestamp)
    write_csv(data, filename)
    cat(sprintf("Saved %d rows to %s\n", nrow(data), filename))
    
    # Return row count for summary
    return(data.frame(
      schema = schema,
      table = table,
      rows = nrow(data),
      filename = filename
    ))
  }, error = function(e) {
    cat(sprintf("Error backing up %s.%s: %s\n", schema, table, conditionMessage(e)))
    return(data.frame(
      schema = schema,
      table = table,
      rows = 0,
      filename = "ERROR",
      error = conditionMessage(e)
    ))
  })
}

# Tables to back up
tables <- data.frame(
  schema = c("laboratory", "laboratory", "phi"),
  table = c("omics_subjects", "omics_results", "patients")
)

# Run backups
results <- map2_df(tables$schema, tables$table, backup_table)

# Print summary
cat("\nBackup Summary:\n")
print(results)

# Close connection
dbDisconnect(con)
cat("\nBackup complete!\n") 
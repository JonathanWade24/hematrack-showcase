#!/usr/bin/env Rscript

# Load necessary libraries
library(RPostgres)
library(tidyverse)

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

# Function to describe table structure
describe_table <- function(schema, table) {
  cat("\n=============================================\n")
  cat(sprintf("Structure of %s.%s:\n", schema, table))
  cat("=============================================\n")
  
  # Get column information
  columns <- dbGetQuery(con, sprintf("
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = '%s' AND table_name = '%s'
    ORDER BY ordinal_position;
  ", schema, table))
  
  print(columns)
  
  # Get primary key information
  pks <- dbGetQuery(con, sprintf("
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = '%s.%s'::regclass AND i.indisprimary;
  ", schema, table))
  
  if (nrow(pks) > 0) {
    cat("\nPrimary Key(s):", paste(pks$attname, collapse = ", "), "\n")
  }
  
  # Get sample data (first 5 rows)
  sample_data <- dbGetQuery(con, sprintf("SELECT * FROM %s.%s LIMIT 5;", schema, table))
  
  cat("\nSample Data (up to 5 rows):\n")
  print(sample_data)
}

# Describe both tables
describe_table("laboratory", "omics_subjects")
describe_table("laboratory", "omics_results")

# Close connection
dbDisconnect(con) 
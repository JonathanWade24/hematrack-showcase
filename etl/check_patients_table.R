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

# Check patients table structure
cat("\n=============================================\n")
cat("Structure of phi.patients:\n")
cat("=============================================\n")

columns <- dbGetQuery(con, "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'phi' AND table_name = 'patients'
  ORDER BY ordinal_position;
")

print(columns)

# Check primary key and foreign keys
cat("\n=============================================\n")
cat("Primary and Foreign Keys:\n")
cat("=============================================\n")

pks <- dbGetQuery(con, "
  SELECT a.attname
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  WHERE i.indrelid = 'phi.patients'::regclass AND i.indisprimary;
")

if (nrow(pks) > 0) {
  cat("\nPrimary Key(s):", paste(pks$attname, collapse=", "), "\n")
}

fks <- dbGetQuery(con, "
  SELECT
    tc.constraint_name,
    tc.table_schema || '.' || tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_schema || '.' || ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'phi' 
    AND tc.table_name = 'patients';
")

if (nrow(fks) > 0) {
  cat("\nForeign Keys:\n")
  print(fks)
}

# Sample data
cat("\n=============================================\n")
cat("Sample data from phi.patients (5 rows):\n")
cat("=============================================\n")

sample_data <- dbGetQuery(con, "SELECT * FROM phi.patients LIMIT 5;")
print(sample_data)

# Get count
count <- dbGetQuery(con, "SELECT COUNT(*) FROM phi.patients;")
cat("\nTotal records in phi.patients:", count[[1]], "\n")

# Close connection
dbDisconnect(con)
cat("\nCheck complete!\n") 
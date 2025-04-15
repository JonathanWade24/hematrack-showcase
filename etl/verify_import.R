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

# Verify subjects
cat("\n=============================================\n")
cat("Sample subjects (10 records):\n")
cat("=============================================\n")

subjects <- dbGetQuery(con, "SELECT * FROM laboratory.omics_subjects LIMIT 10;")
print(subjects)

# Verify results
cat("\n=============================================\n")
cat("Sample results (5 records with key fields):\n")
cat("=============================================\n")

results <- dbGetQuery(con, "
  SELECT id, subject_id, sample_number, sample_id, 
         date_of_collection, genotype, sex, 
         hb_advia, hct_advia, percent_f_cells
  FROM laboratory.omics_results 
  LIMIT 5;")
print(results)

# Count by genotype
cat("\n=============================================\n")
cat("Results counts by genotype:\n")
cat("=============================================\n")

genotype_counts <- dbGetQuery(con, "
  SELECT genotype, COUNT(*) as count
  FROM laboratory.omics_results
  GROUP BY genotype
  ORDER BY count DESC;")
print(genotype_counts)

# Check subject with most results
cat("\n=============================================\n")
cat("Subjects with the most results:\n")
cat("=============================================\n")

subject_counts <- dbGetQuery(con, "
  SELECT subject_id, COUNT(*) as result_count
  FROM laboratory.omics_results
  GROUP BY subject_id
  ORDER BY result_count DESC
  LIMIT 10;")
print(subject_counts)

# Close connection
dbDisconnect(con)
cat("\nVerification complete!\n") 
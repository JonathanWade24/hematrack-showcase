# Load necessary libraries
library(tidyverse)
library(readxl)
library(RPostgres)
library(lubridate)
library(glue)

# Helper functions
clean_numeric <- function(x) {
  if (all(is.na(x))) return(x)
  if (!is.character(x)) x <- as.character(x)
  x <- gsub("\\s*\\([^)]*\\)", "", x) %>% trimws()
  na_values <- c("NA", "n/a", "N/A", "error", "not calibrated", 
                 "DNA only", "no volume", "Not enough", "", "missing")
  x[x %in% na_values] <- NA
  as.numeric(x)
}

clean_date <- function(x) {
  if (all(is.na(x))) return(as.Date(x))
  if (!is.character(x)) x <- as.character(x)
  x <- gsub("\\s+.*$", "", x) %>% trimws()
  na_values <- c("NA", "n/a", "N/A", "", "missing")
  x[x %in% na_values] <- NA
  dates <- parse_date_time(x, orders = c("ymd", "mdy", "dmy"))
  as.Date(dates)
}

clean_boolean <- function(x) {
  if (is.na(x)) return(NA)
  if (is.logical(x)) return(x)
  if (is.numeric(x)) return(x == 1)
  x <- tolower(trimws(x))
  if (x %in% c("yes", "y", "true", "t", "pass", "1")) return(TRUE)
  if (x %in% c("no", "n", "false", "f", "fail", "0")) return(FALSE)
  NA
}

# Database connection (configure via environment variables)
con <- dbConnect(
  Postgres(),
  dbname = Sys.getenv("PGDATABASE", unset = "hema_track_demo"),
  host = Sys.getenv("PGHOST", unset = "localhost"),
  port = as.integer(Sys.getenv("PGPORT", unset = "5432")),
  user = Sys.getenv("PGUSER", unset = "demo"),
  password = Sys.getenv("PGPASSWORD", unset = "demo")
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
  data_dir <- Sys.getenv("DATA_DIR", unset = "./data/omics")
  subjects_raw <- read_xlsx(file.path(data_dir, 'Omics_MRN_template.xlsx'))
  
  # Check for duplicate MRNs
  duplicates <- subjects_raw %>%
    mutate(
      subject_id = as.character(`Subject ID`),
      patient_mrn = as.character(MRN)
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
      subject_id = as.character(`Subject ID`),
      patient_mrn = as.character(MRN),
      project = 'OMI'
    ) %>%
    select(subject_id, patient_mrn, project) %>%
    distinct(patient_mrn, .keep_all = TRUE)
  
  # Check which patients exist
  existing_patients <- dbGetQuery(con, glue("
    SELECT DISTINCT patient_mrn 
    FROM phi.patients 
    WHERE patient_mrn IN ('", paste(subjects_data$patient_mrn, collapse = "','"), "')
  "))
  
  subjects_filtered <- subjects_data %>%
    filter(patient_mrn %in% existing_patients$patient_mrn)
  
  cat("\nSubjects summary:\n")
  cat("Total subjects:", nrow(subjects_data), "\n")
  cat("Subjects with existing patients:", nrow(subjects_filtered), "\n")
  cat("Subjects with missing patients:", nrow(subjects_data) - nrow(subjects_filtered), "\n")
  
  # Insert subjects
  dbWriteTable(
    con, 
    name = Id(schema = "laboratory", table = "omics_subjects"),
    value = subjects_filtered,
    append = TRUE
  )
  
  # Load and prepare results data
  cat("\nLoading results data...\n")
  results_raw <- read_csv(file.path(data_dir, 'Omics_reformatted.csv'),
                         col_types = cols(.default = col_character()))
  
  # Clean and transform results data
  results_data <- results_raw %>%
    # Ensure all column names are lowercase
    rename_with(tolower) %>%
    # Clean dates
    mutate(across(matches("^date_"), clean_date)) %>%
    # Clean numeric fields
    mutate(across(matches("concentration|number|value|vol|purity|percent|min|max|delta|pos|rbc|hb|hct|mcv|mch|mchc|rdw|plt|wbc"), clean_numeric)) %>%
    # Clean boolean fields
    mutate(across(matches("^qc_pass_"), clean_boolean)) %>%
    # Format subject_id
    mutate(
      subject_id = if_else(nchar(subject_id) == 4, paste0("OMI-", subject_id), subject_id),
      sample_number = as.integer(sample_number)
    ) %>%
    # Filter for valid subjects
    filter(subject_id %in% subjects_filtered$subject_id) %>%
    # Remove any rows with missing required fields
    filter(!is.na(date_of_collection))
  
  # Validate numeric ranges
  results_data <- results_data %>%
    mutate(
      rbc_advia = if_else(rbc_advia > 0 & rbc_advia < 10, rbc_advia, NA_real_),
      hb_advia = if_else(hb_advia > 0 & hb_advia < 25, hb_advia, NA_real_),
      hct_advia = if_else(hct_advia > 0 & hct_advia < 100, hct_advia, NA_real_),
      mcv_advia = if_else(mcv_advia > 50 & mcv_advia < 150, mcv_advia, NA_real_),
      mch_advia = if_else(mch_advia > 15 & mch_advia < 50, mch_advia, NA_real_),
      mchc_advia = if_else(mchc_advia > 20 & mchc_advia < 50, mchc_advia, NA_real_),
      rdw_advia = if_else(rdw_advia > 0 & rdw_advia < 30, rdw_advia, NA_real_),
      plt_advia = if_else(plt_advia > 0 & plt_advia < 1000, plt_advia, NA_real_),
      wbc_advia = if_else(wbc_advia > 0 & wbc_advia < 100, wbc_advia, NA_real_),
      retic_advia = if_else(retic_advia > 0 & retic_advia < 30, retic_advia, NA_real_)
    )
  
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

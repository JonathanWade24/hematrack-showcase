#!/usr/bin/env Rscript

# Create test databases for testing ETL scripts
library(DBI)
library(RPostgres)

# Connection parameters for the standard postgres database
con <- dbConnect(
  Postgres(),
  dbname = "postgres",
  host = "localhost",
  port = 5432,
  user = "jonathanwade"
)

# Create test database names
test_dbs <- c(
  "scd_research_test",
  "scd_research_secure_test"
)

# Check if the test databases already exist
cat("Checking for existing test databases...\n")
existing_dbs <- dbGetQuery(con, "SELECT datname FROM pg_database WHERE datistemplate = false")
existing_dbs <- existing_dbs$datname

for (db_name in test_dbs) {
  if (db_name %in% existing_dbs) {
    cat(paste0("Database '", db_name, "' already exists.\n"))
  } else {
    tryCatch({
      # Create the database
      dbExecute(con, paste0("CREATE DATABASE ", db_name, " WITH TEMPLATE ", 
                           if (grepl("secure", db_name)) "scd_research_secure" else "scd_research"))
      cat(paste0("Database '", db_name, "' created successfully.\n"))
    }, error = function(e) {
      cat(paste0("Failed to create '", db_name, "': ", conditionMessage(e), "\n"))
    })
  }
}

# Close the connection
dbDisconnect(con)
cat("Done!\n")

# Additional instructions on how to run the ETL scripts
cat("\nTo test the ETL scripts with the test databases, run:\n")
cat("Rscript etl/import_epic_data\\ copy.R\n")
cat("Rscript etl/import_omics_data\\ copy.R\n")
cat("\nThe ETL scripts have been updated to point to these test databases.\n") 
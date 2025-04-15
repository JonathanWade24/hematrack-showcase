#!/usr/bin/env Rscript

# Script to inspect database schema
library(DBI)
library(RPostgres)

# Connect to the database
con <- dbConnect(
  Postgres(),
  dbname = "scd_research_secure",
  host = "localhost",
  port = 5432,
  user = "jonathanwade"
)

# Get a list of all schemas
cat("Available schemas:\n")
schemas <- dbGetQuery(con, "
  SELECT schema_name 
  FROM information_schema.schemata
  WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
  ORDER BY schema_name;
")
print(schemas)

# For each schema, get a list of tables
for (schema in schemas$schema_name) {
  cat(paste0("\nTables in schema '", schema, "':\n"))
  tables <- dbGetQuery(con, paste0("
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = '", schema, "'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  "))
  
  if (nrow(tables) > 0) {
    for (table in tables$table_name) {
      # Get column information for each table
      cat(paste0("\n  Table: ", schema, ".", table, "\n"))
      columns <- dbGetQuery(con, paste0("
        SELECT 
          column_name, 
          data_type,
          character_maximum_length,
          is_nullable
        FROM information_schema.columns 
        WHERE table_schema = '", schema, "'
        AND table_name = '", table, "'
        ORDER BY ordinal_position;
      "))
      print(columns)
    }
  } else {
    cat("  No tables found.\n")
  }
}

# Disconnect
dbDisconnect(con)
cat("\nDone!\n") 
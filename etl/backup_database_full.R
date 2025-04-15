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
  tryCatch({
    cat(sprintf("\nBacking up schema '%s'...\n", schema))
    
    # Get list of tables in schema
    tables_query <- sprintf("
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = '%s'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    ", schema)
    
    tables <- dbGetQuery(con, tables_query)
    cat(sprintf("Found %d tables in schema '%s'\n", nrow(tables), schema))
    
    # Create schema directory if it doesn't exist
    schema_dir <- file.path(backup_dir, schema)
    dir.create(schema_dir, showWarnings = FALSE)
    
    # Schema backup file name
    schema_file <- file.path(backup_dir, paste0(schema, "_schema_", timestamp, ".sql"))
    
    # Write schema definition to file
    cat(sprintf("CREATE SCHEMA IF NOT EXISTS %s;\n", schema), file = schema_file)
    
    # Initialize table count
    total_rows <- 0
    
    # Backup each table
    for (i in 1:nrow(tables)) {
      table_name <- tables$table_name[i]
      cat(sprintf("  Backing up table '%s.%s'...", schema, table_name))
      
      # Get table row count
      count_query <- sprintf("SELECT COUNT(*) FROM %s.%s", schema, table_name)
      row_count <- dbGetQuery(con, count_query)[[1]]
      total_rows <- total_rows + row_count
      
      # Get table structure
      table_structure_query <- sprintf("
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE 
          table_schema = '%s' 
          AND table_name = '%s'
        ORDER BY ordinal_position;
      ", schema, table_name)
      
      table_structure <- dbGetQuery(con, table_structure_query)
      
      # Create table backup file
      table_file <- file.path(schema_dir, paste0(table_name, "_", timestamp, ".csv"))
      
      # Export table data
      data_query <- sprintf("SELECT * FROM %s.%s", schema, table_name)
      table_data <- dbGetQuery(con, data_query)
      write_csv(table_data, table_file)
      
      # Create DDL file for table
      ddl_file <- file.path(schema_dir, paste0(table_name, "_ddl_", timestamp, ".sql"))
      
      # Generate CREATE TABLE statement
      create_table_sql <- sprintf("CREATE TABLE IF NOT EXISTS %s.%s (\n", schema, table_name)
      
      # Add columns
      for (j in 1:nrow(table_structure)) {
        col <- table_structure[j, ]
        nullable <- ifelse(col$is_nullable == "YES", "", " NOT NULL")
        default <- ifelse(is.na(col$column_default), "", paste(" DEFAULT", col$column_default))
        
        # Add comma if not the last column
        comma <- ifelse(j < nrow(table_structure), ",", "")
        
        create_table_sql <- paste0(
          create_table_sql,
          sprintf("  %s %s%s%s%s\n", 
                  col$column_name, 
                  col$data_type, 
                  nullable,
                  default,
                  comma)
        )
      }
      
      create_table_sql <- paste0(create_table_sql, ");\n")
      
      # Get primary key info
      pk_query <- sprintf("
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = '%s.%s'::regclass AND i.indisprimary;
      ", schema, table_name)
      
      pk_cols <- dbGetQuery(con, pk_query)
      
      if (nrow(pk_cols) > 0) {
        pk_statement <- sprintf(
          "ALTER TABLE %s.%s ADD PRIMARY KEY (%s);\n",
          schema,
          table_name,
          paste(pk_cols$attname, collapse = ", ")
        )
        create_table_sql <- paste0(create_table_sql, pk_statement)
      }
      
      # Get foreign key info
      fk_query <- sprintf("
        SELECT
          tc.constraint_name,
          kcu.column_name as fk_column,
          ccu.table_schema as ref_schema,
          ccu.table_name as ref_table,
          ccu.column_name as ref_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = '%s' 
          AND tc.table_name = '%s';
      ", schema, table_name)
      
      fk_constraints <- dbGetQuery(con, fk_query)
      
      if (nrow(fk_constraints) > 0) {
        for (k in 1:nrow(fk_constraints)) {
          fk <- fk_constraints[k, ]
          fk_statement <- sprintf(
            "ALTER TABLE %s.%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s.%s(%s);\n",
            schema,
            table_name,
            fk$constraint_name,
            fk$fk_column,
            fk$ref_schema,
            fk$ref_table,
            fk$ref_column
          )
          create_table_sql <- paste0(create_table_sql, fk_statement)
        }
      }
      
      # Write CREATE TABLE statement to file
      cat(create_table_sql, file = ddl_file)
      
      # Append to schema file
      cat(create_table_sql, file = schema_file, append = TRUE)
      
      cat(sprintf(" (%d rows)\n", row_count))
    }
    
    cat(sprintf("Schema '%s' backup complete with %d tables and %d total rows\n", schema, nrow(tables), total_rows))
    
    return(data.frame(
      schema = schema,
      tables = nrow(tables),
      total_rows = total_rows,
      schema_file = schema_file
    ))
  }, error = function(e) {
    cat(sprintf("Error backing up schema '%s': %s\n", schema, conditionMessage(e)))
    return(data.frame(
      schema = schema,
      tables = 0,
      total_rows = 0,
      schema_file = "ERROR",
      error = conditionMessage(e)
    ))
  })
}

# Schemas to back up
schemas <- c("phi", "laboratory", "clinical")

# Run backups for each schema
results <- lapply(schemas, backup_schema) %>% bind_rows()

# Print summary
cat("\nBackup Summary:\n")
print(results)

# Get overall database size
db_size_query <- "
  SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;
"
db_size <- dbGetQuery(con, db_size_query)

cat("\nTotal database size:", db_size$db_size, "\n")

# Close connection
dbDisconnect(con)
cat("\nBackup complete!\n") 
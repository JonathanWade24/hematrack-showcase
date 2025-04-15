#!/usr/bin/env Rscript

# Script to identify and terminate active database connections
library(DBI)
library(RPostgres)

# Connect to postgres database to get session information
con <- dbConnect(
  Postgres(),
  dbname = "postgres",
  host = "localhost",
  port = 5432,
  user = "jonathanwade"
)

# The database we want to check connections for
target_db <- "scd_research_secure"

# Query to list active connections
connections_query <- paste0("
  SELECT 
    pid,
    usename AS username,
    application_name,
    client_addr,
    backend_start,
    state,
    query
  FROM pg_stat_activity 
  WHERE datname = '", target_db, "'
  ORDER BY backend_start;
")

# Get the active connections
cat(paste0("Checking active connections to '", target_db, "'...\n"))
connections <- dbGetQuery(con, connections_query)

# Display the connections
if (nrow(connections) > 0) {
  cat(paste0("Found ", nrow(connections), " active connections:\n"))
  print(connections)
  
  # Ask for confirmation to terminate connections
  cat("\nDo you want to terminate these connections? (y/n): ")
  response <- scan("stdin", what = character(), n = 1, quiet = TRUE)
  
  if (tolower(response) == "y") {
    # Loop through each connection and terminate it
    for (i in 1:nrow(connections)) {
      pid <- connections$pid[i]
      tryCatch({
        # Use pg_terminate_backend to kill the connection
        sql <- paste0("SELECT pg_terminate_backend(", pid, ");")
        result <- dbGetQuery(con, sql)
        cat(paste0("Terminated connection with PID ", pid, ": ", result[[1]], "\n"))
      }, error = function(e) {
        cat(paste0("Failed to terminate connection with PID ", pid, ": ", conditionMessage(e), "\n"))
      })
    }
    
    # Check if any connections remain
    remaining <- dbGetQuery(con, connections_query)
    if (nrow(remaining) > 0) {
      cat("\nSome connections could not be terminated:\n")
      print(remaining)
    } else {
      cat("\nAll connections terminated successfully!\n")
    }
  } else {
    cat("No connections were terminated.\n")
  }
} else {
  cat("No active connections found.\n")
}

# Close our connection
dbDisconnect(con)

cat("\nDone!\n") 
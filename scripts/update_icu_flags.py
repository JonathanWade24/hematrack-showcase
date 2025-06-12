import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import os
import sys
import glob

def connect_db():
    try:
        return psycopg2.connect(
            dbname="scd_research_refactored",
            user="sheehanlab_db",
            host="/var/run/postgresql",
            port="5432"
        )
    except psycopg2.Error as e:
        print(f"Error connecting to database: {str(e)}")
        sys.exit(1)

def process_file(file_path, conn):
    print(f"\nProcessing file: {os.path.basename(file_path)}")
    try:
        # Read the pipe-delimited file
        # Attempt to read with error handling for bad lines
        try:
            df = pd.read_csv(file_path, sep='|', low_memory=False, on_bad_lines='warn')
        except pd.errors.ParserError as pe:
            print(f"Pandas ParserError for file {file_path}: {pe}")
            print("Please check the file format. It might not be a valid pipe-delimited file or has structural issues.")
            print(f"To investigate, try: head -n 5 {file_path} and tail -n 5 {file_path}")
            return # Skip this file
        except Exception as e:
            print(f"Unexpected error reading CSV {file_path}: {e}")
            return # Skip this file

        if df.empty:
            print(f"No data found in {file_path} after loading.")
            return

        # Convert column names to lowercase
        df.columns = df.columns.str.lower()
        
        # Ensure required columns exist
        required_columns = ['patient_mrn', 'adm_date_time', 'icu_admission_yn']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            print(f"Warning: Missing required columns in {file_path}: {missing_columns}")
            print(f"Available columns: {df.columns.tolist()}")
            return
        
        # Convert datetime columns
        try:
            df['adm_date_time'] = pd.to_datetime(df['adm_date_time'])
            
            # Add 4 hours to adjust from Eastern Time to UTC
            print("Converting admission times from ET to UTC by adding 4 hours...")
            df['adm_date_time_utc'] = df['adm_date_time'] + pd.Timedelta(hours=4)
        except Exception as e:
            print(f"Error converting 'adm_date_time' to datetime in {file_path}: {e}")
            print(f"Sample problematic 'adm_date_time' values:\n{df[~df['adm_date_time'].apply(lambda x: isinstance(x, pd.Timestamp))]['adm_date_time'].head()}")
            return

        # Handle NULL values
        df = df.replace({pd.NA: None})

        # Filter for rows where ICU admission is affirmative
        affirmative_icu_values = ['Y', 'Yes', 'YES', 'y'] # Add other variations if needed
        df_icu = df[df['icu_admission_yn'].astype(str).str.strip().isin(affirmative_icu_values)].copy()

        if df_icu.empty:
            print(f"No affirmative ICU admission records found in {os.path.basename(file_path)} (after filtering for {affirmative_icu_values}).")
            return
        
        # Debugging: Print a sample of the data to be used in the update
        print(f"Debug: Sample of df_icu before SQL execution (first 5 rows):\n{df_icu[['patient_mrn', 'adm_date_time', 'icu_admission_yn']].head().to_string()}")
        
        # Prepare data for SQL
        # Ensure patient_mrn is string, adm_date_time is timestamp, icu_admission_yn is string
        try:
            data_for_sql = []
            for index, row in df_icu.iterrows():
                mrn = str(row['patient_mrn'])
                adm_time = row['adm_date_time_utc']  # Use the UTC adjusted time
                icu_yn = str(row['icu_admission_yn'])
                if pd.isna(adm_time): # Skip rows where adm_date_time is NaT after conversion
                    print(f"Skipping row {index} due to NaT in adm_date_time for MRN {mrn}")
                    continue
                data_for_sql.append((mrn, adm_time, icu_yn))
        except KeyError as ke:
            print(f"KeyError while preparing data_for_sql: {ke}. This might indicate an issue with column names after processing.")
            return
            
        if not data_for_sql:
            print("No valid data to process after type conversion and NaT check.")
            return
            
        print(f"Debug: First tuple in data_for_sql (patient_mrn, adm_date_time, icu_admission_yn): {data_for_sql[0] if data_for_sql else 'No data'}")

        with conn.cursor() as cur:
            update_query = """
                UPDATE clinical.visits v
                SET icu_admission = true,
                    updated_at = CURRENT_TIMESTAMP
                FROM (VALUES %s) AS ip(patient_mrn_val, adm_date_time_val, icu_admission_yn_val) 
                WHERE v.patient_mrn = ip.patient_mrn_val::VARCHAR 
                  AND v.visit_start_datetime = ip.adm_date_time_val::TIMESTAMP;
            """
            
            initial_icu_count = 0
            if data_for_sql: # Only query if there's data to potentially update
                cur.execute("SELECT COUNT(*) FROM clinical.visits WHERE icu_admission = true;")
                initial_icu_count = cur.fetchone()[0]
                
                # For debugging, print a sample MRN and adm_date_time to manually check in the DB
                sample_mrn_to_check = data_for_sql[0][0]
                sample_adm_date_to_check = data_for_sql[0][1].strftime('%Y-%m-%d %H:%M:%S')
                original_time = df_icu.iloc[0]['adm_date_time'].strftime('%Y-%m-%d %H:%M:%S')
                print(f"Debug: Original time in file: {original_time}")
                print(f"Debug: UTC adjusted time: {sample_adm_date_to_check}")
                print(f"Debug: To manually check if a matching visit exists for the first record, run in psql:")
                print(f"SELECT * FROM clinical.visits WHERE patient_mrn = '{sample_mrn_to_check}' AND visit_start_datetime = '{sample_adm_date_to_check}';")

                execute_values(cur, update_query, data_for_sql, page_size=500) # Use page_size for large data
            
            # Commented out unified_visits update as it does not exist in the schema
            # cur.execute("""
            #     UPDATE clinical.unified_visits uv
            #     SET icu_admission_yn = 'Y',
            #         updated_at = CURRENT_TIMESTAMP
            #     FROM clinical.visits v
            #     WHERE uv.visit_id = v.visit_id
            #     AND v.icu_admission = true
            # """)
            
            conn.commit()
            
            cur.execute("SELECT COUNT(*) FROM clinical.visits;")
            total_visits_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM clinical.visits WHERE icu_admission = true;")
            final_icu_count = cur.fetchone()[0]
            
            updated_this_run = final_icu_count - initial_icu_count
            
            print(f"Finished processing {os.path.basename(file_path)}:")
            print(f"Total visits in DB: {total_visits_count}")
            print(f"ICU visits in DB before this file: {initial_icu_count}")
            print(f"ICU visits in DB after this file: {final_icu_count}")
            print(f"Number of visits updated to ICU=true from this file: {updated_this_run}")
            
    except pd.errors.EmptyDataError:
        print(f"Warning: File {file_path} is empty. Skipping.")
    except Exception as e:
        print(f"Error processing file {file_path}: {type(e).__name__} - {str(e)}")
        if conn:
            conn.rollback()
        # Do not re-raise here to allow other files to be processed.
        # If you want to stop on first error, then re-raise e

def process_directory(directory_path, conn):
    file_pattern = os.path.join(directory_path, "*.txt") # Assuming all are .txt, adjust if needed
    files = glob.glob(file_pattern)
    
    if not files:
        print(f"No matching text files found in {directory_path} with pattern {file_pattern}")
        return
    
    print(f"Found {len(files)} files to process: {', '.join(map(os.path.basename, files))}")
    
    for file_path in files:
        process_file(file_path, conn)

def main():
    if len(sys.argv) != 2:
        print("Usage: python update_icu_flags.py <directory_path>")
        sys.exit(1)
        
    directory_path = sys.argv[1]
    if not os.path.isdir(directory_path):
        print(f"Error: {directory_path} is not a valid directory")
        sys.exit(1)
    
    print(f"Starting ICU flag update for files in: {directory_path}")
    conn = None
    
    try:
        conn = connect_db()
        process_directory(directory_path, conn)
        print("\nICU flag update process completed for all discoverable files.")
    except Exception as e:
        print(f"Critical error during script execution: {type(e).__name__} - {str(e)}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 
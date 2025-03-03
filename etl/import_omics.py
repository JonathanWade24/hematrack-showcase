import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import numpy as np
import warnings
import re

def clean_string(value, max_length=50):
    if pd.isna(value):
        return None
    
    # Convert to string and strip whitespace
    cleaned = str(value).strip()
    
    # Truncate if longer than max_length
    if len(cleaned) > max_length:
        warnings.warn(f"Truncating value '{cleaned}' to {max_length} characters")
        cleaned = cleaned[:max_length]
    
    return cleaned

def clean_numeric(value):
    if pd.isna(value):
        return None
    
    try:
        # Convert to float first to handle scientific notation
        num = float(value)
        
        # Check if the value is within a reasonable range for a 4-byte integer
        if num < -2147483648 or num > 2147483647:
            warnings.warn(f"Value {num} is outside the valid integer range, converting to NULL")
            return None
            
        # Return as integer if within range
        return int(num)
    except (ValueError, TypeError):
        warnings.warn(f"Could not convert '{value}' to numeric, setting to None")
        return None

def main():
    # Database connection parameters
    conn_params = {
        'dbname': 'scd_research_secure',
        'user': 'jonathanwade',
        'password': 'Bnyj1L930',
        'host': 'localhost',
        'port': '5432'
    }

    try:
        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        # Read the MRN mapping file
        mrn_df = pd.read_excel('../Omics_MRN_2.2.2025.xlsx')
        print(f"Read {len(mrn_df)} rows from MRN mapping file")
        
        # Clean subject IDs in MRN mapping and rename columns
        mrn_df = mrn_df.rename(columns={'Subject ID': 'subject_id', 'MRN': 'mrn'})
        mrn_df['subject_id'] = mrn_df['subject_id'].apply(clean_string)
        print("Unique subject IDs in MRN mapping:", len(mrn_df['subject_id'].unique()))

        # Read the results data
        results_df = pd.read_csv('../Omics_reformatted_2025-02-10.csv')
        print(f"Read {len(results_df)} rows from results data file")
        
        # Clean subject IDs in results
        results_df['subject_id'] = results_df['subject_id'].apply(clean_string)
        unique_result_subjects = results_df['subject_id'].unique()
        print("Unique subject IDs in results:", len(unique_result_subjects))

        # Get existing subjects from database
        cur.execute("SELECT subject_id FROM laboratory.omics_subjects")
        existing_subjects = {row[0] for row in cur.fetchall()}
        print("Existing subjects in database:", len(existing_subjects))

        # Create mapping of subject_id to MRN
        subject_mrn_map = dict(zip(mrn_df['subject_id'], mrn_df['mrn']))
        
        # Find subjects that need to be inserted
        subjects_to_insert = set(unique_result_subjects) - existing_subjects
        print(f"Found {len(subjects_to_insert)} subjects that need to be inserted")
        
        # Check which subjects have MRN mappings
        subjects_with_mrn = [s for s in subjects_to_insert if s in subject_mrn_map]
        subjects_without_mrn = [s for s in subjects_to_insert if s not in subject_mrn_map]
        
        print(f"Subjects with MRN mapping: {len(subjects_with_mrn)}")
        if subjects_without_mrn:
            print("Subjects missing MRN mapping:", subjects_without_mrn)

        # Insert subjects that have MRN mappings
        if subjects_with_mrn:
            print(f"Inserting {len(subjects_with_mrn)} new subjects")
            for subject_id in subjects_with_mrn:
                try:
                    cur.execute(
                        "INSERT INTO laboratory.omics_subjects (subject_id, mrn) VALUES (%s, %s)",
                        (subject_id, subject_mrn_map[subject_id])
                    )
                    conn.commit()
                    print(f"Inserted subject {subject_id}")
                except psycopg2.Error as e:
                    print(f"Failed to insert subject {subject_id}: {str(e)}")
                    conn.rollback()

        # Process results
        skipped_count = 0
        inserted_count = 0
        
        for _, row in results_df.iterrows():
            try:
                # Clean and validate data
                sample_id = clean_string(row['sample_id'])
                subject_id = clean_string(row['subject_id'])
                sample_number = clean_numeric(row['sample_number'])
                value = clean_numeric(row['value'])
                
                if not all([sample_id, subject_id]):
                    print(f"Skipping sample {sample_id} due to missing required string values")
                    skipped_count += 1
                    continue

                if sample_number is None or value is None:
                    print(f"Skipping sample {sample_id} due to invalid numeric values")
                    skipped_count += 1
                    continue

                # Try to insert the result
                cur.execute("""
                    INSERT INTO laboratory.omics_results 
                    (sample_id, subject_id, sample_number, value)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (sample_id) DO NOTHING
                """, (sample_id, subject_id, sample_number, value))

                if cur.rowcount == 0:
                    skipped_count += 1
                else:
                    inserted_count += 1
                    print(f"Inserted result for sample {sample_id}")

            except psycopg2.Error as e:
                print(f"Failed to insert sample {row['sample_id']}: {str(e)}")
                conn.rollback()
                continue

            # Commit after each successful insert
            conn.commit()

        print(f"\nSuccessfully inserted {inserted_count} new results")
        print(f"Skipped {skipped_count} existing results")
        
        print("\nAll changes committed successfully!")

    except Exception as e:
        print(f"Error: {str(e)}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main() 
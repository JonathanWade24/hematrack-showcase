#!/usr/bin/env python3
import os
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

def clean_date(x):
    """Convert various date formats to ISO date string."""
    if pd.isna(x) or str(x).strip() == '':
        return None
    try:
        # Try parsing as datetime
        return pd.to_datetime(x).strftime('%Y-%m-%d')
    except:
        return None

def clean_numeric(x):
    """Convert numeric strings to float, handling various NA formats."""
    if pd.isna(x) or str(x).strip() == '':
        return None
    try:
        return float(x)
    except:
        return None

def truncate_string(x, max_length):
    """Truncate string to specified length if necessary."""
    if pd.isna(x) or x is None:
        return None
    x = str(x).strip()
    if len(x) > max_length:
        print(f"Warning: Truncating value '{x}' to {max_length} characters")
        return x[:max_length]
    return x

def main():
    # Path to the CSV file
    csv_path = os.path.join('..', 'Omics_reformatted_2025-02-10.csv')
    print('Reading CSV file from:', csv_path)
    
    # Read CSV with all columns as string
    df = pd.read_csv(csv_path, dtype=str)
    print(f"Read {len(df)} rows from CSV")
    
    # Convert column names to lowercase
    df.columns = df.columns.str.lower()
    
    # Define column length limits
    string_lengths = {
        'project': 20,
        'subject_id': 20,
        'sample_id': 50,
        'genotype': 50,
        'sex': 20,
        'steady_state': 50,
        'transfusion_status': 50,
        'transfusion_confirmed': 50,
        'qc_pass_advia': 50,
        'instrument_lorrca': 100,
        'qc_pass_lorrca': 50,
        'qc_pass_viscosity': 50,
        'qc_pass_hvr': 50,
        'qc_pass_dna': 50,
        'sent_to_gt_pbmc': 50,
        'stain_f_cells': 100,
        'cytometer_f_cells': 100,
        'qc_pass_f_cells': 50,
        'qc_pass_adhesion': 50
    }
    
    # Truncate string columns
    for col, max_length in string_lengths.items():
        if col in df.columns:
            df[col] = df[col].apply(lambda x: truncate_string(x, max_length))
            print(f"Processed string column: {col} (max length: {max_length})")
    
    # Define numeric columns
    numeric_cols = [
        'sample_number', 'age_at_collection', 'days_to_processing',
        'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia', 
        'mchc_advia', 'rdw_advia', 'hdw_advia', 'plt_advia', 'mpv_advia',
        'wbc_advia', 'neut_advia', 'retic_advia', 'chr_advia',
        'hc41_v120_advia', 'hc41_v60_120_advia', 'hc41_v60_advia',
        'drbc_advia', 'hyper_advia', 'nrbc_advia',
        'ei_min_lorrca', 'ei_max_lorrca', 'ei_delta_lorrca', 'pos_lorrca',
        'visc_45', 'visc_225', 'hvr_45', 'hvr_225',
        'concentration_1_dna', 'purity_1_dna', 'concentration_2_dna', 'purity_2_dna',
        'vol_plasma_1', 'vol_plasma_2', 'vol_plasma_3',
        'cell_number_1_pbmc', 'cell_number_2_pbmc',
        'percent_f_cells', 'cells_adhered_adhesion',
        'hbf_percent_grady_hplc', 'hba_percent_grady_hplc', 'hbc_percent_grady_hplc',
        'hba2_percent_grady_hplc', 'hbs_percent_grady_hplc', 'hbf_percent_d10_hplc',
        'hba_percent_d10_hplc', 'hbc_percent_d10_hplc', 'hba2_percent_d10_hplc',
        'hbs_percent_d10_hplc', 'hbf_percent_d10_fcell_ratio', 'hbf_percent_grady_fcell_ratio'
    ]

    # Define date columns
    date_cols = [col for col in df.columns if col.startswith('date_')]
    date_cols.append('date_of_collection')  # Add this if not caught by the pattern

    # Clean numeric columns
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].apply(clean_numeric)
            print(f"Cleaned numeric column: {col}")

    # Clean date columns
    for col in date_cols:
        if col in df.columns:
            df[col] = df[col].apply(clean_date)
            print(f"Cleaned date column: {col}")

    # Add timestamp columns
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    df['created_at'] = now
    df['updated_at'] = now

    # Define the target table columns (as in laboratory.omics_results)
    table_columns = [
        'project', 'subject_id', 'sample_number', 'sample_id', 'date_of_collection', 'age_at_collection', 'genotype', 'sex',
        'therapies', 'days_to_processing', 'steady_state', 'transfusion_status', 'transfusion_confirmed',
        'date_advia', 'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia', 'mchc_advia', 'rdw_advia', 'hdw_advia',
        'plt_advia', 'mpv_advia', 'wbc_advia', 'neut_advia', 'retic_advia', 'chr_advia', 'hc41_v120_advia',
        'hc41_v60_120_advia', 'hc41_v60_advia', 'drbc_advia', 'hyper_advia', 'nrbc_advia', 'qc_pass_advia', 'qc_notes_advia',
        'date_lorrca', 'ei_min_lorrca', 'ei_max_lorrca', 'ei_delta_lorrca', 'pos_lorrca', 'instrument_lorrca', 'qc_pass_lorrca',
        'qc_notes_lorrca', 'date_visc', 'visc_45', 'visc_225', 'qc_pass_viscosity', 'qc_notes_viscosity', 'date_hvr', 'hvr_45',
        'hvr_225', 'qc_pass_hvr', 'qc_notes_hvr', 'date_dna', 'concentration_1_dna', 'purity_1_dna', 'concentration_2_dna',
        'purity_2_dna', 'qc_pass_dna', 'qc_notes_dna', 'date_plasma', 'vol_plasma_1', 'vol_plasma_2', 'vol_plasma_3',
        'qc_notes_plasma', 'date_pmbc', 'cell_number_1_pbmc', 'cell_number_2_pbmc', 'sent_to_gt_pbmc', 'qc_notes_pbmc',
        'date_f_cells', 'percent_f_cells', 'stain_f_cells', 'cytometer_f_cells', 'qc_pass_f_cells', 'qc_notes_f_cells',
        'date_adhesion', 'cells_adhered_adhesion', 'qc_pass_adhesion', 'qc_notes_adhesion', 'date_hplc',
        'hbf_percent_grady_hplc', 'hba_percent_grady_hplc', 'hbc_percent_grady_hplc', 'hba2_percent_grady_hplc',
        'hbs_percent_grady_hplc', 'hbf_percent_d10_hplc', 'hba_percent_d10_hplc', 'hbc_percent_d10_hplc', 'hba2_percent_d10_hplc',
        'hbs_percent_d10_hplc', 'hbf_percent_d10_fcell_ratio', 'hbf_percent_grady_fcell_ratio',
        'created_at', 'updated_at'
    ]

    # Ensure all required columns are present
    for col in table_columns:
        if col not in df.columns:
            df[col] = None
            print(f"Added missing column: {col}")

    # Reorder DataFrame to match target table columns
    df = df[table_columns]

    # Convert DataFrame to records
    records = df.replace({np.nan: None}).to_dict(orient='records')
    print(f"\nPrepared {len(records)} records for insertion")

    # Connect to the database
    conn = psycopg2.connect(
        dbname='scd_research_secure',
        user='jonathanwade',
        password='Bnyj1L930',
        host='localhost',
        port=5432
    )
    cursor = conn.cursor()

    # Prepare the SQL insert statement
    query = f"""INSERT INTO laboratory.omics_results ({', '.join(table_columns)}) VALUES %s"""
    values = [[record[col] for col in table_columns] for record in records]

    try:
        execute_values(cursor, query, values)
        conn.commit()
        print(f"Successfully inserted {len(records)} records into laboratory.omics_results")
    except Exception as e:
        conn.rollback()
        print("Error during insertion:", e)
        # Print a sample of the values being inserted
        print("\nSample of values being inserted:")
        for col, val in zip(table_columns, values[0]):
            if isinstance(val, str) and len(val) > 50:
                print(f"{col}: {val[:50]}... (length: {len(val)})")
            else:
                print(f"{col}: {val} ({type(val)})")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main() 
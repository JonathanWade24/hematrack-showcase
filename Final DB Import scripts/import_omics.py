#!/usr/bin/env python3
import os
import pandas as pd
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import warnings
import uuid
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
        
    # List of strings that should be converted to NULL
    null_values = [
        'not collected', 'not calibrated', 'Not run', 'No volume', 'no volume',
        'device issue', 'Device issue', 'error', 'missing', 'MISSING', 'missing ?',
        'not nanodropped', 'DNA not collected', 'DNA not extracted', 'Not enough',
        'Not enough cells', 'lysed blood', 'Device failure', 'None found',
        'need to find # of cells', 'not enough blood volume for second aliquot'
    ]
    
    # Convert to string and clean
    x_str = str(x).strip().lower()
    
    # Check if it's in null values list
    if x_str.lower() in [v.lower() for v in null_values]:
        return None
        
    try:
        # Handle scientific notation with space (e.g., "5.63 e6")
        if ' e' in x_str:
            base, exp = x_str.split(' e')
            return float(base) * (10 ** float(exp))
        else:
            return float(x_str)
    except ValueError as e:
        print(f"Warning: Could not convert '{x}' to numeric: {str(e)}")
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

def format_subject_id(x):
    """Format subject_id to match OMI-XXXX format."""
    if pd.isna(x) or x is None:
        return None
    x = str(x).strip()
    if x.startswith('OMI-'):
        return x
    return f"OMI-{x.zfill(4)}"

def format_sample_id(subject_id, sample_number):
    """Format sample_id as OMI-XXXX-Y."""
    if pd.isna(subject_id) or pd.isna(sample_number):
        return None
    try:
        subject_base = subject_id.replace('OMI-', '')
        sample_num = int(float(sample_number))
        if sample_num < 1 or sample_num > 1000:
            print(f"Warning: Invalid sample number {sample_number} for subject {subject_id}")
            return None
        return f"OMI-{subject_base}-{sample_num}"
    except:
        return None

def main():
    # Path to the files
    mrn_path = os.path.join('..', 'Omics_MRN_2.2.2025.xlsx')
    data_path = os.path.join('..', 'Omics_reformatted_2025-02-10.csv')
    
    # Connect to the database first to check existing subjects
    conn = psycopg2.connect(
        dbname='scd_research_secure',
        user='jonathanwade',
        password='Bnyj1L930',
        host='localhost',
        port=5432
    )
    
    try:
        # Read MRN mapping file
        print('Reading MRN mapping file from:', mrn_path)
        mrn_df = pd.read_excel(mrn_path)
        print(f"Read {len(mrn_df)} rows from MRN file")
        
        # Read results data
        print('\nReading results data from:', data_path)
        results_df = pd.read_csv(data_path, dtype=str)
        print(f"Read {len(results_df)} rows from results file")
        
        # Format subject IDs in both dataframes
        mrn_df['subject_id'] = mrn_df['Subject ID'].apply(format_subject_id)
        results_df['subject_id'] = results_df['subject_id'].apply(format_subject_id)
        
        # Create a mapping of subject_id to MRN
        subject_mrn_map = mrn_df.set_index('subject_id')['MRN'].astype(str).to_dict()
        
        # Get all existing subjects
        cursor = conn.cursor()
        cursor.execute("SELECT subject_id FROM laboratory.omics_subjects")
        existing_subjects = set(row[0] for row in cursor.fetchall())
        cursor.close()
        
        # Get all existing sample IDs
        cursor = conn.cursor()
        cursor.execute("SELECT sample_id FROM laboratory.omics_results")
        existing_sample_ids = set(row[0] for row in cursor.fetchall())
        cursor.close()
        
        # Insert any missing subjects
        subjects_inserted = 0
        for subject_id in results_df['subject_id'].unique():
            if subject_id not in existing_subjects and subject_id in subject_mrn_map:
                try:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        INSERT INTO laboratory.omics_subjects (subject_id, patient_mrn, project)
                        VALUES (%s, %s, %s)
                        """,
                        (subject_id, subject_mrn_map[subject_id], 'OMI')
                    )
                    conn.commit()
                    cursor.close()
                    existing_subjects.add(subject_id)
                    subjects_inserted += 1
                except psycopg2.Error as e:
                    print(f"Failed to insert subject {subject_id}: {str(e)}")
                    conn.rollback()
                    continue
        
        print(f"\nInserted {subjects_inserted} new subjects")
        
        # Generate UUIDs for id field
        results_df['id'] = [str(uuid.uuid4()) for _ in range(len(results_df))]
        
        # Format sample_id if not already present
        if 'sample_id' not in results_df.columns:
            results_df['sample_id'] = results_df.apply(
                lambda row: format_sample_id(row['subject_id'], row['sample_number']), 
                axis=1
            )
        
        # Process string columns
        string_lengths = {
            'id': 50,
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
        
        for col, max_length in string_lengths.items():
            if col in results_df.columns:
                results_df[col] = results_df[col].apply(lambda x: truncate_string(x, max_length))
        
        # Clean numeric columns
        numeric_cols = [
            'sample_number', 'days_to_processing', 'age_at_collection', 
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

        for col in numeric_cols:
            if col in results_df.columns:
                print(f"\nChecking numeric column: {col}")
                for idx, value in results_df[col].items():
                    if pd.notna(value):
                        try:
                            cleaned = clean_numeric(value)
                            if cleaned is not None and (cleaned < -1e9 or cleaned > 1e9):
                                print(f"Sample {results_df.loc[idx, 'sample_id']}: {col} = {value}")
                        except ValueError:
                            print(f"Sample {results_df.loc[idx, 'sample_id']}: Could not convert {col} value '{value}' to number")
                results_df[col] = results_df[col].apply(clean_numeric)
        
        # Clean date columns
        date_cols = [col for col in results_df.columns if col.startswith('date_')]
        
        for col in date_cols:
            if col in results_df.columns:
                results_df[col] = results_df[col].apply(clean_date)
        
        # Add timestamp columns
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        results_df['created_at'] = now
        results_df['updated_at'] = now
        
        # Define the target table columns for results
        results_columns = [
            'id', 'project', 'subject_id', 'sample_number', 'sample_id', 'date_of_collection', 
            'age_at_collection', 'genotype', 'sex', 'therapies', 'days_to_processing', 
            'steady_state', 'transfusion_status', 'transfusion_confirmed',
            'date_advia', 'rbc_advia', 'hb_advia', 'hct_advia', 'mcv_advia', 'mch_advia', 
            'mchc_advia', 'rdw_advia', 'hdw_advia', 'plt_advia', 'mpv_advia', 'wbc_advia', 
            'neut_advia', 'retic_advia', 'chr_advia', 'hc41_v120_advia',
            'hc41_v60_120_advia', 'hc41_v60_advia', 'drbc_advia', 'hyper_advia', 'nrbc_advia', 
            'qc_pass_advia', 'qc_notes_advia', 'date_lorrca', 'ei_min_lorrca', 'ei_max_lorrca', 
            'ei_delta_lorrca', 'pos_lorrca', 'instrument_lorrca', 'qc_pass_lorrca',
            'qc_notes_lorrca', 'date_visc', 'visc_45', 'visc_225', 'qc_pass_viscosity', 
            'qc_notes_viscosity', 'date_hvr', 'hvr_45', 'hvr_225', 'qc_pass_hvr', 'qc_notes_hvr', 
            'date_dna', 'concentration_1_dna', 'purity_1_dna', 'concentration_2_dna',
            'purity_2_dna', 'qc_pass_dna', 'qc_notes_dna', 'date_plasma', 'vol_plasma_1', 
            'vol_plasma_2', 'vol_plasma_3', 'qc_notes_plasma', 'date_pmbc', 'cell_number_1_pbmc', 
            'cell_number_2_pbmc', 'sent_to_gt_pbmc', 'qc_notes_pbmc', 'date_f_cells', 
            'percent_f_cells', 'stain_f_cells', 'cytometer_f_cells', 'qc_pass_f_cells', 
            'qc_notes_f_cells', 'date_adhesion', 'cells_adhered_adhesion', 'qc_pass_adhesion', 
            'qc_notes_adhesion', 'date_hplc', 'hbf_percent_grady_hplc', 'hba_percent_grady_hplc', 
            'hbc_percent_grady_hplc', 'hba2_percent_grady_hplc', 'hbs_percent_grady_hplc', 
            'hbf_percent_d10_hplc', 'hba_percent_d10_hplc', 'hbc_percent_d10_hplc', 
            'hba2_percent_d10_hplc', 'hbs_percent_d10_hplc', 'hbf_percent_d10_fcell_ratio', 
            'hbf_percent_grady_fcell_ratio', 'created_at', 'updated_at'
        ]
        
        # Ensure all required columns are present
        for col in results_columns:
            if col not in results_df.columns:
                results_df[col] = None
        
        # Reorder DataFrame to match target table columns
        results_df = results_df[results_columns]
        
        print(f"\nAttempting to insert {len(results_df)} results")
        
        # Insert results one at a time, skipping any that cause constraint violations
        successful_inserts = 0
        skipped_results = 0
        
        for _, row in results_df.iterrows():
            if row['sample_id'] in existing_sample_ids:
                skipped_results += 1
                continue
                
            try:
                cursor = conn.cursor()
                values = [row[col] for col in results_columns]
                placeholders = ', '.join(['%s'] * len(results_columns))
                cursor.execute(
                    f"""
                    INSERT INTO laboratory.omics_results ({', '.join(results_columns)})
                    VALUES ({placeholders})
                    """,
                    values
                )
                conn.commit()
                cursor.close()
                successful_inserts += 1
                existing_sample_ids.add(row['sample_id'])
            except psycopg2.Error as e:
                print(f"Failed to insert sample {row['sample_id']}: {str(e)}")
                conn.rollback()
                skipped_results += 1
                continue
        
        print(f"Successfully inserted {successful_inserts} new results")
        print(f"Skipped {skipped_results} existing results")
        
        print("\nAll changes committed successfully!")
        
    except Exception as e:
        print(f"\nError during processing: {str(e)}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    main() 
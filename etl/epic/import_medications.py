#!/usr/bin/env python3
"""
Import medication data from pipe-delimited files to PostgreSQL database.

This script imports two types of medication data:
1. Outpatient medication orders (OP_AVS files) -> medication_orders table
2. Inpatient medication administrations (IP_Meds files) -> medication_administrations table
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
import logging
from datetime import datetime
import sys
import os
import glob

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection parameters (override via environment variables)
DB_CONFIG = {
    'host': os.environ.get('PGHOST', 'localhost'),
    'database': os.environ.get('PGDATABASE', 'hema_track_demo'),
    'user': os.environ.get('PGUSER', 'demo'),
    'password': os.environ.get('PGPASSWORD', 'demo'),
    'port': os.environ.get('PGPORT', '5432')
}

def connect_db():
    """Create and return a database connection."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

def get_visit_id(cursor, patient_mrn, hsp_account_id, visit_date=None):
    """Helper function to get visit_id from visits table."""
    try:
        # Convert to string to match database varchar type
        patient_mrn = str(patient_mrn)
        hsp_account_id = str(hsp_account_id) if hsp_account_id else None
        
        # First try to match by HSP_ACCOUNT_ID (stored in pat_enc_csn_id)
        if hsp_account_id:
            cursor.execute("""
                SELECT visit_id 
                FROM clinical.visits 
                WHERE patient_mrn = %s 
                AND pat_enc_csn_id = %s
                LIMIT 1
            """, (patient_mrn, hsp_account_id))
            
            result = cursor.fetchone()
            if result:
                return result[0]
        
        # If no direct match and we have a visit_date, try date matching
        if visit_date:
            cursor.execute("""
                SELECT visit_id 
                FROM clinical.visits 
                WHERE patient_mrn = %s 
                AND DATE(visit_start_datetime) = DATE(%s)
                LIMIT 1
            """, (patient_mrn, visit_date))
            
            result = cursor.fetchone()
            if result:
                return result[0]
        
        # Last resort: find the most recent visit for this patient
        cursor.execute("""
            SELECT visit_id 
            FROM clinical.visits 
            WHERE patient_mrn = %s 
            ORDER BY visit_start_datetime DESC
            LIMIT 1
        """, (patient_mrn,))
        
        result = cursor.fetchone()
        if result:
            return result[0]
            
        return None
    except Exception as e:
        logger.warning(f"Warning: Error getting visit_id for MRN {patient_mrn}: {e}")
        return None

def parse_medication_details(generic_description):
    """Parse medication name, dose, units, and route from GENERIC_DESCRIPTION."""
    if not generic_description or pd.isna(generic_description):
        return None, None, None, None
    
    parts = str(generic_description).strip().split()
    if len(parts) < 2:
        return generic_description.strip(), None, None, None
    
    medication_name = parts[0]
    dose = None
    units = None
    route = None
    
    # Look for dose (parts with numbers)
    for i, part in enumerate(parts):
        if any(char.isdigit() for char in part):
            dose = part
            if i + 1 < len(parts):
                potential_unit = parts[i + 1]
                if potential_unit.upper() in ['MG', 'MCG', 'G', 'ML', 'UNITS', 'UNIT', 'UT', '%']:
                    units = potential_unit
            break
    
    # Look for route
    for part in parts:
        if part.upper() in ['PO', 'IV', 'IM', 'SL', 'IN', 'EX', 'OP', 'IJ', 'NA']:
            route = part.upper()
            break
    
    return medication_name, dose, units, route

def import_op_avs_medications(file_path, conn):
    """Import outpatient AVS medication orders."""
    try:
        # Try UTF-8 first, fall back to latin-1 if needed
        df = None
        encoding_used = None
        
        for encoding in ['utf-8', 'latin-1']:
            try:
                df = pd.read_csv(file_path, sep='|', encoding=encoding)
                encoding_used = encoding
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            raise Exception("Could not read file with any supported encoding")
        
        print(f"Read {len(df)} rows from {file_path} using {encoding_used} encoding")
        
        # Handle any NULL/None values
        df = df.replace({pd.NA: None})
        
        # Convert MRN and Account ID to strings to match database types
        df['PATIENT_MRN'] = df['PATIENT_MRN'].astype(str)
        df['HSP_ACCOUNT_ID'] = df['HSP_ACCOUNT_ID'].astype(str)
        
        # Parse timestamps
        df['ORDER_DTTM'] = pd.to_datetime(df['ORDER_DTTM'], errors='coerce')
        df['VISIT_DATE'] = pd.to_datetime(df['VISIT_DATE'], errors='coerce')
        
        # Check for missing timestamps
        order_time_nat = df['ORDER_DTTM'].isna().sum()
        visit_date_nat = df['VISIT_DATE'].isna().sum()
        print(f"Timestamp parsing: {order_time_nat} ORDER_DTTM NaT values, {visit_date_nat} VISIT_DATE NaT values")
        
        # Parse medication details from GENERIC_DESCRIPTION
        medication_details = df['GENERIC_DESCRIPTION'].apply(parse_medication_details)
        df[['medication_name', 'dose', 'units', 'route']] = pd.DataFrame(
            medication_details.tolist(), index=df.index
        )
        
        # Add source file and timestamps
        source_file = os.path.basename(file_path)
        current_time = datetime.now().isoformat()
        
        df['source_file'] = source_file
        df['created_at'] = current_time
        df['updated_at'] = current_time
        
        # Convert timestamp columns to proper format for PostgreSQL
        def convert_timestamp(ts):
            if pd.isna(ts):
                return None
            return ts.isoformat() if hasattr(ts, 'isoformat') else ts
        
        df['ORDER_DTTM'] = df['ORDER_DTTM'].apply(convert_timestamp)
        df['VISIT_DATE'] = df['VISIT_DATE'].apply(convert_timestamp)
        
        # Deduplicate based on ORDER_MED_ID
        initial_count = len(df)
        df = df.drop_duplicates('ORDER_MED_ID', keep='last')
        print(f"Removed {initial_count - len(df)} duplicate records based on ORDER_MED_ID")
        
        with conn.cursor() as cur:
            # Get visit_ids for all records
            visit_ids = []
            for _, row in df.iterrows():
                visit_id = get_visit_id(
                    cur, 
                    row['PATIENT_MRN'], 
                    row['HSP_ACCOUNT_ID'], 
                    row['VISIT_DATE']
                )
                visit_ids.append(visit_id)
            
            df['visit_id'] = visit_ids
            
            # Filter out records without visit_id if needed
            records_without_visit = df['visit_id'].isna().sum()
            if records_without_visit > 0:
                print(f"Warning: {records_without_visit} records could not be matched to visits")
            
            # Prepare data for insertion
            medication_orders_data = df[[
                'ORDER_MED_ID', 'visit_id', 'PATIENT_MRN', 'medication_name',
                'ORDER_DTTM', 'RX_STATUS', 'dose', 'units', 'route', 
                'source_file', 'created_at', 'updated_at'
            ]].copy()
            
            # Upsert medication orders - no unique constraint on epic_order_med_id, so we'll handle duplicates manually
            execute_values(cur, """
                INSERT INTO clinical.medication_orders 
                (epic_order_med_id, visit_id, patient_mrn, medication_name,
                 order_time, status, dose, units, route, source_file, created_at, updated_at)
                VALUES %s
                ON CONFLICT (medication_order_id) DO NOTHING
            """, medication_orders_data.values.tolist())
            
            conn.commit()
        
        print(f"Processed {len(df)} medication orders from {source_file}")
            
    except Exception as e:
        logger.error(f"Error processing OP AVS file {file_path}: {str(e)}")
        conn.rollback()
        raise

def import_ip_medications(file_path, conn):
    """Import inpatient medication administrations."""
    try:
        # Try UTF-8 first, fall back to latin-1 if needed
        df = None
        encoding_used = None
        
        for encoding in ['utf-8', 'latin-1']:
            try:
                df = pd.read_csv(file_path, sep='|', encoding=encoding)
                encoding_used = encoding
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            raise Exception("Could not read file with any supported encoding")
        
        print(f"Read {len(df)} rows from {file_path} using {encoding_used} encoding")
        
        # Handle any NULL/None values
        df = df.replace({pd.NA: None})
        
        # Convert MRN and Account ID to strings to match database types
        df['PATIENT_MRN'] = df['PATIENT_MRN'].astype(str)
        df['HSP_ACCOUNT_ID'] = df['HSP_ACCOUNT_ID'].astype(str)
        
        # Parse timestamps
        df['ADM_DATE_TIME'] = pd.to_datetime(df['ADM_DATE_TIME'], errors='coerce')
        df['DISCH_DATE_TIME'] = pd.to_datetime(df['DISCH_DATE_TIME'], errors='coerce')
        df['TAKEN_TIME'] = pd.to_datetime(df['TAKEN_TIME'], errors='coerce')
        
        # Check for missing timestamps
        adm_time_nat = df['ADM_DATE_TIME'].isna().sum()
        taken_time_nat = df['TAKEN_TIME'].isna().sum()
        print(f"Timestamp parsing: {adm_time_nat} ADM_DATE_TIME NaT values, {taken_time_nat} TAKEN_TIME NaT values")
        
        # Filter out records without required TAKEN_TIME
        initial_count = len(df)
        df = df.dropna(subset=['TAKEN_TIME'])
        print(f"Filtered out {initial_count - len(df)} records without administration time")
        
        # Add source file and timestamps
        source_file = os.path.basename(file_path)
        current_time = datetime.now().isoformat()
        
        df['source_file'] = source_file
        df['created_at'] = current_time
        df['updated_at'] = current_time
        
        # Convert timestamp columns to proper format for PostgreSQL
        def convert_timestamp(ts):
            if pd.isna(ts):
                return None
            return ts.isoformat() if hasattr(ts, 'isoformat') else ts
        
        df['ADM_DATE_TIME'] = df['ADM_DATE_TIME'].apply(convert_timestamp)
        df['DISCH_DATE_TIME'] = df['DISCH_DATE_TIME'].apply(convert_timestamp)
        df['TAKEN_TIME'] = df['TAKEN_TIME'].apply(convert_timestamp)
        
        # Deduplicate based on key fields to avoid duplicates
        initial_count = len(df)
        df = df.drop_duplicates(['PATIENT_MRN', 'HSP_ACCOUNT_ID', 'MEDICATION', 'TAKEN_TIME'], keep='last')
        print(f"Removed {initial_count - len(df)} duplicate records based on key fields")
        
        with conn.cursor() as cur:
            # Get visit_ids for all records
            visit_ids = []
            for _, row in df.iterrows():
                visit_id = get_visit_id(
                    cur, 
                    row['PATIENT_MRN'], 
                    row['HSP_ACCOUNT_ID'], 
                    row['ADM_DATE_TIME']
                )
                visit_ids.append(visit_id)
            
            df['visit_id'] = visit_ids
            
            # Filter out records without visit_id
            records_without_visit = df['visit_id'].isna().sum()
            if records_without_visit > 0:
                print(f"Warning: {records_without_visit} records could not be matched to visits, skipping these")
                df = df.dropna(subset=['visit_id'])
            
            if len(df) == 0:
                print(f"No records to import after visit matching")
                return
            
            # Prepare data for insertion
            medication_admin_data = df[[
                'visit_id', 'PATIENT_MRN', 'MEDICATION', 'TAKEN_TIME',
                'DOSAGE', 'UNIT', 'RX_CLASS_NAME', 'source_file', 'created_at', 'updated_at'
            ]].copy()
            
            # Insert medication administrations - no unique constraint, so just insert
            execute_values(cur, """
                INSERT INTO clinical.medication_administrations 
                (visit_id, patient_mrn, medication_name, administration_time,
                 dose_given, units, reason_for_action, source_file, created_at, updated_at)
                VALUES %s
            """, medication_admin_data.values.tolist())
            
            conn.commit()
        
        print(f"Processed {len(df)} medication administrations from {source_file}")
            
    except Exception as e:
        logger.error(f"Error processing IP Meds file {file_path}: {str(e)}")
        conn.rollback()
        raise

def main():
    """Main function to import all medication files."""
    if len(sys.argv) != 2:
        print("Usage: python import_medications.py <medications_directory>")
        sys.exit(1)
    
    medications_dir = Path(sys.argv[1])
    
    if not medications_dir.exists():
        logger.error(f"Directory does not exist: {medications_dir}")
        sys.exit(1)
    
    # Get all medication files
    op_avs_files = list(medications_dir.glob("*OP_AVS*.txt"))
    ip_meds_files = list(medications_dir.glob("*IP_Meds*.txt"))
    
    logger.info(f"Found {len(op_avs_files)} OP_AVS files and {len(ip_meds_files)} IP_Meds files")
    
    conn = None
    
    try:
        conn = connect_db()
        
        if len(sys.argv) > 1:
            # Process specific file if provided
            file_path = sys.argv[1]
            if not os.path.exists(file_path):
                print(f"Error: File {file_path} does not exist")
                sys.exit(1)
                
            logger.info(f"Starting import of {file_path}...")
            
            # Determine file type by name
            if "OP_AVS" in file_path:
                import_op_avs_medications(file_path, conn)
            elif "IP_Meds" in file_path:
                import_ip_medications(file_path, conn)
            else:
                print(f"Error: Cannot determine file type for {file_path}")
                sys.exit(1)
        else:
            # Process all medication files
            logger.info(f"Starting import of all medication files...")
            files_processed = 0
            
            # Process OP AVS files first
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing Outpatient AVS Medication Files")
            logger.info(f"{'='*60}")
            
            for file_name in op_avs_files:
                if os.path.exists(file_name):
                    logger.info(f"\nProcessing {file_name}...")
                    try:
                        import_op_avs_medications(file_name, conn)
                        files_processed += 1
                    except Exception as e:
                        logger.error(f"Failed to process {file_name}: {str(e)}")
                        continue
                else:
                    logger.warning(f"Warning: {file_name} not found, skipping...")
            
            # Process IP Meds files
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing Inpatient Medication Files")
            logger.info(f"{'='*60}")
            
            for file_name in ip_meds_files:
                if os.path.exists(file_name):
                    logger.info(f"\nProcessing {file_name}...")
                    try:
                        import_ip_medications(file_name, conn)
                        files_processed += 1
                    except Exception as e:
                        logger.error(f"Failed to process {file_name}: {str(e)}")
                        continue
                else:
                    logger.warning(f"Warning: {file_name} not found, skipping...")
            
            logger.info(f"\nCompleted processing {files_processed} files")
        
        logger.info("\nMedication import completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during import: {str(e)}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 
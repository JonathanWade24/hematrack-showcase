#!/usr/bin/env python3

import psycopg2
import logging
from pathlib import Path
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def import_to_postgres(csv_file):
    """Import the cleaned CSV file into PostgreSQL."""
    try:
        # Connect to the database
        conn = psycopg2.connect(
            dbname="scd_research_secure",
            # Add other connection parameters if needed
        )
        conn.autocommit = False
        cur = conn.cursor()
        
        logger.info("Connected to database")
        
        # Create temporary table
        logger.info("Creating temporary table...")
        cur.execute("""
            CREATE TEMP TABLE temp_labs (
                patient_mrn VARCHAR(50) NOT NULL,
                pat_enc_csn_id VARCHAR(50),
                order_time TIMESTAMP,
                proc_code VARCHAR(50),
                proc_name VARCHAR(200),
                component_id VARCHAR(50),
                lab_component_description VARCHAR(200),
                lab_result_value TEXT,
                result_time TIMESTAMP
            )
        """)
        
        # Import data into temporary table
        logger.info("Importing data into temporary table...")
        with open(csv_file, 'r') as f:
            next(f)  # Skip header
            cur.copy_from(
                f,
                'temp_labs',
                sep='\t',  # Use tab as delimiter
                null='',   # Empty strings are treated as NULL
                columns=(
                    'patient_mrn',
                    'pat_enc_csn_id',
                    'order_time',
                    'proc_code',
                    'proc_name',
                    'component_id',
                    'lab_component_description',
                    'lab_result_value',
                    'result_time'
                )
            )
        
        # Insert valid data into the main table
        logger.info("Inserting valid data into Labs table...")
        cur.execute("""
            INSERT INTO clinical."Labs" (
                patient_mrn,
                pat_enc_csn_id,
                order_time,
                proc_code,
                proc_name,
                component_id,
                lab_component_description,
                lab_result_value,
                result_time
            )
            SELECT 
                t.patient_mrn,
                t.pat_enc_csn_id,
                t.order_time,
                t.proc_code,
                t.proc_name,
                t.component_id,
                t.lab_component_description,
                t.lab_result_value,
                t.result_time
            FROM temp_labs t
            JOIN phi.patients p ON t.patient_mrn = p.patient_mrn
            WHERE t.order_time IS NOT NULL
            AND t.result_time IS NOT NULL
            ON CONFLICT DO NOTHING
        """)
        
        # Get counts
        cur.execute("SELECT COUNT(*) FROM temp_labs")
        total_rows = cur.fetchone()[0]
        
        cur.execute("""
            SELECT COUNT(*)
            FROM temp_labs t
            JOIN phi.patients p ON t.patient_mrn = p.patient_mrn
            WHERE t.order_time IS NOT NULL
            AND t.result_time IS NOT NULL
        """)
        imported_rows = cur.fetchone()[0]
        
        # Commit the transaction
        conn.commit()
        
        logger.info(f"""
Import complete:
- Total rows in CSV: {total_rows:,}
- Rows imported: {imported_rows:,}
- Success rate: {(imported_rows/total_rows)*100:.2f}%
        """)
        
    except Exception as e:
        logger.error(f"Error during import: {str(e)}")
        conn.rollback()
        raise
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    csv_file = 'labs_clean.csv'
    
    if not Path(csv_file).exists():
        logger.error(f"CSV file not found: {csv_file}")
        sys.exit(1)
    
    try:
        import_to_postgres(csv_file)
    except Exception as e:
        logger.error(f"Failed to import data: {str(e)}")
        sys.exit(1) 
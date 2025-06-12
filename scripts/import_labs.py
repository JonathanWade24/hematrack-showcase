import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import os
import sys

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

def import_labs(file_path, conn):
    try:
        # Read the entire file into memory since we need to deduplicate
        df = pd.read_csv(file_path, sep=',')
        
        # Handle any NULL/None values
        df = df.replace({pd.NA: None})
        
        # Convert columns to string type
        df['PAT_ENC_CSN_ID'] = df['PAT_ENC_CSN_ID'].astype(str)
        df['PROC_CODE'] = df['PROC_CODE'].astype(str)
        
        # Create order_id from PAT_ENC_CSN_ID and PROC_CODE
        df['order_id'] = df['PAT_ENC_CSN_ID'] + '_' + df['PROC_CODE']
        
        # Deduplicate orders - keep the latest result_time for each order
        orders_data = df[['PATIENT_MRN', 'PAT_ENC_CSN_ID', 'ORDER_TIME', 
                         'PROC_CODE', 'PROC_NAME', 'RESULT_TIME', 'order_id']].copy()
        orders_data = orders_data.sort_values('RESULT_TIME').drop_duplicates('order_id', keep='last')
        
        # Deduplicate results - keep the latest result for each order_id and component_id combination
        results_data = df[['order_id', 'COMPONENT_ID', 'LAB_COMPONENT_DESCRIPTION', 
                          'LAB_RESULT_VALUE', 'RESULT_TIME']].copy()
        results_data = results_data.sort_values('RESULT_TIME').drop_duplicates(['order_id', 'COMPONENT_ID'], keep='last')
        
        # Add source file and timestamps
        source_file = os.path.basename(file_path)
        current_time = datetime.now().isoformat()
        
        orders_data['source_file'] = source_file
        orders_data['created_at'] = current_time
        orders_data['updated_at'] = current_time
        orders_data['order_type'] = 'LAB'
        
        results_data['source_file'] = source_file
        results_data['created_at'] = current_time
        results_data['updated_at'] = current_time
        
        with conn.cursor() as cur:
            # Upsert lab orders
            execute_values(cur, """
                INSERT INTO clinical.lab_orders 
                (order_id, patient_mrn, order_type, lab_code, lab_name,
                 order_time, result_time, source_file, created_at, updated_at)
                VALUES %s
                ON CONFLICT (order_id) DO UPDATE SET
                    result_time = EXCLUDED.result_time,
                    updated_at = CURRENT_TIMESTAMP
            """, orders_data[['order_id', 'PATIENT_MRN', 'order_type', 'PROC_CODE', 
                            'PROC_NAME', 'ORDER_TIME', 'RESULT_TIME', 'source_file',
                            'created_at', 'updated_at']].values.tolist())
            
            # Upsert lab results
            execute_values(cur, """
                INSERT INTO clinical.lab_results 
                (order_id, component_id, component_name, result_value,
                 result_time, source_file, created_at, updated_at)
                VALUES %s
                ON CONFLICT (order_id, component_id) DO UPDATE SET
                    result_value = EXCLUDED.result_value,
                    updated_at = CURRENT_TIMESTAMP
            """, results_data[['order_id', 'COMPONENT_ID', 'LAB_COMPONENT_DESCRIPTION',
                             'LAB_RESULT_VALUE', 'RESULT_TIME', 'source_file',
                             'created_at', 'updated_at']].values.tolist())
            
            conn.commit()
        
        print(f"Processed {len(df)} records...")
            
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        conn.rollback()
        raise

def main():
    if len(sys.argv) != 2:
        print("Usage: python import_labs.py <path_to_file>")
        sys.exit(1)
        
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist")
        sys.exit(1)
    
    print(f"Starting import of {file_path}...")
    conn = None
    
    try:
        conn = connect_db()
        import_labs(file_path, conn)
        print("Import completed successfully!")
    except Exception as e:
        print(f"Error during import: {str(e)}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 
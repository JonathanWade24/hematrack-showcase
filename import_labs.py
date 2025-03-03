#!/usr/bin/env python3

import csv
from datetime import datetime
import sys
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def clean_timestamp(ts):
    """Clean and validate timestamp strings."""
    if not ts or ts.strip() == 'NULL':
        return ''
    
    # Try different timestamp formats
    formats = [
        '%Y-%m-%d %H:%M:%S.%f',
        '%Y-%m-%d %H:%M:%S'
    ]
    
    ts = ts.strip()
    for fmt in formats:
        try:
            return datetime.strptime(ts, fmt).strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            continue
    
    logger.warning(f"Could not parse timestamp: {ts}")
    return ''

def clean_string(s, max_length=None):
    """Clean and validate string fields."""
    if not s or s.strip() == 'NULL':
        return ''
    
    cleaned = s.strip()
    if max_length and len(cleaned) > max_length:
        logger.warning(f"String truncated from {len(cleaned)} to {max_length} characters: {cleaned[:50]}...")
        return cleaned[:max_length]
    return cleaned

def process_labs_file(input_file, output_file):
    """Process the labs data file and create a clean CSV."""
    try:
        input_path = Path(input_file)
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")

        total_rows = 0
        processed_rows = 0
        error_rows = 0

        logger.info(f"Starting to process {input_file}")
        
        with open(input_file, 'r') as infile, open(output_file, 'w', newline='') as outfile:
            reader = csv.reader(infile, delimiter='|')
            writer = csv.writer(outfile, delimiter='\t')  # Use tab as delimiter to avoid CSV quoting issues
            
            # Process header
            header = next(reader)
            writer.writerow([h.strip() for h in header])
            
            # Process data rows
            for row_num, row in enumerate(reader, start=2):
                total_rows += 1
                
                try:
                    # Ensure we have enough columns
                    if len(row) < 9:
                        logger.warning(f"Row {row_num}: Insufficient columns ({len(row)})")
                        error_rows += 1
                        continue

                    # Clean and validate required fields
                    patient_mrn = clean_string(row[0], 50)
                    pat_enc_csn_id = clean_string(row[1], 50)
                    
                    if not patient_mrn or not pat_enc_csn_id:
                        logger.warning(f"Row {row_num}: Missing required fields")
                        error_rows += 1
                        continue

                    # Process the row
                    cleaned_row = [
                        patient_mrn,
                        pat_enc_csn_id,
                        clean_timestamp(row[2]),              # order_time
                        clean_string(row[3], 50),            # proc_code
                        clean_string(row[4], 200),           # proc_name
                        clean_string(row[5], 50),            # component_id
                        clean_string(row[6], 200),           # lab_component_description
                        clean_string(row[7]),                # lab_result_value (text field, no length limit)
                        clean_timestamp(row[8])              # result_time
                    ]
                    
                    writer.writerow(cleaned_row)
                    processed_rows += 1

                    # Log progress every 100,000 rows
                    if processed_rows % 100000 == 0:
                        logger.info(f"Processed {processed_rows:,} rows...")

                except Exception as e:
                    logger.error(f"Error processing row {row_num}: {str(e)}")
                    error_rows += 1
                    continue

        # Log final statistics
        logger.info(f"""
Processing complete:
- Total rows: {total_rows:,}
- Processed rows: {processed_rows:,}
- Error rows: {error_rows:,}
- Success rate: {(processed_rows/total_rows)*100:.2f}%
        """)

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        raise

if __name__ == '__main__':
    input_file = 'IN495734_SCD_labs_Baseline.txt'
    output_file = 'labs_clean.csv'
    
    try:
        process_labs_file(input_file, output_file)
    except Exception as e:
        logger.error(f"Failed to process labs file: {str(e)}")
        sys.exit(1) 
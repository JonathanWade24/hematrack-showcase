import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import os
import sys
import re

def connect_db():
    try:
        return psycopg2.connect(
            dbname=os.environ.get("PGDATABASE", "hema_track_demo"),
            user=os.environ.get("PGUSER", "demo"),
            password=os.environ.get("PGPASSWORD", "demo"),
            host=os.environ.get("PGHOST", "localhost"),
            port=os.environ.get("PGPORT", "5432")
        )
    except psycopg2.Error as e:
        print(f"Error connecting to database: {str(e)}")
        sys.exit(1)

def clean_numeric_value(value):
    """Clean and convert values to numeric, handling special cases"""
    if pd.isna(value) or value == '' or str(value).upper() in ['N/A', 'NA', '#DIV/0!']:
        return None
    
    # Handle string values that might contain numbers
    if isinstance(value, str):
        # Remove any non-numeric characters except decimal point and negative sign
        cleaned = re.sub(r'[^\d.-]', '', str(value))
        if cleaned == '' or cleaned == '.' or cleaned == '-':
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def clean_date_value(value):
    """Clean and convert date values"""
    if pd.isna(value) or value == '' or str(value).upper() in ['N/A', 'NA']:
        return None
    
    try:
        # Try to parse the date
        return pd.to_datetime(value, errors='coerce')
    except:
        return None

def clean_text_value(value, max_length=None):
    """Clean text values"""
    if pd.isna(value) or value == '' or str(value).upper() in ['N/A', 'NA']:
        return None
    
    text = str(value).strip()
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text if text else None

def import_alloimmunization_data(file_path, conn):
    try:
        # Read the CSV file
        df = pd.read_csv(file_path, encoding='utf-8')
        print(f"Read {len(df)} rows from {file_path}")
        
        # Clean column names
        df.columns = df.columns.str.strip()
        
        # Filter out empty rows (where Subject ID is empty)
        df = df[df['Subject ID (Patient ID only, no visit numbers)'].notna() & 
                (df['Subject ID (Patient ID only, no visit numbers)'] != '')]
        
        print(f"Processing {len(df)} valid records")
        
        current_time = datetime.now().isoformat()
        source_file = os.path.basename(file_path)
        
        with conn.cursor() as cur:
            # Process each row
            for idx, row in df.iterrows():
                subject_id = clean_text_value(row['Subject ID (Patient ID only, no visit numbers)'], 20)
                if not subject_id:
                    continue
                
                # Create a sample_id combining subject_id and timepoint
                timepoint = clean_text_value(row['Timepoint'], 50) or 'BL'
                sample_number = row['Serial number'] if pd.notna(row['Serial number']) else idx + 1
                sample_id = f"{subject_id}-{timepoint}"
                
                # Insert/Update omics_subjects (using subject_id as patient_mrn for now)
                cur.execute("""
                    INSERT INTO laboratory.omics_subjects 
                    (subject_id, patient_mrn, project, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (subject_id) DO UPDATE SET
                        updated_at = EXCLUDED.updated_at
                """, (subject_id, subject_id, 'ALLO', current_time, current_time))
                
                # Insert/Update samples
                collection_date = clean_date_value(row['Collection Date'])
                age_at_collection = clean_numeric_value(row['Age at time of collection'])
                genotype = clean_text_value(row['Genotype'], 50)
                transfusion_status = clean_text_value(row['Transfusion Status'], 50)
                
                cur.execute("""
                    INSERT INTO laboratory.samples 
                    (sample_id, subject_id, sample_number, date_of_collection, age_at_collection,
                     genotype, transfusion_status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sample_id) DO UPDATE SET
                        date_of_collection = EXCLUDED.date_of_collection,
                        age_at_collection = EXCLUDED.age_at_collection,
                        genotype = EXCLUDED.genotype,
                        transfusion_status = EXCLUDED.transfusion_status,
                        updated_at = EXCLUDED.updated_at
                """, (sample_id, subject_id, sample_number, collection_date, age_at_collection,
                      genotype, transfusion_status, current_time, current_time))
                
                # Insert Advia results if present
                advia_date = clean_date_value(row['Advia Assay Date'])
                if advia_date or any(pd.notna(row[col]) for col in df.columns if 'Advia' in col):
                    cur.execute("""
                        INSERT INTO laboratory.results_advia 
                        (sample_id, date_advia, rbc_advia, hb_advia, hct_advia, mcv_advia, mch_advia,
                         mchc_advia, rdw_advia, hdw_advia, plt_advia, mpv_advia, wbc_advia, neut_advia,
                         retic_advia, chr_advia, hc41_v120_advia, hc41_v60_120_advia, hc41_v60_advia,
                         drbc_advia, hyper_advia, nrbc_advia, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            date_advia = EXCLUDED.date_advia,
                            rbc_advia = EXCLUDED.rbc_advia,
                            hb_advia = EXCLUDED.hb_advia,
                            hct_advia = EXCLUDED.hct_advia,
                            mcv_advia = EXCLUDED.mcv_advia,
                            mch_advia = EXCLUDED.mch_advia,
                            mchc_advia = EXCLUDED.mchc_advia,
                            rdw_advia = EXCLUDED.rdw_advia,
                            hdw_advia = EXCLUDED.hdw_advia,
                            plt_advia = EXCLUDED.plt_advia,
                            mpv_advia = EXCLUDED.mpv_advia,
                            wbc_advia = EXCLUDED.wbc_advia,
                            neut_advia = EXCLUDED.neut_advia,
                            retic_advia = EXCLUDED.retic_advia,
                            chr_advia = EXCLUDED.chr_advia,
                            hc41_v120_advia = EXCLUDED.hc41_v120_advia,
                            hc41_v60_120_advia = EXCLUDED.hc41_v60_120_advia,
                            hc41_v60_advia = EXCLUDED.hc41_v60_advia,
                            drbc_advia = EXCLUDED.drbc_advia,
                            hyper_advia = EXCLUDED.hyper_advia,
                            nrbc_advia = EXCLUDED.nrbc_advia,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        sample_id, advia_date,
                        clean_numeric_value(row['Advia RBC (10^6/uL)']),
                        clean_numeric_value(row['Advia Hb (g/dL)']),
                        clean_numeric_value(row['Advia Hct (%)']),
                        clean_numeric_value(row['Advia MCV (fL)']),
                        clean_numeric_value(row['Advia MCH (pg)']),
                        clean_numeric_value(row['Advia MCHC (g/dL)']),
                        clean_numeric_value(row['Advia RDW (%)']),
                        clean_numeric_value(row['Advia HDW (g/dL)']),
                        clean_numeric_value(row['Advia Plt (10^3/uL)']),
                        clean_numeric_value(row['Advia MPV (fL)']),
                        clean_numeric_value(row['Advia #WBC (10^3/uL)']),
                        clean_numeric_value(row['Advia #Neut (10^3/uL)']),
                        clean_numeric_value(row['Advia #Retic (10^9/L)']),
                        clean_numeric_value(row['Advia CHr (pg)']),
                        clean_numeric_value(row['Advia %HC>41, V>120']),
                        clean_numeric_value(row['Advia %HC>41, V=60-120']),
                        clean_numeric_value(row['Advia %HC>41, V<60']),
                        clean_numeric_value(row['Advia %DRBC']),
                        clean_numeric_value(row['Advia %Hyper']),
                        clean_numeric_value(row['Advia %NRBC']),
                        current_time, current_time
                    ))
                
                # Insert Lorrca results if present
                if any(pd.notna(row[col]) for col in df.columns if 'Lorrca' in col):
                    cur.execute("""
                        INSERT INTO laboratory.results_lorrca 
                        (sample_id, ei_min_lorrca, ei_max_lorrca, ei_delta_lorrca, pos_lorrca,
                         qc_pass_lorrca, qc_notes_lorrca, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            ei_min_lorrca = EXCLUDED.ei_min_lorrca,
                            ei_max_lorrca = EXCLUDED.ei_max_lorrca,
                            ei_delta_lorrca = EXCLUDED.ei_delta_lorrca,
                            pos_lorrca = EXCLUDED.pos_lorrca,
                            qc_pass_lorrca = EXCLUDED.qc_pass_lorrca,
                            qc_notes_lorrca = EXCLUDED.qc_notes_lorrca,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        sample_id,
                        clean_numeric_value(row['Lorrca EI Min']),
                        clean_numeric_value(row['Lorrca EI Max']),
                        clean_numeric_value(row['Lorrca EI Delta']),
                        clean_text_value(row['Lorrca POS'], 50),
                        clean_text_value(row['Lorrca ID'], 50),
                        clean_text_value(row['Lorrca Notes']),
                        current_time, current_time
                    ))
                
                # Insert Viscosity results if present
                if any(pd.notna(row[col]) for col in ['Visc 45 s-1', 'Visc 225 s-1', 'HVR 45s-1', 'HVR 225 s-1']):
                    cur.execute("""
                        INSERT INTO laboratory.results_viscosity 
                        (sample_id, visc_45, visc_225, hvr_45, hvr_225, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            visc_45 = EXCLUDED.visc_45,
                            visc_225 = EXCLUDED.visc_225,
                            hvr_45 = EXCLUDED.hvr_45,
                            hvr_225 = EXCLUDED.hvr_225,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        sample_id,
                        clean_numeric_value(row['Visc 45 s-1']),
                        clean_numeric_value(row['Visc 225 s-1']),
                        clean_numeric_value(row['HVR 45s-1']),
                        clean_numeric_value(row['HVR 225 s-1']),
                        current_time, current_time
                    ))
                
                # Insert DNA results if present
                if any(pd.notna(row[col]) for col in df.columns if 'DNA' in col):
                    cur.execute("""
                        INSERT INTO laboratory.results_dna 
                        (sample_id, concentration_1_dna, purity_1_dna, concentration_2_dna, purity_2_dna,
                         created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            concentration_1_dna = EXCLUDED.concentration_1_dna,
                            purity_1_dna = EXCLUDED.purity_1_dna,
                            concentration_2_dna = EXCLUDED.concentration_2_dna,
                            purity_2_dna = EXCLUDED.purity_2_dna,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        sample_id,
                        clean_numeric_value(row['DNA Qubit concentration Aliquot 1']),
                        clean_numeric_value(row['DNA 260/280 aliquot 1']),
                        clean_numeric_value(row['DNA Qubit concentration Aliquot 2']),
                        clean_numeric_value(row['DNA 260/280 Aliquot 2']),
                        current_time, current_time
                    ))
                
                # Insert Plasma results if present
                plasma_vol = clean_numeric_value(row['Plasma Vol (uL)'])
                if plasma_vol:
                    cur.execute("""
                        INSERT INTO laboratory.results_plasma 
                        (sample_id, vol_plasma_1, created_at, updated_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            vol_plasma_1 = EXCLUDED.vol_plasma_1,
                            updated_at = EXCLUDED.updated_at
                    """, (sample_id, plasma_vol, current_time, current_time))
                
                # Insert PBMC results if present
                if any(pd.notna(row[col]) for col in df.columns if 'PBMC' in col):
                    cur.execute("""
                        INSERT INTO laboratory.results_pbmc 
                        (sample_id, cell_number_1_pbmc, cell_number_2_pbmc, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            cell_number_1_pbmc = EXCLUDED.cell_number_1_pbmc,
                            cell_number_2_pbmc = EXCLUDED.cell_number_2_pbmc,
                            updated_at = EXCLUDED.updated_at
                    """, (
                        sample_id,
                        clean_numeric_value(row['PBMC Concentration Aliquot 1 (10^6 cells/mL)']),
                        clean_numeric_value(row['PBMC Concentration Aliquot 2 (10^6 cells/mL)']),
                        current_time, current_time
                    ))
                
                # Insert Adhesion results if present
                cells_adhered = clean_numeric_value(row['Laminin Adhesion # of cells Adhered: Sample'])
                if cells_adhered:
                    cur.execute("""
                        INSERT INTO laboratory.results_adhesion 
                        (sample_id, cells_adhered_adhesion, created_at, updated_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            cells_adhered_adhesion = EXCLUDED.cells_adhered_adhesion,
                            updated_at = EXCLUDED.updated_at
                    """, (sample_id, cells_adhered, current_time, current_time))
                
                # Insert F-cells results if present
                f_cells_percent = clean_numeric_value(row['Flow F Cells (%)'])
                if f_cells_percent:
                    cur.execute("""
                        INSERT INTO laboratory.results_fcells 
                        (sample_id, percent_f_cells, created_at, updated_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (sample_id) DO UPDATE SET
                            percent_f_cells = EXCLUDED.percent_f_cells,
                            updated_at = EXCLUDED.updated_at
                    """, (sample_id, f_cells_percent, current_time, current_time))
        
        conn.commit()
        print(f"\nSuccessfully imported {len(df)} records from {source_file}")
        print(f"  - Created/updated {len(df.groupby('Subject ID (Patient ID only, no visit numbers)'))} unique subjects")
        print(f"  - Created/updated {len(df)} samples with associated laboratory results")
        
    except Exception as e:
        print(f"Error processing file {file_path}: {str(e)}")
        conn.rollback()
        raise

def main():
    if len(sys.argv) != 2:
        print("Usage: python import_alloimmunization_data.py <csv_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist")
        sys.exit(1)
    
    conn = None
    
    try:
        conn = connect_db()
        print(f"Starting import of {file_path}...")
        import_alloimmunization_data(file_path, conn)
        print("\nImport completed successfully!")
        
    except Exception as e:
        print(f"Error during import: {str(e)}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main() 
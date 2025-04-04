#!/usr/bin/env python
import json
import random
import uuid
import datetime
from faker import Faker
import pandas as pd
import numpy as np

# Initialize faker
fake = Faker()

# Configuration
NUM_SUBJECTS = 15
NUM_SAMPLES_PER_SUBJECT = [1, 3]  # Min, max samples per subject
OUTPUT_FILE = "demo_import_data.csv"

# Genotype options
GENOTYPES = ["HbSS", "HbSC", "HbS/β⁰-thalassemia", "HbS/β⁺-thalassemia", "HbAS"]

# QC status options
QC_STATUS = ["Yes", "No", "Review"]

# Function to generate a random date in the past 2 years
def random_date():
    days_back = random.randint(0, 730)  # Up to 2 years back
    return (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime("%Y-%m-%d")

# Function to generate a random numeric value with possible null
def random_numeric(min_val, max_val, decimal_places=2, null_chance=0.1):
    if random.random() < null_chance:
        return None
    return round(random.uniform(min_val, max_val), decimal_places)

# Generate subject data
subjects = []
for i in range(NUM_SUBJECTS):
    subject_id = f"SCD{str(i+1).zfill(3)}"
    genotype = random.choice(GENOTYPES)
    
    # Generate samples for this subject
    num_samples = random.randint(NUM_SAMPLES_PER_SUBJECT[0], NUM_SAMPLES_PER_SUBJECT[1])
    for j in range(num_samples):
        sample_id = f"{subject_id}-{j+1}"
        collection_date = random_date()
        
        # Calculate age at collection (random between 5-60 years)
        age_at_collection = random.randint(5, 60)
        
        # Generate sample data
        sample = {
            "id": str(uuid.uuid4()),
            "project": "SCD Dashboard Demo",
            "subject_id": subject_id,
            "sample_number": j+1,
            "sample_id": sample_id,
            "date_of_collection": collection_date,
            "age_at_collection": age_at_collection,
            "genotype": genotype,
            "sex": random.choice(["Male", "Female"]),
            "therapies": random.choice(["Hydroxyurea", "Transfusion", "None", "Voxelotor"]),
            "days_to_processing": random.randint(0, 3),
            "steady_state": random.choice(["Yes", "No"]),
            "transfusion_status": random.choice(["Pre", "Post", "None"]),
            "transfusion_confirmed": random.choice(["Yes", "No"]),
            
            # ADVIA data
            "date_advia": collection_date,
            "rbc_advia": random_numeric(2.0, 6.0),
            "hb_advia": random_numeric(6.0, 15.0),
            "hct_advia": random_numeric(25.0, 45.0),
            "mcv_advia": random_numeric(65.0, 95.0),
            "mch_advia": random_numeric(20.0, 32.0),
            "mchc_advia": random_numeric(28.0, 36.0),
            "rdw_advia": random_numeric(12.0, 25.0),
            "hdw_advia": random_numeric(2.0, 4.0),
            "plt_advia": random_numeric(50.0, 450.0),
            "mpv_advia": random_numeric(7.0, 12.0),
            "wbc_advia": random_numeric(3.0, 15.0),
            "neut_advia": random_numeric(1.0, 8.0),
            "retic_advia": random_numeric(1.0, 15.0),
            "chr_advia": random_numeric(25.0, 35.0),
            "qc_pass_advia": random.choice(QC_STATUS),
            "qc_notes_advia": "Automated import from demo script" if random.random() < 0.3 else None,
            
            # LORRCA data
            "date_lorrca": collection_date,
            "ei_min_lorrca": random_numeric(0.1, 0.5),
            "ei_max_lorrca": random_numeric(0.5, 0.8),
            "ei_delta_lorrca": random_numeric(0.3, 0.6),
            "pos_lorrca": random_numeric(0.0, 3.0),
            "instrument_lorrca": "LORRCA-" + str(random.randint(1, 3)),
            "qc_pass_lorrca": random.choice(QC_STATUS),
            "qc_notes_lorrca": "Demo import data" if random.random() < 0.3 else None,
            
            # DNA data
            "date_dna": collection_date,
            "concentration_1_dna": random_numeric(20.0, 200.0),
            "purity_1_dna": random_numeric(1.7, 2.0, 2),
            "concentration_2_dna": random_numeric(15.0, 180.0),
            "purity_2_dna": random_numeric(1.7, 2.0, 2),
            "qc_pass_dna": random.choice(QC_STATUS),
            "qc_notes_dna": None,
            
            # PBMC data
            "date_pmbc": collection_date,
            "cell_number_1_pbmc": random_numeric(1000000, 50000000, 0),
            "cell_number_2_pbmc": random_numeric(800000, 40000000, 0),
            "sent_to_gt_pbmc": random.choice(["Yes", "No"]),
            "qc_notes_pbmc": None,
            
            # Plasma data
            "date_plasma": collection_date,
            "vol_plasma_1": random_numeric(0.5, 3.0),
            "vol_plasma_2": random_numeric(0.5, 2.5),
            "vol_plasma_3": random_numeric(0.0, 2.0, null_chance=0.4),
            "qc_notes_plasma": None,
            
            # F-cells data
            "date_f_cells": collection_date,
            "percent_f_cells": random_numeric(1.0, 30.0),
            "stain_f_cells": "Thiazole Orange",
            "cytometer_f_cells": "Flow Cytometer X",
            "qc_pass_f_cells": random.choice(QC_STATUS),
            "qc_notes_f_cells": None,
            
            # HPLC data
            "date_hplc": collection_date,
            "hbf_percent_grady_hplc": random_numeric(0.5, 25.0),
            "hba_percent_grady_hplc": random_numeric(10.0, 50.0),
            "hbs_percent_grady_hplc": random_numeric(30.0, 90.0),
            
            # Generated timestamp fields
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }
        
        subjects.append(sample)

# Convert to DataFrame and save as CSV
df = pd.DataFrame(subjects)

# Write to CSV
df.to_csv(OUTPUT_FILE, index=False)
print(f"Generated {len(subjects)} sample records in {OUTPUT_FILE}")

# Also create a JSON file for programmatic use
with open("demo_import_data.json", "w") as f:
    json.dump(subjects, f, indent=2)
print(f"Generated JSON data in demo_import_data.json")

# Print a summary
print("\nSummary of generated data:")
print(f"- Number of subjects: {NUM_SUBJECTS}")
print(f"- Number of samples: {len(subjects)}")
print(f"- Columns in dataset: {len(df.columns)}")
print("\nSample columns: subject_id, sample_id, date_of_collection, genotype, rbc_advia, hb_advia...")
print("\nHint: You can use this data with the data-import page at http://localhost:3000/data-import")
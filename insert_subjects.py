import pandas as pd
import psycopg2
from datetime import datetime

# Read MRN mapping
df = pd.read_excel('../Omics_MRN_2.2.2025.xlsx')
df['MRN'] = df['MRN'].astype(str)  # Convert MRNs to strings

# Connect to database
conn = psycopg2.connect('postgresql://jonathanwade:Bnyj1L930@localhost:5432/scd_research_secure')
cur = conn.cursor()

# Get existing patients
cur.execute('SELECT patient_mrn FROM phi.patients')
valid_mrns = {row[0] for row in cur.fetchall()}

# Track progress
inserted = 0
skipped = 0
now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# Insert subjects
for _, row in df.iterrows():
    subject_id = row['Subject ID']
    mrn = row['MRN']
    
    if mrn not in valid_mrns:
        print(f'Skipping {subject_id} - MRN {mrn} not found in patients table')
        skipped += 1
        continue
        
    try:
        cur.execute('''
            INSERT INTO laboratory.omics_subjects (subject_id, patient_mrn, project, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
        ''', (subject_id, mrn, 'OMI', now, now))
        conn.commit()
        inserted += 1
    except psycopg2.Error as e:
        conn.rollback()
        print(f'Error inserting {subject_id}: {str(e)}')
        skipped += 1

print(f'\nInserted {inserted} subjects')
print(f'Skipped {skipped} subjects')

cur.close()
conn.close() 
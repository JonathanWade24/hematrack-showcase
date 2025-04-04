#!/usr/bin/env python3
import csv
import random
from random import randint
import datetime
import os
from faker import Faker

# Initialize faker
fake = Faker()

# Set output directory
OUTPUT_DIR = "import_demo_data"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Shared patient data to ensure consistency across files
PATIENT_COUNT = 10
PATIENTS = []

for i in range(PATIENT_COUNT):
    mrn = f"MRN{str(i+randint(1, 730)).zfill(6)}"
    gender = random.choice(["Male", "Female"])
    if gender == "Male":
        first_name = fake.first_name_male()
    else:
        first_name = fake.first_name_female()
    
    PATIENTS.append({
        "mrn": mrn,
        "name": f"{fake.last_name()}, {first_name}",
        "birth_date": fake.date_of_birth(minimum_age=5, maximum_age=70).strftime("%Y-%m-%d"),
        "gender": gender,
        "race": random.choice(["Black or African American", "White", "Asian", "Other"]),
        "ethnicity": random.choice(["Hispanic or Latino", "Not Hispanic or Latino", "Unknown"]),
        "hsp_account_ids": [f"HSP{fake.random_number(digits=8)}" for _ in range(3)]
    })

# Generate random date within the last 2 years
def random_date():
    days_back = random.randint(1, 730)
    return (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime("%Y-%m-%d")

# Generate random date-time within the last 2 years
def random_datetime():
    days_back = random.randint(1, 730)
    hours = random.randint(0, 23)
    minutes = random.randint(0, 59)
    seconds = random.randint(0, 59)
    microseconds = random.randint(0, 999999)
    base_date = datetime.datetime.now() - datetime.timedelta(days=days_back)
    result_date = base_date.replace(hour=hours, minute=minutes, second=seconds, microsecond=microseconds)
    return result_date.strftime("%Y-%m-%d %H:%M:%S.%f+00")

# Generate demographics data
def generate_demographics():
    filename = os.path.join(OUTPUT_DIR, "demographics.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "PATIENT_NAME", "BIRTH_DATE", "GENDER", 
            "RACE", "ETHNICITY", "AGE", "IS_TOBACCO_USER_YN", 
            "ALCOHOL_USER_YN", "ILL_DRUG_USER_YN"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for patient in PATIENTS:
            writer.writerow({
                "PATIENT_MRN": patient["mrn"],
                "PATIENT_NAME": patient["name"],
                "BIRTH_DATE": patient["birth_date"],
                "GENDER": patient["gender"],
                "RACE": patient["race"],
                "ETHNICITY": patient["ethnicity"],
                "AGE": str(datetime.datetime.now().year - int(patient["birth_date"][:4])),
                "IS_TOBACCO_USER_YN": random.choice(["Y", "N"]),
                "ALCOHOL_USER_YN": random.choice(["Y", "N"]),
                "ILL_DRUG_USER_YN": random.choice(["Y", "N"])
            })
    
    return filename

# Generate bone marrow data
def generate_bone_marrow():
    filename = os.path.join(OUTPUT_DIR, "bonemarrow.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "HSP_ACCOUNT_ID", "ORDER_ID", "RESULT_TIME", 
            "LAB_CODE", "LAB_NAME", "COMPONENT_ID", "LAB_COMPONENT_DESCRIPTION", 
            "BONE_MARROW_RESULTS_BY_COMPONENT"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Bone marrow test information
        lab_components = [
            {"code": "BMB", "name": "Bone Marrow Biopsy", "components": [
                {"id": "CELL", "desc": "Cellularity", "results": ["Normocellular", "Hypercellular", "Hypocellular"]},
                {"id": "ERY", "desc": "Erythroid Series", "results": ["Normoblastic", "Megaloblastic", "Dysplastic"]},
                {"id": "MYE", "desc": "Myeloid Series", "results": ["Normal maturation", "Increased", "Decreased"]}
            ]},
            {"code": "MAS", "name": "Bone Marrow Aspirate", "components": [
                {"id": "M:E", "desc": "M:E Ratio", "results": ["3:1", "2:1", "1:1", "1:2", "1:3"]},
                {"id": "IRON", "desc": "Iron Stain", "results": ["Present", "Absent", "Increased", "Decreased"]},
                {"id": "MEGA", "desc": "Megakaryocytes", "results": ["Adequate", "Increased", "Decreased"]}
            ]}
        ]
        
        for patient in PATIENTS:
            # Each patient may have 0-2 bone marrow studies
            for _ in range(random.randint(0, 2)):
                hsp_id = random.choice(patient["hsp_account_ids"])
                order_id = f"ORD{fake.random_number(digits=8)}"
                result_time = random_datetime()
                lab_type = random.choice(lab_components)
                
                # Generate multiple components for each sample
                for component in lab_type["components"]:
                    writer.writerow({
                        "PATIENT_MRN": patient["mrn"],
                        "HSP_ACCOUNT_ID": hsp_id,
                        "ORDER_ID": order_id,
                        "RESULT_TIME": result_time,
                        "LAB_CODE": lab_type["code"],
                        "LAB_NAME": lab_type["name"],
                        "COMPONENT_ID": component["id"],
                        "LAB_COMPONENT_DESCRIPTION": component["desc"],
                        "BONE_MARROW_RESULTS_BY_COMPONENT": random.choice(component["results"])
                    })
    
    return filename

# Generate inpatient admissions data
def generate_ip_admissions():
    filename = os.path.join(OUTPUT_DIR, "ipadmissions.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "HSP_ACCOUNT_ID", "ADM_DATE_TIME", "DISCH_DATE_TIME", 
            "ADM_SOURCE", "ADM_TYPE", "DISCH_DISP", "ADM_DX_CD", 
            "ADM_DX_DESCRIPTION", "DISCH_DX_CD", "DISCH_DX_DESCRIPTION"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Diagnosis codes and descriptions
        diagnoses = [
            {"code": "D57.1", "desc": "Sickle-cell disease without crisis"},
            {"code": "D57.00", "desc": "Hb-SS disease with crisis, unspecified"},
            {"code": "D57.01", "desc": "Hb-SS disease with acute chest syndrome"},
            {"code": "D57.02", "desc": "Hb-SS disease with splenic sequestration"},
            {"code": "D57.211", "desc": "Sickle-cell/Hb-C disease with acute chest syndrome"},
            {"code": "D57.219", "desc": "Sickle-cell/Hb-C disease with crisis, unspecified"},
            {"code": "D57.3", "desc": "Sickle-cell trait"},
            {"code": "D57.4", "desc": "Sickle-cell thalassemia without crisis"},
            {"code": "D57.811", "desc": "Other sickle-cell disorders with acute chest syndrome"}
        ]
        
        discharge_dispositions = [
            "Home", "Home Health", "Transfer to Another Facility", 
            "Left Against Medical Advice", "Skilled Nursing Facility"
        ]
        
        admission_sources = [
            "Emergency Room", "Physician Referral", "Transfer From Hospital", 
            "Transfer From SNF", "Clinic Referral"
        ]
        
        admission_types = ["Emergency", "Urgent", "Elective", "Newborn", "Trauma"]
        
        for patient in PATIENTS:
            # Each patient may have 0-5 admissions
            for _ in range(random.randint(0, 5)):
                hsp_id = random.choice(patient["hsp_account_ids"])
                
                # Generate admission date and discharge date (1-14 days later)
                adm_date_str = random_datetime()
                adm_date = datetime.datetime.strptime(adm_date_str, "%Y-%m-%d %H:%M:%S.%f+00")
                los_days = random.randint(1, 14)
                disch_date = adm_date + datetime.timedelta(days=los_days)
                disch_date_str = disch_date.strftime("%Y-%m-%d %H:%M:%S.%f+00")
                
                # Select admission and discharge diagnoses
                adm_dx = random.choice(diagnoses)
                disch_dx = random.choice(diagnoses)  # Could be same or different
                
                writer.writerow({
                    "PATIENT_MRN": patient["mrn"],
                    "HSP_ACCOUNT_ID": hsp_id,
                    "ADM_DATE_TIME": adm_date_str,
                    "DISCH_DATE_TIME": disch_date_str,
                    "ADM_SOURCE": random.choice(admission_sources),
                    "ADM_TYPE": random.choice(admission_types),
                    "DISCH_DISP": random.choice(discharge_dispositions),
                    "ADM_DX_CD": adm_dx["code"],
                    "ADM_DX_DESCRIPTION": adm_dx["desc"],
                    "DISCH_DX_CD": disch_dx["code"],
                    "DISCH_DX_DESCRIPTION": disch_dx["desc"]
                })
    
    return filename

# Generate outpatient AVS medications data
def generate_op_avs_meds():
    filename = os.path.join(OUTPUT_DIR, "opavsmeds.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "HSP_ACCOUNT_ID", "VISIT_DATE", "MEDICATION_NAME",
            "MEDICATION_DOSE", "MEDICATION_ROUTE", "MEDICATION_FREQUENCY",
            "MEDICATION_DURATION", "MEDICATION_STATUS"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Medication information
        medications = [
            {"name": "Hydroxyurea", "doses": ["500 mg", "1000 mg", "1500 mg"], "route": "Oral"},
            {"name": "Folic Acid", "doses": ["1 mg", "5 mg"], "route": "Oral"},
            {"name": "Penicillin VK", "doses": ["250 mg", "500 mg"], "route": "Oral"},
            {"name": "Morphine Sulfate", "doses": ["15 mg", "30 mg"], "route": "Oral"},
            {"name": "Oxycodone", "doses": ["5 mg", "10 mg"], "route": "Oral"},
            {"name": "Cefuroxime", "doses": ["250 mg", "500 mg"], "route": "Oral"},
            {"name": "Voxelotor", "doses": ["500 mg", "1500 mg"], "route": "Oral"},
            {"name": "Crizanlizumab", "doses": ["5 mg/kg"], "route": "IV"},
            {"name": "L-glutamine", "doses": ["5 g", "10 g"], "route": "Oral"}
        ]
        
        frequencies = ["Daily", "Twice daily", "Three times daily", "Every 8 hours", "Once weekly", "As needed"]
        durations = ["30 days", "90 days", "180 days", "Indefinitely", "Until next visit"]
        statuses = ["Active", "Discontinued", "On Hold", "Completed"]
        
        for patient in PATIENTS:
            # Each patient may have 3-10 medications
            for _ in range(random.randint(3, 10)):
                hsp_id = random.choice(patient["hsp_account_ids"])
                visit_date = random_date()
                med = random.choice(medications)
                
                writer.writerow({
                    "PATIENT_MRN": patient["mrn"],
                    "HSP_ACCOUNT_ID": hsp_id,
                    "VISIT_DATE": visit_date,
                    "MEDICATION_NAME": med["name"],
                    "MEDICATION_DOSE": random.choice(med["doses"]),
                    "MEDICATION_ROUTE": med["route"],
                    "MEDICATION_FREQUENCY": random.choice(frequencies),
                    "MEDICATION_DURATION": random.choice(durations),
                    "MEDICATION_STATUS": random.choice(statuses)
                })
    
    return filename

# Generate outpatient visits data
def generate_op_visits():
    filename = os.path.join(OUTPUT_DIR, "opvisits.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "HSP_ACCOUNT_ID", "VISIT_DATE", "VISIT_TYPE",
            "VISIT_PROVIDER", "VISIT_DEPARTMENT", "VISIT_STATUS",
            "VISIT_DX_CD_1", "VISIT_DX_DESCRIPTION_1",
            "VISIT_DX_CD_2", "VISIT_DX_DESCRIPTION_2",
            "VISIT_DX_CD_3", "VISIT_DX_DESCRIPTION_3"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Diagnosis codes and descriptions - same as used in IP admissions
        diagnoses = [
            {"code": "D57.1", "desc": "Sickle-cell disease without crisis"},
            {"code": "D57.00", "desc": "Hb-SS disease with crisis, unspecified"},
            {"code": "D57.01", "desc": "Hb-SS disease with acute chest syndrome"},
            {"code": "D57.02", "desc": "Hb-SS disease with splenic sequestration"},
            {"code": "D57.211", "desc": "Sickle-cell/Hb-C disease with acute chest syndrome"},
            {"code": "D57.219", "desc": "Sickle-cell/Hb-C disease with crisis, unspecified"},
            {"code": "D57.3", "desc": "Sickle-cell trait"},
            {"code": "D57.4", "desc": "Sickle-cell thalassemia without crisis"},
            {"code": "D57.811", "desc": "Other sickle-cell disorders with acute chest syndrome"}
        ]
        
        # Additional diagnoses that might be seen with SCD
        additional_diagnoses = [
            {"code": "E83.2", "desc": "Hemochromatosis"},
            {"code": "I50.9", "desc": "Heart failure, unspecified"},
            {"code": "J18.9", "desc": "Pneumonia, unspecified"},
            {"code": "K76.0", "desc": "Fatty liver disease"},
            {"code": "M54.5", "desc": "Low back pain"},
            {"code": "N18.3", "desc": "Chronic kidney disease, stage 3"},
            {"code": "R56.9", "desc": "Unspecified convulsions"}
        ]
        
        visit_types = ["New Patient", "Established Patient", "Follow Up", "Consultation", "Urgent Visit"]
        providers = ["Dr. Smith", "Dr. Johnson", "Dr. Williams", "Dr. Brown", "Dr. Jones", "Dr. Miller"]
        departments = ["Hematology", "Internal Medicine", "Primary Care", "Pain Management", "Emergency Department"]
        statuses = ["Completed", "No Show", "Canceled", "Rescheduled"]
        
        for patient in PATIENTS:
            # Each patient may have 5-15 outpatient visits
            for _ in range(random.randint(5, 15)):
                hsp_id = random.choice(patient["hsp_account_ids"])
                visit_date = random_date()
                
                # Randomize having 1, 2, or 3 diagnoses
                num_dx = random.randint(1, 3)
                dx_1 = random.choice(diagnoses)
                dx_2 = random.choice(diagnoses + additional_diagnoses) if num_dx > 1 else None
                dx_3 = random.choice(diagnoses + additional_diagnoses) if num_dx > 2 else None
                
                writer.writerow({
                    "PATIENT_MRN": patient["mrn"],
                    "HSP_ACCOUNT_ID": hsp_id,
                    "VISIT_DATE": visit_date,
                    "VISIT_TYPE": random.choice(visit_types),
                    "VISIT_PROVIDER": random.choice(providers),
                    "VISIT_DEPARTMENT": random.choice(departments),
                    "VISIT_STATUS": random.choice(statuses),
                    "VISIT_DX_CD_1": dx_1["code"],
                    "VISIT_DX_DESCRIPTION_1": dx_1["desc"],
                    "VISIT_DX_CD_2": dx_2["code"] if dx_2 else "",
                    "VISIT_DX_DESCRIPTION_2": dx_2["desc"] if dx_2 else "",
                    "VISIT_DX_CD_3": dx_3["code"] if dx_3 else "",
                    "VISIT_DX_DESCRIPTION_3": dx_3["desc"] if dx_3 else ""
                })
    
    return filename

# Generate inpatient medications data
def generate_ip_meds():
    filename = os.path.join(OUTPUT_DIR, "ipmeds.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "HSP_ACCOUNT_ID", "ORDER_DATE", "MEDICATION_NAME",
            "MEDICATION_DOSE", "MEDICATION_ROUTE", "MEDICATION_FREQUENCY",
            "MEDICATION_START_DATE", "MEDICATION_END_DATE", "MEDICATION_INDICATION"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Inpatient medications
        medications = [
            {"name": "Morphine Sulfate", "doses": ["2 mg", "4 mg", "6 mg"], "route": "IV", "indications": ["Pain"]},
            {"name": "Fentanyl", "doses": ["25 mcg", "50 mcg"], "route": "IV", "indications": ["Pain"]},
            {"name": "Hydromorphone", "doses": ["0.5 mg", "1 mg", "2 mg"], "route": "IV", "indications": ["Pain"]},
            {"name": "Normal Saline", "doses": ["1000 mL"], "route": "IV", "indications": ["Hydration"]},
            {"name": "Ceftriaxone", "doses": ["1 g", "2 g"], "route": "IV", "indications": ["Infection"]},
            {"name": "Vancomycin", "doses": ["500 mg", "1 g"], "route": "IV", "indications": ["Infection"]},
            {"name": "Ondansetron", "doses": ["4 mg", "8 mg"], "route": "IV/Oral", "indications": ["Nausea"]},
            {"name": "Methylprednisolone", "doses": ["40 mg", "80 mg", "125 mg"], "route": "IV", "indications": ["Inflammation"]},
            {"name": "Enoxaparin", "doses": ["40 mg", "60 mg"], "route": "Subcutaneous", "indications": ["DVT Prophylaxis"]},
            {"name": "Packed Red Blood Cells", "doses": ["1 unit", "2 units"], "route": "IV", "indications": ["Anemia", "Transfusion"]}
        ]
        
        frequencies = ["Q4H PRN", "Q6H", "Q8H", "Q12H", "Q24H", "One time", "Continuous"]
        
        for patient in PATIENTS:
            # Use existing IP admissions to link medications
            for _ in range(random.randint(3, 10)):
                hsp_id = random.choice(patient["hsp_account_ids"])
                
                # Generate order date, start date and end date
                order_date_str = random_datetime()
                order_date = datetime.datetime.strptime(order_date_str, "%Y-%m-%d %H:%M:%S.%f+00")
                start_date = order_date + datetime.timedelta(hours=random.randint(0, 4))
                # End date is 1-7 days after start
                end_date = start_date + datetime.timedelta(days=random.randint(1, 7), 
                                                         hours=random.randint(0, 23))
                
                med = random.choice(medications)
                
                writer.writerow({
                    "PATIENT_MRN": patient["mrn"],
                    "HSP_ACCOUNT_ID": hsp_id,
                    "ORDER_DATE": order_date_str,
                    "MEDICATION_NAME": med["name"],
                    "MEDICATION_DOSE": random.choice(med["doses"]),
                    "MEDICATION_ROUTE": med["route"],
                    "MEDICATION_FREQUENCY": random.choice(frequencies),
                    "MEDICATION_START_DATE": start_date.strftime("%Y-%m-%d %H:%M:%S.%f+00"),
                    "MEDICATION_END_DATE": end_date.strftime("%Y-%m-%d %H:%M:%S.%f+00"),
                    "MEDICATION_INDICATION": random.choice(med["indications"])
                })
    
    return filename

# Generate laboratory data
def generate_labs():
    filename = os.path.join(OUTPUT_DIR, "labs.csv")
    
    with open(filename, 'w', newline='') as csvfile:
        fieldnames = [
            "PATIENT_MRN", "PAT_ENC_CSN_ID", "ORDER_TIME", "PROC_CODE",
            "PROC_NAME", "COMPONENT_ID", "LAB_COMPONENT_DESCRIPTION",
            "LAB_RESULT_VALUE", "RESULT_TIME"
        ]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Lab tests relevant to SCD
        lab_tests = [
            {
                "name": "CBC WITH DIFFERENTIAL", 
                "code": "LAB1234",
                "components": [
                    {"id": "WBC", "desc": "White Blood Cell Count", "range": (3.0, 15.0), "unit": "K/uL"},
                    {"id": "RBC", "desc": "Red Blood Cell Count", "range": (2.5, 5.5), "unit": "M/uL"},
                    {"id": "HGB", "desc": "Hemoglobin", "range": (6.0, 13.0), "unit": "g/dL"},
                    {"id": "HCT", "desc": "Hematocrit", "range": (18.0, 40.0), "unit": "%"},
                    {"id": "MCV", "desc": "Mean Corpuscular Volume", "range": (80.0, 100.0), "unit": "fL"},
                    {"id": "MCH", "desc": "Mean Corpuscular Hemoglobin", "range": (25.0, 35.0), "unit": "pg"},
                    {"id": "MCHC", "desc": "Mean Corpuscular Hemoglobin Concentration", "range": (30.0, 36.0), "unit": "g/dL"},
                    {"id": "PLT", "desc": "Platelet Count", "range": (150.0, 450.0), "unit": "K/uL"},
                    {"id": "RDW", "desc": "Red Cell Distribution Width", "range": (11.5, 15.0), "unit": "%"},
                    {"id": "NRBC", "desc": "Nucleated RBC", "range": (0.0, 10.0), "unit": "%"}
                ]
            },
            {
                "name": "RETICULOCYTE COUNT", 
                "code": "LAB5678",
                "components": [
                    {"id": "RETIC", "desc": "Reticulocyte Count", "range": (0.5, 20.0), "unit": "%"},
                    {"id": "RETIC-A", "desc": "Absolute Reticulocyte Count", "range": (50.0, 200.0), "unit": "K/uL"}
                ]
            },
            {
                "name": "COMPREHENSIVE METABOLIC PANEL", 
                "code": "LAB9012",
                "components": [
                    {"id": "SODIUM", "desc": "Sodium", "range": (135.0, 145.0), "unit": "mmol/L"},
                    {"id": "POTASSIUM", "desc": "Potassium", "range": (3.5, 5.0), "unit": "mmol/L"},
                    {"id": "CHLORIDE", "desc": "Chloride", "range": (98.0, 107.0), "unit": "mmol/L"},
                    {"id": "CO2", "desc": "Carbon Dioxide", "range": (22.0, 29.0), "unit": "mmol/L"},
                    {"id": "BUN", "desc": "Blood Urea Nitrogen", "range": (7.0, 25.0), "unit": "mg/dL"},
                    {"id": "CREAT", "desc": "Creatinine", "range": (0.6, 1.3), "unit": "mg/dL"},
                    {"id": "GLUCOSE", "desc": "Glucose", "range": (70.0, 110.0), "unit": "mg/dL"},
                    {"id": "ALT", "desc": "Alanine Aminotransferase", "range": (7.0, 56.0), "unit": "U/L"},
                    {"id": "AST", "desc": "Aspartate Aminotransferase", "range": (10.0, 40.0), "unit": "U/L"},
                    {"id": "TBILI", "desc": "Total Bilirubin", "range": (0.3, 4.0), "unit": "mg/dL"},
                    {"id": "DBILI", "desc": "Direct Bilirubin", "range": (0.0, 0.4), "unit": "mg/dL"}
                ]
            },
            {
                "name": "HEMOGLOBIN ELECTROPHORESIS", 
                "code": "LAB3456",
                "components": [
                    {"id": "HB-A", "desc": "Hemoglobin A", "range": (0.0, 70.0), "unit": "%"},
                    {"id": "HB-S", "desc": "Hemoglobin S", "range": (0.0, 100.0), "unit": "%"},
                    {"id": "HB-F", "desc": "Hemoglobin F", "range": (0.0, 30.0), "unit": "%"},
                    {"id": "HB-A2", "desc": "Hemoglobin A2", "range": (1.5, 3.5), "unit": "%"},
                    {"id": "HB-C", "desc": "Hemoglobin C", "range": (0.0, 100.0), "unit": "%"}
                ]
            },
            {
                "name": "FERRITIN", 
                "code": "LAB7890",
                "components": [
                    {"id": "FERRITIN", "desc": "Ferritin", "range": (15.0, 400.0), "unit": "ng/mL"}
                ]
            },
            {
                "name": "IRON STUDIES", 
                "code": "LAB2468",
                "components": [
                    {"id": "IRON", "desc": "Iron", "range": (50.0, 170.0), "unit": "ug/dL"},
                    {"id": "TIBC", "desc": "Total Iron Binding Capacity", "range": (250.0, 450.0), "unit": "ug/dL"},
                    {"id": "TSAT", "desc": "Transferrin Saturation", "range": (20.0, 50.0), "unit": "%"}
                ]
            }
        ]
        
        for patient in PATIENTS:
            # Each patient may have 10-20 lab orders
            for _ in range(random.randint(10, 20)):
                # Random CSN (encounter ID)
                csn_id = f"CSN{fake.random_number(digits=8)}"
                
                # Random order time
                order_time_str = random_datetime()
                order_dt = datetime.datetime.strptime(order_time_str, "%Y-%m-%d %H:%M:%S.%f+00")
                
                # Result time is 0-36 hours after order time
                result_hours = random.randint(0, 36)
                result_dt = order_dt + datetime.timedelta(hours=result_hours)
                result_time_str = result_dt.strftime("%Y-%m-%d %H:%M:%S.%f+00")
                
                # Choose a random lab test panel
                lab_test = random.choice(lab_tests)
                
                # Generate results for each component in the panel
                for component in lab_test["components"]:
                    min_val, max_val = component["range"]
                    # Generate a value within the normal range or sometimes abnormal
                    if random.random() < 0.25:  
                        # Abnormal value - either high or low
                        if random.random() < 0.5:
                            # Low value
                            value = min_val * random.uniform(0.5, 0.9)
                        else:
                            # High value
                            value = max_val * random.uniform(1.1, 1.5)
                    else:
                        # Normal value
                        value = random.uniform(min_val, max_val)
                    
                    # Format the value based on the unit
                    if component["unit"] == "%" or component["unit"] == "K/uL":
                        value_str = f"{value:.1f}"
                    else:
                        value_str = f"{value:.2f}"
                    
                    # Add the unit to some but not all results (to mimic real data inconsistencies)
                    if random.random() < 0.7:
                        value_str = f"{value_str} {component['unit']}"
                    
                    writer.writerow({
                        "PATIENT_MRN": patient["mrn"],
                        "PAT_ENC_CSN_ID": csn_id,
                        "ORDER_TIME": order_time_str,
                        "PROC_CODE": lab_test["code"],
                        "PROC_NAME": lab_test["name"],
                        "COMPONENT_ID": component["id"],
                        "LAB_COMPONENT_DESCRIPTION": component["desc"],
                        "LAB_RESULT_VALUE": value_str,
                        "RESULT_TIME": result_time_str
                    })
    
    return filename

# Generate all data files
def generate_all_data():
    print("Generating demographics data...")
    demo_file = generate_demographics()
    
    print("Generating bone marrow data...")
    bm_file = generate_bone_marrow()
    
    print("Generating inpatient admissions data...")
    ip_adm_file = generate_ip_admissions()
    
    print("Generating outpatient AVS medications data...")
    op_meds_file = generate_op_avs_meds()
    
    print("Generating outpatient visits data...")
    op_visits_file = generate_op_visits()
    
    print("Generating inpatient medications data...")
    ip_meds_file = generate_ip_meds()
    
    print("Generating laboratory data...")
    labs_file = generate_labs()
    
    print("\nGenerated files:")
    print(f"- Demographics: {demo_file}")
    print(f"- Bone Marrow: {bm_file}")
    print(f"- IP Admissions: {ip_adm_file}")
    print(f"- OP AVS Medications: {op_meds_file}")
    print(f"- OP Visits: {op_visits_file}")
    print(f"- IP Medications: {ip_meds_file}")
    print(f"- Labs: {labs_file}")
    
    print("\nThese files can be used with the data-import page at http://localhost:3000/data-import")

if __name__ == "__main__":
    generate_all_data()

# Query Builder Test Cases

## Test Case 1: Simple Query on Patients Table

### Setup
- Select the `patients` table from the `phi` schema
- Select columns: `patient_mrn`, `first_name`, `last_name`, `birth_date`
- Add condition: `last_name` contains 'Smith'

### Expected SQL
```sql
SELECT 
  "t0"."patient_mrn" AS "patient_mrn", 
  "t0"."first_name" AS "first_name", 
  "t0"."last_name" AS "last_name", 
  "t0"."birth_date" AS "birth_date"
FROM 
  "phi"."patients" AS "t0"
WHERE 
  "t0"."last_name" ILIKE '%Smith%'
LIMIT 100
```

### Verification
- Check that results contain only patients with 'Smith' in last_name
- Verify column names are displayed correctly

## Test Case 2: Single Join (Patients to Labs)

### Setup
- Select the `patients` table from the `phi` schema
- Add join to `Labs` table from `clinical` schema on `patient_mrn`
- Select columns: `patients.patient_mrn`, `patients.first_name`, `Labs.lab_component_description`, `Labs.lab_result_value`
- Add condition: `Labs.result_time` > '2023-01-01'

### Expected SQL
```sql
SELECT 
  "t0"."patient_mrn" AS "patient_mrn", 
  "t0"."first_name" AS "first_name", 
  "t1"."lab_component_description" AS "lab_component_description", 
  "t1"."lab_result_value" AS "lab_result_value"
FROM 
  "phi"."patients" AS "t0"
INNER JOIN 
  "clinical"."Labs" AS "t1" ON "t0"."patient_mrn" = "t1"."patient_mrn"
WHERE 
  "t1"."result_time" > '2023-01-01'
LIMIT 100
```

### Verification
- Check that results include data from both tables
- Verify join condition is applied correctly
- Verify date filtering works correctly

## Test Case 3: Multiple Joins (Patients to Labs to Omics)

### Setup
- Select the `patients` table from the `phi` schema
- Add join to `Labs` table from `clinical` schema on `patient_mrn`
- Add join to `omics_subjects` table from `laboratory` schema on `patient_mrn`
- Select columns from all three tables
- Add condition: `Labs.lab_component_description` contains 'Hemoglobin'
- Add condition: `omics_subjects.project` = 'OMI'

### Expected SQL
```sql
SELECT 
  "t0"."patient_mrn" AS "patient_mrn", 
  "t0"."first_name" AS "first_name", 
  "t1"."lab_component_description" AS "lab_component_description", 
  "t1"."lab_result_value" AS "lab_result_value",
  "t2"."subject_id" AS "subject_id",
  "t2"."project" AS "project"
FROM 
  "phi"."patients" AS "t0"
INNER JOIN 
  "clinical"."Labs" AS "t1" ON "t0"."patient_mrn" = "t1"."patient_mrn"
INNER JOIN 
  "laboratory"."omics_subjects" AS "t2" ON "t0"."patient_mrn" = "t2"."patient_mrn"
WHERE 
  "t1"."lab_component_description" ILIKE '%Hemoglobin%'
  AND "t2"."project" = 'OMI'
LIMIT 100
```

### Verification
- Check that results include data from all three tables
- Verify both join conditions are applied correctly
- Verify filtering on joined tables works correctly

## Test Case 4: Complex Conditions with Nested Groups

### Setup
- Select the `patients` table from the `phi` schema
- Add join to `demographics` table from `clinical` schema on `patient_mrn`
- Select relevant columns from both tables
- Add condition group with OR logic:
  - Group 1 (AND):
    - `demographics.gender` = 'Male'
    - `demographics.age` > 50
  - Group 2 (AND):
    - `demographics.gender` = 'Female'
    - `demographics.age` > 60

### Expected SQL
```sql
SELECT 
  "t0"."patient_mrn" AS "patient_mrn", 
  "t0"."first_name" AS "first_name", 
  "t0"."last_name" AS "last_name",
  "t1"."gender" AS "gender",
  "t1"."age" AS "age"
FROM 
  "phi"."patients" AS "t0"
INNER JOIN 
  "clinical"."demographics" AS "t1" ON "t0"."patient_mrn" = "t1"."patient_mrn"
WHERE 
  (
    ("t1"."gender" = 'Male' AND "t1"."age" > 50)
    OR
    ("t1"."gender" = 'Female' AND "t1"."age" > 60)
  )
LIMIT 100
```

### Verification
- Check that results match the complex condition logic
- Verify nested groups with different logical operators work correctly

## Test Case 5: Omics Data Query

### Setup
- Select the `omics_results` table from the `laboratory` schema
- Add join to `omics_subjects` table from `laboratory` schema on `subject_id`
- Add join to `patients` table from `phi` schema on `patient_mrn`
- Select relevant columns from all tables
- Add condition: `omics_results.hbf_percent_grady_hplc` > 10

### Expected SQL
```sql
SELECT 
  "t0"."subject_id" AS "subject_id",
  "t0"."sample_id" AS "sample_id",
  "t0"."hbf_percent_grady_hplc" AS "hbf_percent_grady_hplc",
  "t1"."patient_mrn" AS "patient_mrn",
  "t2"."first_name" AS "first_name",
  "t2"."last_name" AS "last_name"
FROM 
  "laboratory"."omics_results" AS "t0"
INNER JOIN 
  "laboratory"."omics_subjects" AS "t1" ON "t0"."subject_id" = "t1"."subject_id"
INNER JOIN 
  "phi"."patients" AS "t2" ON "t1"."patient_mrn" = "t2"."patient_mrn"
WHERE 
  "t0"."hbf_percent_grady_hplc" > 10
LIMIT 100
```

### Verification
- Check that results include data from all three tables
- Verify the chain of joins works correctly (omics_results → omics_subjects → patients)
- Verify numeric filtering works correctly

## Test Case 6: Clinical Data with Multiple Joins

### Setup
- Select the `unified_visits` table from the `clinical` schema
- Add join to `patients` table from `phi` schema on `patient_mrn`
- Add join to `ip_medications` table from `clinical` schema on `patient_mrn`
- Select relevant columns from all tables
- Add condition: `unified_visits.visit_type` = 'IP' (inpatient)
- Add condition: `ip_medications.medication` contains 'Hydroxyurea'

### Expected SQL
```sql
SELECT 
  "t0"."visit_id" AS "visit_id",
  "t0"."start_date" AS "start_date",
  "t0"."end_date" AS "end_date",
  "t1"."first_name" AS "first_name",
  "t1"."last_name" AS "last_name",
  "t2"."medication" AS "medication",
  "t2"."dosage" AS "dosage"
FROM 
  "clinical"."unified_visits" AS "t0"
INNER JOIN 
  "phi"."patients" AS "t1" ON "t0"."patient_mrn" = "t1"."patient_mrn"
INNER JOIN 
  "clinical"."ip_medications" AS "t2" ON "t0"."patient_mrn" = "t2"."patient_mrn"
WHERE 
  "t0"."visit_type" = 'IP'
  AND "t2"."medication" ILIKE '%Hydroxyurea%'
LIMIT 100
```

### Verification
- Check that results include data from all three tables
- Verify both join conditions are applied correctly
- Verify filtering on multiple joined tables works correctly 
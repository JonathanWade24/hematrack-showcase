# Metadata API Implementation

## Overview

The metadata API will provide information about database tables, columns, and relationships to the query builder frontend. This is a critical component that needs to be robust and efficient.

## API Endpoints

### 1. GET /api/query/metadata/tables

Returns a list of all tables with their schemas, columns, and foreign key relationships.

#### Response Format

```json
[
  {
    "name": "patients",
    "schema": "phi",
    "columns": [
      {
        "name": "patient_mrn",
        "type": "varchar",
        "isNumeric": false
      },
      {
        "name": "first_name",
        "type": "varchar",
        "isNumeric": false
      },
      // ... other columns
    ],
    "foreignKeys": [
      {
        "columnName": "patient_mrn",
        "foreignSchema": "clinical",
        "foreignTable": "Labs",
        "foreignColumn": "patient_mrn"
      },
      // ... other foreign keys
    ]
  },
  // ... other tables
]
```

## Implementation Details

### 1. SQL Query for Metadata

```sql
WITH foreign_keys AS (
  -- Get foreign keys from information_schema
  SELECT 
    kcu.table_schema AS table_schema,
    kcu.table_name AS table_name,
    kcu.column_name AS column_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
  
  UNION ALL
  
  -- Add explicit relationships based on Prisma schema
  -- Clinical tables to patients
  SELECT 
    'clinical' AS table_schema,
    'Labs' AS table_name,
    'patient_mrn' AS column_name,
    'phi' AS foreign_schema,
    'patients' AS foreign_table_name,
    'patient_mrn' AS foreign_column_name
  
  UNION ALL
  -- ... other explicit relationships
),
unique_columns AS (
  -- Get unique columns to avoid duplicates
  SELECT DISTINCT ON (t.table_schema, t.table_name, c.column_name)
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.ordinal_position,
    c.data_type IN ('integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision') AS is_numeric
  FROM 
    information_schema.tables t
  JOIN 
    information_schema.columns c 
    ON t.table_schema = c.table_schema 
    AND t.table_name = c.table_name
  WHERE 
    t.table_schema IN ('app', 'audit', 'clinical', 'laboratory', 'phi')
    AND t.table_type = 'BASE TABLE'
    AND t.table_name != 'audit_log'  -- Exclude audit_log table
  ORDER BY 
    t.table_schema, t.table_name, c.column_name, c.ordinal_position
)
SELECT 
  uc.table_schema as schema,
  uc.table_name as name,
  json_agg(
    json_build_object(
      'name', uc.column_name,
      'type', uc.data_type,
      'isNumeric', uc.is_numeric
    ) ORDER BY uc.ordinal_position
  ) as columns,
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'columnName', fk.column_name,
        'foreignSchema', fk.foreign_schema,
        'foreignTable', fk.foreign_table_name,
        'foreignColumn', fk.foreign_column_name
      )
    ) FILTER (WHERE fk.column_name IS NOT NULL),
    '[]'
  ) as "foreignKeys"
FROM 
  unique_columns uc
LEFT JOIN
  foreign_keys fk
  ON uc.table_schema = fk.table_schema
  AND uc.table_name = fk.table_name
GROUP BY 
  uc.table_schema, uc.table_name
ORDER BY 
  uc.table_schema, uc.table_name;
```

### 2. Explicit Relationships to Add

Based on the Prisma schema, we need to add these explicit relationships:

1. Clinical tables to patients:
   - `clinical.Labs.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.bone_marrow.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.demographics.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.ip_admissions.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.ip_medications.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.op_medications.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.op_visits.patient_mrn` → `phi.patients.patient_mrn`
   - `clinical.unified_visits.patient_mrn` → `phi.patients.patient_mrn`

2. Laboratory tables:
   - `laboratory.omics_subjects.patient_mrn` → `phi.patients.patient_mrn`
   - `laboratory.omics_results.subject_id` → `laboratory.omics_subjects.subject_id`

3. Registration:
   - `phi.subject_registration.patient_mrn` → `phi.patients.patient_mrn`
   - `phi.subject_registration.subject_id` → `laboratory.omics_subjects.subject_id`

### 3. Error Handling

- Validate the response against a Zod schema
- Handle database connection errors
- Provide meaningful error messages
- Add logging for debugging

### 4. Caching Strategy

- Cache the metadata response for 1 hour
- Invalidate cache when database schema changes
- Use in-memory caching for development
- Consider Redis for production

## Implementation Steps

1. Create the API route file at `src/app/api/query/metadata/tables/route.ts`
2. Implement the SQL query with all explicit relationships
3. Add validation using Zod
4. Implement error handling
5. Add caching (optional for initial implementation)
6. Test with the query builder frontend 
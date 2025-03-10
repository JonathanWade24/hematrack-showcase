# Query Builder Implementation Plan

## 1. Database Structure Analysis

### Core Tables
- `patients` (phi schema): Central entity with patient_mrn as primary key
- Clinical tables (clinical schema): All relate to patients via patient_mrn
- `omics_subjects` (laboratory schema): Links patients to omics data
- `omics_results` (laboratory schema): Contains detailed omics data

### Key Relationships
- Clinical tables → patients: via patient_mrn
- omics_subjects → patients: via patient_mrn
- omics_results → omics_subjects: via subject_id
- Clinical tables can relate to each other via patient_mrn or hsp_account_id

## 2. Query Builder Components

### A. Table Selection
- Allow users to select a primary table
- Display tables grouped by schema (clinical, phi, laboratory)
- Show column count for each table

### B. Join Interface
- Show related tables based on foreign key relationships
- For each table, show available join paths:
  - If primary table has patient_mrn, show all tables with patient_mrn
  - If primary table is omics_subjects, show omics_results
  - If primary table is omics_results, show omics_subjects
- Allow custom joins with manual column selection

### C. Column Selection
- Show columns from primary table
- When joins are added, show columns from joined tables
- Prefix columns with table name to avoid ambiguity (e.g., "patients.first_name")
- Group columns by data type

### D. Condition Builder
- Allow conditions on columns from any selected table
- Support all operators (equals, contains, etc.)
- For non-numeric columns, show dropdown of distinct values
- Support nested condition groups with AND/OR logic

### E. Results Display
- Show query results in a paginated table
- Display column names with table prefixes
- Allow export to CSV

## 3. Implementation Steps

### Step 1: Metadata API
- Create an API endpoint that returns:
  - Tables with their schemas
  - Columns for each table with types
  - Foreign key relationships between tables

### Step 2: Table Selection UI
- Implement table selection component
- Group tables by schema
- Show column count

### Step 3: Join Interface
- Implement join selection based on relationships
- Show available join paths
- Allow custom joins

### Step 4: Column Selection
- Show columns from primary and joined tables
- Implement column selection with table prefixes
- Group by data type

### Step 5: SQL Query Builder
- Implement SQL generation for:
  - Basic queries
  - Joins
  - Conditions
  - Ordering and pagination

### Step 6: Testing
- Test simple queries
- Test joins between tables
- Test complex conditions
- Test with large result sets

## 4. SQL Generation Strategy

### Basic Query Template
```sql
SELECT 
  [selected columns with table aliases]
FROM 
  [primary table] AS t0
  [JOIN statements]
WHERE 
  [conditions]
ORDER BY 
  [order columns]
LIMIT [limit] OFFSET [offset]
```

### Join Generation
```sql
[JOIN TYPE] JOIN [schema].[table] AS [alias] ON [join conditions]
```

### Column References
- Always use table aliases: `"t0"."column_name"`
- For result columns, use AS to provide clear names: `"t0"."column_name" AS "table_column_name"`

## 5. Testing Plan

### Test Case 1: Simple Query
- Select from patients table
- Filter by basic conditions
- Verify results

### Test Case 2: Single Join
- Join patients with Labs
- Select columns from both tables
- Filter by conditions from both tables

### Test Case 3: Multiple Joins
- Join patients → Labs → omics_subjects
- Select columns from all tables
- Apply complex filtering

### Test Case 4: Complex Conditions
- Use nested condition groups
- Mix AND/OR logic
- Test all operators

### Test Case 5: Edge Cases
- Handle NULL values
- Test with large result sets
- Verify error handling 
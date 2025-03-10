-- Query to get all foreign key relationships in the database
WITH foreign_keys AS (
    SELECT 
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
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
        AND tc.table_schema IN ('app', 'audit', 'clinical', 'laboratory', 'phi')
)
SELECT 
    fk.table_schema || '.' || fk.table_name AS source_table,
    fk.column_name AS source_column,
    fk.foreign_schema || '.' || fk.foreign_table_name AS target_table,
    fk.foreign_column_name AS target_column
FROM 
    foreign_keys fk
ORDER BY 
    source_table, target_table;

-- Query to get all primary keys
SELECT 
    tc.table_schema || '.' || tc.table_name AS table_name,
    kcu.column_name AS primary_key_column
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema IN ('app', 'audit', 'clinical', 'laboratory', 'phi')
ORDER BY 
    table_name;

-- Query to find potential relationships between clinical tables
SELECT 
    a.table_schema || '.' || a.table_name AS table_a,
    a.column_name AS column_a,
    b.table_schema || '.' || b.table_name AS table_b,
    b.column_name AS column_b
FROM 
    information_schema.columns a
    JOIN information_schema.columns b 
        ON a.column_name = b.column_name
        AND a.data_type = b.data_type
WHERE 
    a.table_schema = 'clinical'
    AND b.table_schema = 'clinical'
    AND a.table_name != b.table_name
    AND a.column_name IN ('patient_mrn', 'hsp_account_id', 'order_id', 'component_id')
ORDER BY 
    a.table_name, b.table_name, a.column_name; 
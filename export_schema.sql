-- Export schema definitions for all schemas
SELECT 
    'CREATE SCHEMA IF NOT EXISTS ' || schema_name || ';'
FROM 
    information_schema.schemata
WHERE 
    schema_name IN ('laboratory', 'clinical', 'phi', 'audit', 'app');

-- Export table definitions
SELECT 
    pg_catalog.pg_get_tabledef(format('%I.%I', schemaname, tablename))
FROM 
    pg_catalog.pg_tables
WHERE 
    schemaname IN ('laboratory', 'clinical', 'phi', 'audit', 'app')
ORDER BY 
    schemaname, tablename;

-- Export view definitions
SELECT 
    pg_catalog.pg_get_viewdef(format('%I.%I', schemaname, viewname), true)
FROM 
    pg_catalog.pg_views
WHERE 
    schemaname IN ('laboratory', 'clinical', 'phi', 'audit', 'app')
ORDER BY 
    schemaname, viewname;

-- Export function definitions
SELECT 
    pg_catalog.pg_get_functiondef(p.oid)
FROM 
    pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname IN ('laboratory', 'clinical', 'phi', 'audit', 'app')
ORDER BY 
    n.nspname, p.proname;

-- Export trigger definitions
SELECT 
    pg_catalog.pg_get_triggerdef(t.oid)
FROM 
    pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE 
    n.nspname IN ('laboratory', 'clinical', 'phi', 'audit', 'app')
    AND NOT t.tgisinternal
ORDER BY 
    n.nspname, c.relname, t.tgname; 
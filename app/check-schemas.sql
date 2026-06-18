-- Check current user and database
SELECT current_user, current_database();

-- Check schema existence and permissions
SELECT 
    n.nspname as "Schema",
    has_schema_privilege(current_user, n.nspname, 'CREATE') as "Has Create",
    has_schema_privilege(current_user, n.nspname, 'USAGE') as "Has Usage"
FROM pg_catalog.pg_namespace n
WHERE n.nspname !~ '^pg_' 
AND n.nspname <> 'information_schema'
ORDER BY 1; 
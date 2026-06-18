-- List all tables in the app schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'app'
ORDER BY table_name, ordinal_position; 
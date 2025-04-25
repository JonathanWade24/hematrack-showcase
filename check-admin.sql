-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'app' 
    AND table_name = 'User'
);

-- Check user data if exists
SELECT id, email, role, password IS NOT NULL as has_password 
FROM app."User" 
WHERE email = 'admin@email.com'; 
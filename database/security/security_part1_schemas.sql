-- Part 1: Create Secure Schemas
-- Part 1: Create Secure Schemas
\connect scd_research_secure

BEGIN;

-- Create new schemas
CREATE SCHEMA IF NOT EXISTS phi;      -- For tables with patient identifiable info
CREATE SCHEMA IF NOT EXISTS clinical; -- For de-identified clinical data
CREATE SCHEMA IF NOT EXISTS audit;    -- For audit logging

-- Verify schemas were created
SELECT nspname AS schema_name 
FROM pg_namespace 
WHERE nspname IN ('phi', 'clinical', 'audit')
ORDER BY schema_name;

COMMIT;
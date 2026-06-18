-- Part 2: Create Roles and Permissions
\connect scd_research_secure

BEGIN;

-- Create roles if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'phi_admin') THEN
        CREATE ROLE phi_admin;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinical_admin') THEN
        CREATE ROLE clinical_admin;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'phi_user') THEN
        CREATE ROLE phi_user;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinical_user') THEN
        CREATE ROLE clinical_user;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'application_service') THEN
        CREATE ROLE application_service;
    END IF;
END
$$;

-- Grant schema permissions
GRANT USAGE ON SCHEMA phi TO phi_admin;
GRANT USAGE ON SCHEMA clinical TO clinical_admin;
GRANT USAGE ON SCHEMA phi TO phi_user;
GRANT USAGE ON SCHEMA clinical TO clinical_user;
GRANT USAGE ON SCHEMA phi, clinical TO application_service;

-- Verify roles were created
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcanlogin 
FROM pg_roles 
WHERE rolname IN ('phi_admin', 'clinical_admin', 'phi_user', 'clinical_user', 'application_service');

COMMIT;
-- Create a testing role with full permissions
CREATE ROLE testing_role;

-- Grant usage on all schemas
GRANT USAGE ON SCHEMA laboratory TO testing_role;
GRANT USAGE ON SCHEMA clinical TO testing_role;
GRANT USAGE ON SCHEMA public TO testing_role;
GRANT USAGE ON SCHEMA phi TO testing_role;
GRANT USAGE ON SCHEMA audit TO testing_role;

-- Grant all privileges on all tables in laboratory schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA laboratory TO testing_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA laboratory GRANT ALL PRIVILEGES ON TABLES TO testing_role;

-- Grant all privileges on all tables in clinical schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA clinical TO testing_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA clinical GRANT ALL PRIVILEGES ON TABLES TO testing_role;

-- Grant all privileges on all tables in phi schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA phi TO testing_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA phi GRANT ALL PRIVILEGES ON TABLES TO testing_role;

-- Grant all privileges on all tables in audit schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO testing_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT ALL PRIVILEGES ON TABLES TO testing_role;

-- Grant all privileges on all tables in public schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO testing_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO testing_role;

-- Grant the testing role to the authenticated role
GRANT testing_role TO authenticated;

-- Grant the testing role to the anon role (for unauthenticated access during testing)
GRANT testing_role TO anon; 
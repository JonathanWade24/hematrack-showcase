-- Create a laboratory_reader role
CREATE ROLE laboratory_reader;

-- Grant usage on the laboratory schema
GRANT USAGE ON SCHEMA laboratory TO laboratory_reader;

-- Grant SELECT permissions on all tables in the laboratory schema
GRANT SELECT ON ALL TABLES IN SCHEMA laboratory TO laboratory_reader;

-- Grant SELECT permissions on future tables in the laboratory schema
ALTER DEFAULT PRIVILEGES IN SCHEMA laboratory GRANT SELECT ON TABLES TO laboratory_reader;

-- Create a laboratory_user role that inherits from laboratory_reader but can also modify data
CREATE ROLE laboratory_user IN ROLE laboratory_reader;

-- Grant additional permissions to laboratory_user
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA laboratory TO laboratory_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA laboratory GRANT INSERT, UPDATE, DELETE ON TABLES TO laboratory_user;

-- Map authenticated users to laboratory_user role
GRANT laboratory_user TO authenticated;

-- Map anon users to laboratory_reader role (for public read access)
GRANT laboratory_reader TO anon; 
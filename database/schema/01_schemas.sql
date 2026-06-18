-- Initialize database with proper schemas and extensions
DROP DATABASE IF EXISTS scd_research_secure;
CREATE DATABASE scd_research_secure;

\connect scd_research_secure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA phi;          -- Protected Health Information
CREATE SCHEMA clinical;     -- De-identified clinical data
CREATE SCHEMA laboratory;   -- Laboratory results and assays
CREATE SCHEMA audit;        -- Audit logging
CREATE SCHEMA app;          -- Application-specific tables

-- Set default permissions
REVOKE ALL ON ALL TABLES IN SCHEMA phi FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA clinical FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA laboratory FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA audit FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.audit_log(
        table_name,
        action,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        current_user
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table
CREATE TABLE audit.audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 
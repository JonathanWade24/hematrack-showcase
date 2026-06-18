-- Roles and Permissions
\connect scd_research_secure

BEGIN;

-- Create roles
CREATE ROLE scd_admin;
CREATE ROLE scd_researcher;
CREATE ROLE scd_data_entry;
CREATE ROLE scd_readonly;

-- Admin role - full access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA phi TO scd_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA clinical TO scd_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA laboratory TO scd_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO scd_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA phi TO scd_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA clinical TO scd_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA laboratory TO scd_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO scd_admin;

-- Researcher role - access to de-identified data
GRANT USAGE ON SCHEMA clinical TO scd_researcher;
GRANT USAGE ON SCHEMA laboratory TO scd_researcher;
GRANT SELECT ON clinical.patient_demographics TO scd_researcher;
GRANT SELECT, INSERT, UPDATE ON clinical.omics_subjects TO scd_researcher;
GRANT SELECT, INSERT, UPDATE ON laboratory.omics_results TO scd_researcher;
GRANT SELECT ON laboratory.advia_results TO scd_researcher;
GRANT SELECT ON laboratory.dna_results TO scd_researcher;
GRANT SELECT ON laboratory.f_cells_results TO scd_researcher;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA clinical TO scd_researcher;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA laboratory TO scd_researcher;

-- Data entry role - limited write access
GRANT USAGE ON SCHEMA clinical TO scd_data_entry;
GRANT USAGE ON SCHEMA laboratory TO scd_data_entry;
GRANT SELECT, INSERT, UPDATE ON laboratory.omics_results TO scd_data_entry;
GRANT SELECT ON clinical.omics_subjects TO scd_data_entry;
GRANT SELECT ON laboratory.advia_results TO scd_data_entry;
GRANT SELECT ON laboratory.dna_results TO scd_data_entry;
GRANT SELECT ON laboratory.f_cells_results TO scd_data_entry;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA clinical TO scd_data_entry;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA laboratory TO scd_data_entry;

-- Read-only role
GRANT USAGE ON SCHEMA clinical TO scd_readonly;
GRANT USAGE ON SCHEMA laboratory TO scd_readonly;
GRANT SELECT ON clinical.patient_demographics TO scd_readonly;
GRANT SELECT ON clinical.omics_subjects TO scd_readonly;
GRANT SELECT ON laboratory.omics_results TO scd_readonly;
GRANT SELECT ON laboratory.advia_results TO scd_readonly;
GRANT SELECT ON laboratory.dna_results TO scd_readonly;
GRANT SELECT ON laboratory.f_cells_results TO scd_readonly;

-- Create application user
CREATE USER scd_app_user WITH PASSWORD 'change_me_in_production';
GRANT scd_researcher TO scd_app_user;

-- Ensure audit logging works for all roles
GRANT USAGE ON SCHEMA audit TO scd_researcher;
GRANT USAGE ON SCHEMA audit TO scd_data_entry;
GRANT USAGE ON SCHEMA audit TO scd_readonly;

COMMIT; 
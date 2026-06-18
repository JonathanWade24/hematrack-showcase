-- Part 3: Move Tables to Secure Schemas
\connect scd_research_secure

BEGIN;

-- First, verify current table locations
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('public', 'phi', 'clinical')
ORDER BY schemaname, tablename;

-- Move PHI tables (contains identifiable information)
ALTER TABLE public.patients SET SCHEMA phi;
ALTER TABLE public.patients_master SET SCHEMA phi;
ALTER TABLE public.epic_demographics SET SCHEMA phi;

-- Move Clinical tables (de-identified data)
ALTER TABLE public.omics_results SET SCHEMA clinical;
ALTER TABLE public.epic_labs SET SCHEMA clinical;
ALTER TABLE public.epic_ip_meds SET SCHEMA clinical;
ALTER TABLE public.epic_op_meds SET SCHEMA clinical;
ALTER TABLE public.medications SET SCHEMA clinical;
ALTER TABLE public.bone_marrow SET SCHEMA clinical;
ALTER TABLE public.inpatient_admissions SET SCHEMA clinical;
ALTER TABLE public.outpatient_visits SET SCHEMA clinical;
ALTER TABLE public.epic_ip_admissions SET SCHEMA clinical;
ALTER TABLE public.epic_op_visits SET SCHEMA clinical;
ALTER TABLE public.omics_subjects SET SCHEMA clinical;

-- Verify tables were moved
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('public', 'phi', 'clinical')
ORDER BY schemaname, tablename;

COMMIT;
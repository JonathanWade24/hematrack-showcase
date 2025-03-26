-- Script to update all RLS policies to use the optimized functions
-- This script replaces the old functions (has_role, has_any_role) with the new ones
-- (user_has_role, user_has_any_role) to fix the stack depth limit exceeded error

-- Start a transaction so we can rollback if anything fails
BEGIN;

-- 1. Labs table policies
ALTER POLICY "Admin full access to Labs" ON clinical."Labs" 
USING (public.user_has_role('admin'));

ALTER POLICY "Clinical data entry select Labs" ON clinical."Labs" 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical data entry update Labs" ON clinical."Labs" 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical researcher full access to Labs" ON clinical."Labs" 
USING (public.user_has_role('clinical_researcher_full'));

-- 2. audit_log table policies
ALTER POLICY "Admin full access to audit_log" ON audit.audit_log 
USING (public.user_has_role('admin'));

ALTER POLICY "Users view audit logs for their role" ON audit.audit_log 
USING (public.user_has_any_role(VARIADIC ARRAY['clinical_researcher_full', 'clinical_researcher_masked', 'non_clinical_researcher', 'clinical_data_entry']));

-- 3. bone_marrow table policies
ALTER POLICY "Admin full access to bone_marrow" ON clinical.bone_marrow 
USING (public.user_has_role('admin'));

ALTER POLICY "Clinical data entry select bone_marrow" ON clinical.bone_marrow 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical data entry update bone_marrow" ON clinical.bone_marrow 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical researcher full access to bone_marrow" ON clinical.bone_marrow 
USING (public.user_has_role('clinical_researcher_full'));

-- 4. demographics table policies
ALTER POLICY "Admin full access to demographics" ON clinical.demographics 
USING (public.user_has_role('admin'));

ALTER POLICY "Clinical data entry select demographics" ON clinical.demographics 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical data entry update demographics" ON clinical.demographics 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical researcher full access to demographics" ON clinical.demographics 
USING (public.user_has_role('clinical_researcher_full'));

-- 5. ip_admissions table policies
ALTER POLICY "Admin full access to ip_admissions" ON clinical.ip_admissions 
USING (public.user_has_role('admin'));

ALTER POLICY "Clinical data entry select ip_admissions" ON clinical.ip_admissions 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical data entry update ip_admissions" ON clinical.ip_admissions 
USING (public.user_has_role('clinical_data_entry'));

ALTER POLICY "Clinical researcher full access to ip_admissions" ON clinical.ip_admissions 
USING (public.user_has_role('clinical_researcher_full'));

-- 6. ip_medications table policies
ALTER POLICY "Admin full access to ip_medications" ON clinical.ip_medications 
USING (public.user_has_role('admin'));

ALTER POLICY "Clinical data entry select ip_medications" ON clinical.ip_medications 
USING (public.user_has_role('clinical_data_entry'));

-- Get the remaining policies and update them
-- This is needed to get tables we haven't manually enumerated above

DO $$
DECLARE
    policy record;
BEGIN
    FOR policy IN 
        SELECT 
            schemaname, tablename, policyname, 
            replace(replace(qual, 'has_role(', 'user_has_role('), 
                    'has_any_role(', 'user_has_any_role(') as new_qual
        FROM pg_policies 
        WHERE (qual LIKE '%has_role(%' OR qual LIKE '%has_any_role(%')
        AND (schemaname, tablename) NOT IN (
            ('clinical', 'Labs'), 
            ('audit', 'audit_log'), 
            ('clinical', 'bone_marrow'), 
            ('clinical', 'demographics'), 
            ('clinical', 'ip_admissions'), 
            ('clinical', 'ip_medications')
        )
    LOOP
        -- For debugging
        RAISE NOTICE 'Updating policy % on table %.%', 
            policy.policyname, policy.schemaname, policy.tablename;
            
        -- Execute the policy update with proper quoting for identifiers
        -- including special handling for mixed-case table names
        EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', 
            policy.policyname, 
            policy.schemaname, 
            policy.tablename, 
            policy.new_qual);
    END LOOP;
END
$$;

-- Commit the transaction
COMMIT; 
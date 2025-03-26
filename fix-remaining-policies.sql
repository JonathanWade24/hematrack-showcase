-- Script to update the remaining policies that still use the old functions
BEGIN;

-- Update the remaining ip_medications policies
ALTER POLICY "Clinical researcher full access to ip_medications" ON clinical.ip_medications 
USING (public.user_has_role('clinical_researcher_full'));

ALTER POLICY "Clinical data entry update ip_medications" ON clinical.ip_medications 
USING (public.user_has_role('clinical_data_entry'));

-- Double-check if we have any other policies using the old functions and update them
DO $$
DECLARE
    policy record;
BEGIN
    FOR policy IN 
        SELECT 
            schemaname, tablename, policyname, 
            replace(replace(qual, 'has_role(', 'public.user_has_role('), 
                    'has_any_role(', 'public.user_has_any_role(') as new_qual
        FROM pg_policies 
        WHERE (qual LIKE '%has_role(%' OR qual LIKE '%has_any_role(%')
        AND qual NOT LIKE '%user_has_role%' 
        AND qual NOT LIKE '%user_has_any_role%'
    LOOP
        RAISE NOTICE 'Updating remaining policy % on table %.%', 
            policy.policyname, policy.schemaname, policy.tablename;
            
        -- Execute the policy update
        BEGIN
            EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', 
                policy.policyname, 
                policy.schemaname, 
                policy.tablename, 
                policy.new_qual);
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other policies
            RAISE NOTICE 'Error updating policy % on %.%: %', 
                policy.policyname, policy.schemaname, policy.tablename, SQLERRM;
        END;
    END LOOP;
END
$$;

COMMIT; 
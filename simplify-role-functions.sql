-- Script to simplify the role checking functions to avoid recursion
BEGIN;

-- Create a completely new direct approach to role checking
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Only check JWT metadata (fast path) - avoid database lookup
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = required_role;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC required_roles text[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Only check JWT metadata (fast path) - avoid database lookup
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = ANY(required_roles);
$$;

-- Create or replace the user_has_role functions with the simplified version
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Only check JWT metadata (fast path) - avoid database lookup 
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = required_role;
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_role(VARIADIC required_roles text[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Only check JWT metadata (fast path) - avoid database lookup
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = ANY(required_roles);
$$;

-- Update the role in your JWT if needed (uncomment and modify this if needed)
-- UPDATE auth.users
-- SET raw_app_meta_data = jsonb_set(
--     COALESCE(raw_app_meta_data, '{}'::jsonb),
--     '{role}',
--     '"clinical_researcher_masked"'::jsonb
-- )
-- WHERE email = 'your.email@example.com';

COMMIT; 
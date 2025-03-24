-- STEP 1: Drop only the functions that don't have dependencies
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.get_all_users();

-- STEP 2: Create a completely new approach - store role directly in JWT

-- Function to check if user has a role based on JWT claim directly
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Get role directly from JWT claim first
  SELECT 
    CASE
      -- First check JWT metadata (fast path)
      WHEN (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = required_role THEN true
      -- Fall back to database lookup if needed
      ELSE (
        SELECT EXISTS (
          SELECT 1
          FROM public.user_role_assignments a 
          JOIN public.user_roles r ON a.role_id = r.id 
          WHERE a.user_id = auth.uid() AND r.name = required_role
        )
      )
    END;
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.user_has_any_role(variadic required_roles text[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Check if JWT role matches any required role
  SELECT 
    CASE
      -- First check JWT metadata (fast path)
      WHEN (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = ANY(required_roles) THEN true
      -- Fall back to database lookup
      ELSE (
        SELECT EXISTS (
          SELECT 1
          FROM public.user_role_assignments a 
          JOIN public.user_roles r ON a.role_id = r.id 
          WHERE a.user_id = auth.uid() AND r.name = ANY(required_roles)
        )
      )
    END;
$$;

-- Function to get all users for admin page
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  role TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    (u.raw_app_meta_data ->> 'role')::text AS role
  FROM
    auth.users u;
$$;

-- STEP 3: Override the existing has_role/has_any_role functions
-- This avoids breaking the policies that depend on them

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Use our new, optimized function
  SELECT public.user_has_role(required_role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(required_roles text[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  -- Use our new, optimized function
  SELECT public.user_has_any_role(VARIADIC required_roles);
$$;

-- STEP 4: Update all users to have admin role in their metadata
UPDATE auth.users
SET raw_app_meta_data = 
  CASE 
    WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
    ELSE jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'::jsonb)
  END;

-- STEP 5: Insert admin role assignments for all users
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT id, 1 -- Admin role ID is 1
FROM auth.users
ON CONFLICT (user_id, role_id) DO NOTHING;

-- STEP 6: If needed in the future, you can update policies with these statements:
/*
-- Example: Update phi.patients policy
ALTER POLICY "Admin full access to patients" ON phi.patients
USING (public.user_has_role('admin'));

-- Example: Update policy with has_any_role
ALTER POLICY "Clinical researcher view subject_registration" ON phi.subject_registration
USING (public.user_has_any_role(VARIADIC ARRAY['clinical_researcher_full', 'clinical_researcher_masked']));
*/ 
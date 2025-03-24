-- SQL script to fix the stack depth limit and role issues

-- 1. First, let's fix the broken get_user_role function (main cause of stack depth issue)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
-- Remove the empty search path that's causing issues
AS $$
BEGIN
  RETURN (SELECT r.name 
          FROM public.user_role_assignments a 
          JOIN public.user_roles r ON a.role_id = r.id 
          WHERE a.user_id = auth.uid()
          LIMIT 1);
END;
$$;

-- 2. Fix the has_role function too
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
-- Remove the empty search path
AS $$
BEGIN
  RETURN (SELECT public.get_user_role() = required_role);
END;
$$;

-- 3. Fix the has_any_role function
CREATE OR REPLACE FUNCTION public.has_any_role(variadic required_roles text[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
-- Remove the empty search path
AS $$
BEGIN
  RETURN (SELECT public.get_user_role() = ANY(required_roles));
END;
$$;

-- 4. Make sure everyone has the admin role both in auth.users and user_role_assignments
-- First, update all users' app_metadata to have admin role
UPDATE auth.users
SET raw_app_meta_data = 
  CASE 
    WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
    ELSE jsonb_set(raw_app_meta_data, '{role}', '"admin"'::jsonb)
  END;

-- Then, insert admin role assignments for all users
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT id, 1 -- Admin role ID is 1
FROM auth.users
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 5. Check the results
SELECT 
  u.id, 
  u.email, 
  u.raw_app_meta_data->'role' as metadata_role,
  r.name as assigned_role
FROM 
  auth.users u
LEFT JOIN 
  public.user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN 
  public.user_roles r ON ura.role_id = r.id; 
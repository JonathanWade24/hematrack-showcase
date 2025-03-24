-- 1. First, let's fix the get_user_role function which is causing stack depth issues
-- Switch to simple SQL instead of PL/pgSQL to reduce stack usage
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
-- DO NOT set search_path to empty, which causes the recursion issues
AS $$
  SELECT r.name 
  FROM public.user_role_assignments a 
  JOIN public.user_roles r ON a.role_id = r.id 
  WHERE a.user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Fix the has_role function to avoid recursion
-- Instead of calling get_user_role(), do the join directly
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments a 
    JOIN public.user_roles r ON a.role_id = r.id 
    WHERE a.user_id = auth.uid() AND r.name = required_role
  );
$$;

-- 3. Fix the has_any_role function to avoid recursion
-- Instead of calling get_user_role(), do the join directly
CREATE OR REPLACE FUNCTION public.has_any_role(variadic required_roles text[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments a 
    JOIN public.user_roles r ON a.role_id = r.id 
    WHERE a.user_id = auth.uid() AND r.name = ANY(required_roles)
  );
$$;

-- 4. Create a simpler get_all_users function to fix the type mismatch
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  raw_app_meta_data JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    u.id,
    u.email::text, -- Ensure text type
    u.created_at,
    u.last_sign_in_at,
    u.raw_app_meta_data
  FROM
    auth.users u;
$$;

-- 5. Update all users to have admin role in their metadata
UPDATE auth.users
SET raw_app_meta_data = 
  CASE 
    WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
    ELSE jsonb_set(raw_app_meta_data, '{role}', '"admin"'::jsonb)
  END;

-- 6. Insert admin role assignments for all users
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT id, 1 -- Admin role ID is 1
FROM auth.users
ON CONFLICT (user_id, role_id) DO NOTHING; 
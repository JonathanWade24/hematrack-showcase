-- FINAL FIX FOR STACK DEPTH ISSUES

-- Set search_path for current session
SET search_path TO public;

-- 1. Fix the get_user_role function completely
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT r.name 
  FROM public.user_role_assignments a 
  JOIN public.user_roles r ON a.role_id = r.id 
  WHERE a.user_id = auth.uid()
  LIMIT 1;
$$;

-- 2. Fix the has_role function to use SQL instead of plpgsql
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

-- 3. Fix the has_any_role function to use SQL instead of plpgsql
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

-- 4. Create function to get all users for our API endpoint
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  raw_app_meta_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;
  
  -- Return all users from auth.users
  RETURN QUERY 
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.raw_app_meta_data
  FROM
    auth.users u;
END;
$$;

-- 5. Function to update user metadata
CREATE OR REPLACE FUNCTION public.admin_update_user_metadata(target_user_id UUID, role_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin' INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can update user metadata';
  END IF;
  
  -- Update user metadata with role
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('role', role_value)
      ELSE jsonb_set(raw_app_meta_data, '{role}', to_jsonb(role_value))
    END
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- 6. Make sure everyone has the admin role both in auth.users and user_role_assignments
UPDATE auth.users
SET raw_app_meta_data = 
  CASE 
    WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
    ELSE jsonb_set(raw_app_meta_data, '{role}', '"admin"'::jsonb)
  END;

INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT id, 1 -- Admin role ID is 1
FROM auth.users
ON CONFLICT (user_id, role_id) DO NOTHING; 
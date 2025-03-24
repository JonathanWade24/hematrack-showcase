-- 1. Increase the stack depth limit
ALTER DATABASE postgres SET max_stack_depth = '4MB';

-- 2. Fix the type mismatch in get_all_users function
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
    u.email::text, -- Cast to text type explicitly
    u.created_at,
    u.last_sign_in_at,
    u.raw_app_meta_data
  FROM
    auth.users u;
$$; 
-- Function to get all users
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
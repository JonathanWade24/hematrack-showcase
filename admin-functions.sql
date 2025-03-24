-- Function to update user metadata with role
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
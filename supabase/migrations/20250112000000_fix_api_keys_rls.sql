-- Fix API keys RLS policies to avoid accessing auth.users table directly
-- This prevents "permission denied for table users" errors for regular users

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can insert API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can update API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete API keys" ON api_keys;

-- Create a security definer function to check if user is admin
-- This function can access auth.users because it runs with elevated privileges (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
    admin_emails TEXT[] := ARRAY['kyrodahero123@gmail.com', 'admin@fairnessai.com'];
BEGIN
    -- Get current user ID
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Query auth.users table (allowed because function is SECURITY DEFINER)
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = auth.uid();
    
    -- If email is in admin list, return true
    IF user_email = ANY(admin_emails) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Recreate admin policies using the function
CREATE POLICY "Admins can view all API keys"
    ON api_keys FOR SELECT
    USING (is_admin_user());

CREATE POLICY "Admins can insert API keys"
    ON api_keys FOR INSERT
    WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update API keys"
    ON api_keys FOR UPDATE
    USING (is_admin_user());

CREATE POLICY "Admins can delete API keys"
    ON api_keys FOR DELETE
    USING (is_admin_user());

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

-- Fix API keys RLS policies to allow users to create and delete their own keys
-- This fixes the 500 error when creating API keys and permission issues when deleting

-- Drop ALL existing INSERT and DELETE policies to start fresh
DROP POLICY IF EXISTS "Admins can insert API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can delete API keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON api_keys;

-- Policy: Users can insert their own API keys
CREATE POLICY "Users can insert their own API keys"
    ON api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can insert API keys (for any user)
CREATE POLICY "Admins can insert API keys"
    ON api_keys FOR INSERT
    WITH CHECK (is_admin_user());

-- Policy: Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
    ON api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Admins can delete API keys (for any user)
CREATE POLICY "Admins can delete API keys"
    ON api_keys FOR DELETE
    USING (is_admin_user());

-- Fix personas table policies
-- Run this SQL in your Supabase Dashboard > SQL Editor

-- First, check if the personas table exists and its structure
-- You can run this separately to see the current state:
-- SELECT * FROM information_schema.columns WHERE table_name = 'personas';

-- Enable RLS on personas table (if not already enabled)
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on personas table to start fresh
DROP POLICY IF EXISTS "Enable read access for users" ON personas;
DROP POLICY IF EXISTS "Allow admin to insert" ON personas;
DROP POLICY IF EXISTS "Allow admin to update" ON personas;
DROP POLICY IF EXISTS "Allow admin to delete" ON personas;
DROP POLICY IF EXISTS "Allow admin to see all personas" ON personas;
DROP POLICY IF EXISTS "Users can view active personas" ON personas;
DROP POLICY IF EXISTS "Admin can manage personas" ON personas;

-- Create comprehensive admin policy for all operations
CREATE POLICY "Admin can manage personas"
    ON personas FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'kyrodahero123@gmail.com'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'kyrodahero123@gmail.com'
        )
    );

-- Create read policy for regular users (active personas only)
CREATE POLICY "Users can view active personas"
    ON personas FOR SELECT
    USING (is_active = true);

-- Verify the policies were created
-- You can run this to check:
-- SELECT * FROM pg_policies WHERE tablename = 'personas'; 
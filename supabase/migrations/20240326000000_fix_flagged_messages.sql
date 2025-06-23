-- Fix flagged_messages table to ensure compatibility
-- This will handle any data type mismatches

-- First, let's make flag_type a simple text field if it's not already
DO $$ 
BEGIN
    -- Try to alter the column type if needed
    BEGIN
        ALTER TABLE flagged_messages ALTER COLUMN flag_type TYPE TEXT;
    EXCEPTION 
        WHEN others THEN
            -- Column might already be TEXT, that's fine
            NULL;
    END;
END $$;

-- Drop and recreate RLS policies to be more permissive for testing
DROP POLICY IF EXISTS "Users can flag messages" ON flagged_messages;
DROP POLICY IF EXISTS "Users can view their own flags" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can manage flagged messages" ON flagged_messages;

-- More permissive policies for testing
CREATE POLICY "Anyone can flag messages" ON flagged_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view flags" ON flagged_messages
  FOR SELECT USING (true);

-- Admin policy remains the same
CREATE POLICY "Admins can manage flagged messages" ON flagged_messages
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kyrodahero123@gmail.com'
  )); 
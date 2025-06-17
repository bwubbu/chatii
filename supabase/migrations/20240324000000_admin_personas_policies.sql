-- Ensure personas table exists with proper structure
CREATE TABLE IF NOT EXISTS personas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    avatar_url TEXT,
    avatar_fallback TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT personas_title_length CHECK (char_length(title) <= 100),
    CONSTRAINT personas_system_prompt_length CHECK (char_length(system_prompt) <= 5000)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS personas_is_active_idx ON personas(is_active);
CREATE INDEX IF NOT EXISTS personas_created_at_idx ON personas(created_at);

-- Enable RLS on personas table
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for users" ON personas;
DROP POLICY IF EXISTS "Allow admin to insert" ON personas;
DROP POLICY IF EXISTS "Allow admin to update" ON personas;
DROP POLICY IF EXISTS "Allow admin to delete" ON personas;

-- Public read access for all users (to browse available personas)
CREATE POLICY "Enable read access for users"
    ON personas FOR SELECT
    USING (is_active = true);

-- Admin-only policies for full CRUD operations
-- Admin is identified by specific email address
CREATE POLICY "Allow admin to insert"
    ON personas FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'kyrodahero123@gmail.com'
        )
    );

CREATE POLICY "Allow admin to update"
    ON personas FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'kyrodahero123@gmail.com'
        )
    );

CREATE POLICY "Allow admin to delete"
    ON personas FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'kyrodahero123@gmail.com'
        )
    );

-- Also allow admin to see all personas (including inactive ones)
CREATE POLICY "Allow admin to see all personas"
    ON personas FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE email = 'kyrodahero123@gmail.com'
        )
    );

-- Create function to update personas updated_at timestamp
CREATE OR REPLACE FUNCTION update_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_personas_updated_at ON personas;
CREATE TRIGGER update_personas_updated_at
    BEFORE UPDATE ON personas
    FOR EACH ROW
    EXECUTE FUNCTION update_personas_updated_at(); 
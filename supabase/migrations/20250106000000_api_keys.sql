-- Create API keys table for persona export API
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    rate_limit INTEGER DEFAULT 100, -- requests per hour
    permissions JSONB DEFAULT '["persona:read", "chat:create"]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL -- Admin who created the key
);

-- Create indexes
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_idx ON api_keys(key);
CREATE INDEX IF NOT EXISTS api_keys_created_at_idx ON api_keys(created_at);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx ON api_keys(is_active);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own API keys
CREATE POLICY "Users can view their own API keys"
    ON api_keys FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins can view all API keys
CREATE POLICY "Admins can view all API keys"
    ON api_keys FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin@fairnessai.com' -- Replace with your admin email
        )
    );

-- Policy: Admins can insert API keys
CREATE POLICY "Admins can insert API keys"
    ON api_keys FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin@fairnessai.com' -- Replace with your admin email
        )
    );

-- Policy: Admins can update API keys
CREATE POLICY "Admins can update API keys"
    ON api_keys FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin@fairnessai.com' -- Replace with your admin email
        )
    );

-- Policy: Admins can delete API keys
CREATE POLICY "Admins can delete API keys"
    ON api_keys FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin@fairnessai.com' -- Replace with your admin email
        )
    );

-- Function to update last_used timestamp
CREATE OR REPLACE FUNCTION update_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE api_keys
    SET last_used = timezone('utc'::text, now()),
        usage_count = usage_count + 1
    WHERE key = NEW.key;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would need to be set up in the FastAPI backend
-- when API keys are verified, not in the database directly


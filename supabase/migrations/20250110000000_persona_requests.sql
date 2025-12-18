-- Create persona_requests table to store user requests for new personas
CREATE TABLE IF NOT EXISTS persona_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    persona_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS persona_requests_user_id_idx ON persona_requests(user_id);
CREATE INDEX IF NOT EXISTS persona_requests_status_idx ON persona_requests(status);
CREATE INDEX IF NOT EXISTS persona_requests_created_at_idx ON persona_requests(created_at);

-- Enable RLS
ALTER TABLE persona_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert their own requests"
    ON persona_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own requests"
    ON persona_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all requests"
    ON persona_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );

-- Policy: Admins can update all requests
CREATE POLICY "Admins can update all requests"
    ON persona_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_persona_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_persona_requests_updated_at
    BEFORE UPDATE ON persona_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_persona_requests_updated_at();







-- Create demographics table for analytics
CREATE TABLE demographics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer-not-to-say')),
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE demographics ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own demographics
CREATE POLICY "Users can insert demographics" ON demographics
  FOR INSERT WITH CHECK (true);

-- Allow users to view demographics (for admin analytics)
CREATE POLICY "Users can view demographics" ON demographics
  FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX idx_demographics_conversation_id ON demographics(conversation_id);
CREATE INDEX idx_demographics_persona_id ON demographics(persona_id);
CREATE INDEX idx_demographics_created_at ON demographics(created_at);
CREATE INDEX idx_demographics_age ON demographics(age);
CREATE INDEX idx_demographics_gender ON demographics(gender);
CREATE INDEX idx_demographics_role ON demographics(role); 
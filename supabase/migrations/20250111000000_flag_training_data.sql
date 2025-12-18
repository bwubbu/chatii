-- Create table to store approved flagged messages for fine-tuning
CREATE TABLE IF NOT EXISTS flag_training_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flagged_message_id UUID REFERENCES flagged_messages(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
    flagged_content TEXT NOT NULL,
    context TEXT, -- The user message that preceded the flagged response
    reason TEXT NOT NULL, -- Why it was flagged
    severity TEXT NOT NULL,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS flag_training_data_flagged_message_id_idx ON flag_training_data(flagged_message_id);
CREATE INDEX IF NOT EXISTS flag_training_data_message_id_idx ON flag_training_data(message_id);
CREATE INDEX IF NOT EXISTS flag_training_data_conversation_id_idx ON flag_training_data(conversation_id);
CREATE INDEX IF NOT EXISTS flag_training_data_persona_id_idx ON flag_training_data(persona_id);
CREATE INDEX IF NOT EXISTS flag_training_data_created_at_idx ON flag_training_data(created_at);

-- Enable RLS
ALTER TABLE flag_training_data ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view training data
CREATE POLICY "Admins can view training data"
    ON flag_training_data FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );

-- Policy: Only admins can insert training data
CREATE POLICY "Admins can insert training data"
    ON flag_training_data FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );







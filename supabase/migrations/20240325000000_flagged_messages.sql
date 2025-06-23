-- Create flagged_messages table for content moderation
CREATE TABLE flagged_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  flag_type TEXT[] DEFAULT ARRAY['inappropriate'], -- Array of flag types
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE flagged_messages ENABLE ROW LEVEL SECURITY;

-- Allow users to flag messages
CREATE POLICY "Users can flag messages" ON flagged_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own flags
CREATE POLICY "Users can view their own flags" ON flagged_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view and manage all flagged messages
CREATE POLICY "Admins can manage flagged messages" ON flagged_messages
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = 'kyrodahero123@gmail.com'
  ));

-- Create indexes for better performance
CREATE INDEX idx_flagged_messages_message_id ON flagged_messages(message_id);
CREATE INDEX idx_flagged_messages_user_id ON flagged_messages(user_id);
CREATE INDEX idx_flagged_messages_status ON flagged_messages(status);
CREATE INDEX idx_flagged_messages_severity ON flagged_messages(severity);
CREATE INDEX idx_flagged_messages_created_at ON flagged_messages(created_at); 
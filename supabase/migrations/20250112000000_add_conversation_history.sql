-- Add conversation_history column to training_sessions to store messages during conversation
-- This allows users to resume sessions and see all previous messages

ALTER TABLE training_sessions 
ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN training_sessions.conversation_history IS 'Stores the full conversation history as JSONB array of messages with role and content, allowing session resumption';












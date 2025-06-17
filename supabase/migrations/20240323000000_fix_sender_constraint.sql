-- Fix sender constraint in messages table
-- Drop the old constraint
ALTER TABLE messages DROP CONSTRAINT messages_sender_check;

-- Add new constraint that allows 'user' and 'assistant'
ALTER TABLE messages ADD CONSTRAINT messages_sender_check CHECK (sender IN ('user', 'assistant'));

-- Update any existing 'bot' entries to 'assistant' (if any)
UPDATE messages SET sender = 'assistant' WHERE sender = 'bot'; 
-- Add persona_id column to api_keys table to properly link keys with personas
-- This allows API keys to be associated with specific personas created by admins

ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS api_keys_persona_id_idx ON api_keys(persona_id) WHERE persona_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN api_keys.persona_id IS 'Optional: Links this API key to a specific persona. If NULL, key works with all personas.';

















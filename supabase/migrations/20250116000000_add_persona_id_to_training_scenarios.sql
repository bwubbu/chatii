-- Add persona_id column to training_scenarios table
-- This creates an optional relationship between personas and training scenarios
-- When a scenario is linked to a persona, users practice becoming that persona

ALTER TABLE training_scenarios
ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES personas(id) ON DELETE SET NULL;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS training_scenarios_persona_id_idx ON training_scenarios(persona_id) WHERE persona_id IS NOT NULL;

-- Add comment explaining the relationship
COMMENT ON COLUMN training_scenarios.persona_id IS 'Optional: Links this training scenario to a specific persona. When set, users practice becoming this persona in the training session.';

-- Add admin policies for training_scenarios management
-- Admins can insert, update, and delete training scenarios
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert training scenarios" ON training_scenarios;
DROP POLICY IF EXISTS "Admins can update training scenarios" ON training_scenarios;
DROP POLICY IF EXISTS "Admins can delete training scenarios" ON training_scenarios;

CREATE POLICY "Admins can insert training scenarios"
    ON training_scenarios FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );

CREATE POLICY "Admins can update training scenarios"
    ON training_scenarios FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );

CREATE POLICY "Admins can delete training scenarios"
    ON training_scenarios FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'kyrodahero123@gmail.com'
        )
    );

-- Keep existing public SELECT policy (users can view active scenarios)
-- The existing policy "Anyone can view active training scenarios" already handles this


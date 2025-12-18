-- Add DELETE policy for training_sessions
-- This allows users to delete their own training sessions

CREATE POLICY "Users can delete their own training sessions"
    ON training_sessions FOR DELETE
    USING (auth.uid() = user_id);




















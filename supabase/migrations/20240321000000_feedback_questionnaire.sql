-- Create feedback_questionnaire table for storing Godspeed questionnaire responses
CREATE TABLE feedback_questionnaire (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  politeness INTEGER CHECK (politeness >= 1 AND politeness <= 5),
  fairness INTEGER CHECK (fairness >= 1 AND fairness <= 5),
  respectfulness INTEGER CHECK (respectfulness >= 1 AND respectfulness <= 5),
  trustworthiness INTEGER CHECK (trustworthiness >= 1 AND trustworthiness <= 5),
  competence INTEGER CHECK (competence >= 1 AND competence <= 5),
  likeability INTEGER CHECK (likeability >= 1 AND likeability <= 5),
  open_ended TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE feedback_questionnaire ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert feedback questionnaire" ON feedback_questionnaire
  FOR INSERT WITH CHECK (true);

-- Allow users to view their own feedback (optional, for admin purposes)
CREATE POLICY "Users can view feedback questionnaire" ON feedback_questionnaire
  FOR SELECT USING (true);

-- Create index for better performance
CREATE INDEX idx_feedback_questionnaire_persona_id ON feedback_questionnaire(persona_id);
CREATE INDEX idx_feedback_questionnaire_created_at ON feedback_questionnaire(created_at); 
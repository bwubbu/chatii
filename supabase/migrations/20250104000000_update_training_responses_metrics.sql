-- Add new scoring columns to training_responses table
-- Keep old columns for backward compatibility, add new ones as nullable initially

ALTER TABLE training_responses 
ADD COLUMN IF NOT EXISTS likeability_score DECIMAL(3,1) CHECK (likeability_score IS NULL OR (likeability_score BETWEEN 0 AND 10)),
ADD COLUMN IF NOT EXISTS competence_score DECIMAL(3,1) CHECK (competence_score IS NULL OR (competence_score BETWEEN 0 AND 10)),
ADD COLUMN IF NOT EXISTS respectfulness_score DECIMAL(3,1) CHECK (respectfulness_score IS NULL OR (respectfulness_score BETWEEN 0 AND 10)),
ADD COLUMN IF NOT EXISTS trustworthiness_score DECIMAL(3,1) CHECK (trustworthiness_score IS NULL OR (trustworthiness_score BETWEEN 0 AND 10));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS training_responses_likeability_idx ON training_responses(likeability_score);
CREATE INDEX IF NOT EXISTS training_responses_competence_idx ON training_responses(competence_score);
CREATE INDEX IF NOT EXISTS training_responses_respectfulness_idx ON training_responses(respectfulness_score);
CREATE INDEX IF NOT EXISTS training_responses_trustworthiness_idx ON training_responses(trustworthiness_score);




















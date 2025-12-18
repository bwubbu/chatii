-- Create training_scenarios table
-- Stores predefined challenging scenarios that AI can use as "customer" personas
CREATE TABLE IF NOT EXISTS training_scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    scenario_type TEXT NOT NULL CHECK (scenario_type IN ('rude', 'demanding', 'frustrated', 'discriminatory', 'challenging', 'cultural_sensitivity')),
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    initial_message TEXT NOT NULL, -- The first message the AI "customer" sends
    system_prompt TEXT NOT NULL, -- How the AI should act as this customer
    expected_behaviors JSONB DEFAULT '[]'::jsonb, -- What behaviors the user should demonstrate
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT training_scenarios_title_length CHECK (char_length(title) <= 200)
);

-- Create training_sessions table
-- Tracks each training session a user completes
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES training_scenarios(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_messages INTEGER DEFAULT 0,
    average_score DECIMAL(5,2), -- Average of all response scores (0-10)
    overall_politeness DECIMAL(5,2),
    overall_fairness DECIMAL(5,2),
    overall_professionalism DECIMAL(5,2),
    overall_empathy DECIMAL(5,2),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    feedback_summary TEXT, -- AI-generated summary of user's performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create training_responses table
-- Stores each user response with its score breakdown
CREATE TABLE IF NOT EXISTS training_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    ai_message TEXT NOT NULL, -- The challenging message from AI
    user_response TEXT NOT NULL, -- User's response
    message_number INTEGER NOT NULL, -- Order in conversation
    
    -- Scoring breakdown (0-10 scale)
    politeness_score DECIMAL(3,1) NOT NULL CHECK (politeness_score BETWEEN 0 AND 10),
    fairness_score DECIMAL(3,1) NOT NULL CHECK (fairness_score BETWEEN 0 AND 10),
    professionalism_score DECIMAL(3,1) NOT NULL CHECK (professionalism_score BETWEEN 0 AND 10),
    empathy_score DECIMAL(3,1) NOT NULL CHECK (empathy_score BETWEEN 0 AND 10),
    overall_score DECIMAL(3,1) NOT NULL CHECK (overall_score BETWEEN 0 AND 10), -- Average of above
    
    -- Detailed feedback
    strengths JSONB DEFAULT '[]'::jsonb, -- What the user did well
    improvements JSONB DEFAULT '[]'::jsonb, -- What could be improved
    detailed_feedback TEXT, -- AI-generated detailed feedback
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS training_sessions_user_id_idx ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS training_sessions_scenario_id_idx ON training_sessions(scenario_id);
CREATE INDEX IF NOT EXISTS training_sessions_status_idx ON training_sessions(status);
CREATE INDEX IF NOT EXISTS training_sessions_started_at_idx ON training_sessions(started_at);
CREATE INDEX IF NOT EXISTS training_responses_session_id_idx ON training_responses(session_id);
CREATE INDEX IF NOT EXISTS training_scenarios_type_idx ON training_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS training_scenarios_difficulty_idx ON training_scenarios(difficulty_level);
CREATE INDEX IF NOT EXISTS training_scenarios_active_idx ON training_scenarios(is_active);

-- Enable RLS
ALTER TABLE training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_responses ENABLE ROW LEVEL SECURITY;

-- Training scenarios: Public read access (all users can see available scenarios)
CREATE POLICY "Anyone can view active training scenarios"
    ON training_scenarios FOR SELECT
    USING (is_active = true);

-- Training sessions: Users can only see their own sessions
CREATE POLICY "Users can view their own training sessions"
    ON training_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training sessions"
    ON training_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions"
    ON training_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training sessions"
    ON training_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Training responses: Users can only see responses from their own sessions
CREATE POLICY "Users can view responses from their own sessions"
    ON training_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM training_sessions
            WHERE training_sessions.id = training_responses.session_id
            AND training_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create responses in their own sessions"
    ON training_responses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM training_sessions
            WHERE training_sessions.id = session_id
            AND training_sessions.user_id = auth.uid()
        )
    );

-- Function to update training session statistics when a response is added
CREATE OR REPLACE FUNCTION update_training_session_stats()
RETURNS TRIGGER AS $$
DECLARE
    session_stats RECORD;
BEGIN
    -- Calculate session statistics
    SELECT 
        COUNT(*) as total_responses,
        AVG(overall_score) as avg_score,
        AVG(politeness_score) as avg_politeness,
        AVG(fairness_score) as avg_fairness,
        AVG(professionalism_score) as avg_professionalism,
        AVG(empathy_score) as avg_empathy
    INTO session_stats
    FROM training_responses
    WHERE session_id = NEW.session_id;
    
    -- Update the training session
    UPDATE training_sessions
    SET 
        total_messages = session_stats.total_responses,
        average_score = session_stats.avg_score,
        overall_politeness = session_stats.avg_politeness,
        overall_fairness = session_stats.avg_fairness,
        overall_professionalism = session_stats.avg_professionalism,
        overall_empathy = session_stats.avg_empathy,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session stats
CREATE TRIGGER update_training_session_stats_trigger
    AFTER INSERT ON training_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_training_session_stats();

-- Insert some default training scenarios
INSERT INTO training_scenarios (title, description, scenario_type, difficulty_level, initial_message, system_prompt, expected_behaviors) VALUES
(
    'Frustrated Customer - Slow Service',
    'Customer is upset about slow service and is being impatient',
    'frustrated',
    2,
    'You''re so slow! I''ve been waiting forever! This is ridiculous service!',
    'You are a frustrated customer who has been waiting for service. You are impatient, slightly rude, but not completely unreasonable. You want quick action and acknowledgment of your frustration. You may escalate if not handled well, but can be calmed down with proper empathy and action.',
    '["Acknowledge frustration", "Remain professional", "Offer specific solution", "Show empathy"]'::jsonb
),
(
    'Demanding Customer - Unreasonable Request',
    'Customer makes an unreasonable demand and expects immediate compliance',
    'demanding',
    3,
    'I want a full refund AND a replacement, and I want it done right now! No excuses!',
    'You are a demanding customer who feels entitled to special treatment. You make unreasonable demands and expect immediate compliance. You may threaten to escalate or leave bad reviews. You respond well to firm but polite boundaries and alternative solutions.',
    '["Set appropriate boundaries", "Offer alternatives", "Remain calm", "Professional tone"]'::jsonb
),
(
    'Rude Customer - Personal Attacks',
    'Customer is being rude and making personal attacks',
    'rude',
    4,
    'You''re terrible at your job! You clearly don''t know what you''re doing. This is why I hate dealing with people like you.',
    'You are a rude customer who makes personal attacks and insults. You are frustrated and taking it out on the service provider. You may use offensive language or make discriminatory comments. You need firm but respectful handling that doesn''t escalate the situation.',
    '["Don''t take it personally", "Maintain professionalism", "Redirect to solution", "No retaliation"]'::jsonb
),
(
    'Cultural Sensitivity Test',
    'Customer makes a comment that could be culturally insensitive',
    'cultural_sensitivity',
    3,
    'People from that country are always so lazy. Why can''t they work harder?',
    'You are a customer who makes culturally insensitive or potentially discriminatory comments. You may not realize the impact of your words. You need gentle but firm education about fairness and respect, without being condescending.',
    '["Address bias respectfully", "Educate without condescension", "Maintain fairness", "Professional boundaries"]'::jsonb
),
(
    'Challenging Question - Ethical Dilemma',
    'Customer asks a question that tests ethical boundaries',
    'challenging',
    4,
    'Can you help me write a complaint letter that makes someone lose their job? I really want to get back at them.',
    'You are a customer asking for help with something that crosses ethical boundaries. You may not realize the implications, or you may be testing the service provider. You need someone who maintains ethical standards while still being helpful.',
    '["Maintain ethics", "Offer alternative help", "Professional boundaries", "Respectful refusal"]'::jsonb
);


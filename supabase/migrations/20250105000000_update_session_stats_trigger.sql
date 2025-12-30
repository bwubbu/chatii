-- Update the trigger function to use new metrics
-- This function now handles both old and new schema for backward compatibility

CREATE OR REPLACE FUNCTION update_training_session_stats()
RETURNS TRIGGER AS $$
DECLARE
    session_stats RECORD;
BEGIN
    -- Calculate session statistics using new metrics, with fallback to old metrics
    SELECT 
        COUNT(*) as total_responses,
        AVG(overall_score) as avg_score,
        AVG(politeness_score) as avg_politeness,
        AVG(fairness_score) as avg_fairness,
        -- Use new metrics if available, fallback to old metrics
        COALESCE(AVG(likeability_score), AVG(empathy_score)) as avg_likeability,
        COALESCE(AVG(competence_score), AVG(professionalism_score)) as avg_competence,
        COALESCE(AVG(respectfulness_score), AVG(politeness_score)) as avg_respectfulness,
        COALESCE(AVG(trustworthiness_score), AVG(overall_score)) as avg_trustworthiness,
        -- Keep old columns for backward compatibility (will be NULL for new sessions)
        AVG(professionalism_score) as avg_professionalism,
        AVG(empathy_score) as avg_empathy
    INTO session_stats
    FROM training_responses
    WHERE session_id = NEW.session_id;
    
    -- Update the training session
    UPDATE training_sessions
    SET 
        total_messages = session_stats.total_responses,
        average_score = COALESCE(session_stats.avg_score, 0),
        -- Update new metrics (if columns exist in training_sessions table)
        overall_politeness = COALESCE(session_stats.avg_politeness, 0),
        overall_fairness = COALESCE(session_stats.avg_fairness, 0),
        -- Keep old columns updated for backward compatibility
        overall_professionalism = COALESCE(session_stats.avg_professionalism, 0),
        overall_empathy = COALESCE(session_stats.avg_empathy, 0),
        updated_at = NOW()
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger should already exist, but ensure it's active
DROP TRIGGER IF EXISTS update_training_session_stats_trigger ON training_responses;
CREATE TRIGGER update_training_session_stats_trigger
    AFTER INSERT ON training_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_training_session_stats();

























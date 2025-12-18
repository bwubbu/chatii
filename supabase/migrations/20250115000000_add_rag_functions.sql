-- Create function for matching book sections
DROP FUNCTION IF EXISTS match_book_sections(vector, float, int, text);

CREATE FUNCTION match_book_sections(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 2,
  target_culture_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  section_number int,
  book_title text,
  book_author text,
  chapter text,
  section_title text,
  content text,
  target_culture text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bs.id,
    bs.section_number,
    bs.book_title,
    bs.book_author,
    bs.chapter,
    bs.section_title,
    bs.content,
    bs.target_culture,
    1 - (bs.embedding <=> query_embedding) as similarity
  FROM book_sections bs
  WHERE bs.embedding IS NOT NULL
    AND 1 - (bs.embedding <=> query_embedding) > match_threshold
    AND (target_culture_filter IS NULL OR bs.target_culture = target_culture_filter)
  ORDER BY bs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for matching flag negative examples
DROP FUNCTION IF EXISTS match_flag_negative_examples(vector, float, int, uuid);

CREATE FUNCTION match_flag_negative_examples(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 2,
  persona_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  flag_training_id uuid,
  persona_id uuid,
  content text,
  reason text,
  severity text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fne.id,
    fne.flag_training_id,
    fne.persona_id,
    fne.content,
    fne.reason,
    fne.severity,
    1 - (fne.embedding <=> query_embedding) as similarity
  FROM flag_negative_examples fne
  WHERE fne.embedding IS NOT NULL
    AND 1 - (fne.embedding <=> query_embedding) > match_threshold
    AND (persona_id_filter IS NULL OR fne.persona_id = persona_id_filter)
  ORDER BY fne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

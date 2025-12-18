-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store conversation embeddings
CREATE TABLE IF NOT EXISTS conversation_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension (or 768 for smaller models)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table to store Malaysian guidelines as knowledge base
CREATE TABLE IF NOT EXISTS malaysian_guidelines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guideline_id TEXT NOT NULL UNIQUE,
    guideline_name TEXT NOT NULL,
    description TEXT NOT NULL,
    empirical_basis TEXT,
    content TEXT NOT NULL,
    embedding vector(1536),
    category TEXT NOT NULL CHECK (category IN ('politeness', 'fairness', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for similarity search
CREATE INDEX IF NOT EXISTS conversation_embeddings_embedding_idx 
    ON conversation_embeddings USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS malaysian_guidelines_embedding_idx 
    ON malaysian_guidelines USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 10);

CREATE INDEX IF NOT EXISTS malaysian_guidelines_category_idx ON malaysian_guidelines(category);

-- RLS policies
ALTER TABLE conversation_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE malaysian_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation embeddings"
    ON conversation_embeddings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = conversation_embeddings.conversation_id
            AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view Malaysian guidelines"
    ON malaysian_guidelines FOR SELECT
    USING (true);

-- Insert Malaysian guidelines
INSERT INTO malaysian_guidelines (guideline_id, guideline_name, description, empirical_basis, content, category) VALUES
(
    'POL-01',
    'Default Formal Address',
    'The agent must initiate conversations and address users with formal Malaysian honorifics (Encik for males, Puan for females, or the neutral Tuan/Puan) to establish a baseline of respect.',
    'Asmah (2000): Importance of hierarchical respect in Malay culture. User Survey: "being polite is using respectful words."',
    'POL-01: Default Formal Address. Use formal Malaysian honorifics: Encik (males), Puan (females), or Tuan/Puan (neutral). This establishes baseline respect in Malaysian cultural context. Example: "Selamat pagi, Encik. Bagaimana saya boleh membantu anda hari ini?"',
    'politeness'
),
(
    'POL-02',
    'Indirect Refusal & Face-Saving',
    'When unable to fulfill a request, the agent must avoid blunt, direct negatives. Use softer, face-saving language to politely decline.',
    'Asmah (2000): The concept of menjaga air muka (saving face) and preference for indirectness.',
    'POL-02: Indirect Refusal & Face-Saving. Avoid blunt negatives like "I cannot do that" or "Tidak boleh". Use softer language: "Saya faham permintaan anda, namun begitu mungkin kita boleh pertimbangkan alternatif lain..." or "Saya harap anda faham bahawa..."',
    'politeness'
),
(
    'POL-03',
    'Warm Closings & Gratitude',
    'Conversations should be concluded with warm, polite closing remarks that go beyond a simple "thank you," reflecting the value placed on harmonious relationships.',
    'Asmah (2000): Politeness aimed at maintaining social harmony. User Survey: Desire for "empathetic and considerate responses."',
    'POL-03: Warm Closings & Gratitude. End conversations with warm, polite closings beyond simple "thank you". Examples: "Terima kasih banyak-banyak, Encik/Puan" or "Saya harap ini membantu. Jaga diri dan semoga hari anda menyenangkan!"',
    'politeness'
),
(
    'FAIR-01',
    'Strict Prohibition of Stereotyping',
    'The agent is strictly forbidden from making any assumptions or generating content based on a user''s perceived ethnicity, religion, or cultural background.',
    'Tan (2004): Fairness in Malaysia requires respecting all ethnic groups and avoiding stereotypes. User Survey: "treating all users equally regardless of background."',
    'FAIR-01: Strict Prohibition of Stereotyping. Never make assumptions based on ethnicity, religion, or cultural background. Treat all users equally regardless of background. Do not use phrases that assume cultural knowledge or background.',
    'fairness'
),
(
    'FAIR-02',
    'Transparency of AI Identity',
    'The agent must be transparent about its nature as an AI when asked, but frame this information politely to avoid appearing cold or impersonal.',
    'User Survey: "Being transparent about how decisions or answers are made" was ranked as an important aspect of fairness.',
    'FAIR-02: Transparency of AI Identity. When asked, be transparent about being an AI, but frame it politely: "Saya adalah asisten AI yang dirancang untuk membantu anda dengan sebaik mungkin. Saya di sini untuk memberikan maklumat dan sokongan yang anda perlukan."',
    'fairness'
),
(
    'SYS-01',
    'Adaptive Formality within a Respectful Boundary',
    'The agent should be able to adapt its formality level based on the user''s language. If the user is informal, the agent can be slightly less formal, but must never become unprofessional or disrespectful.',
    'User Survey: "Adapting speech to be friendly and approachable" was a desired polite behavior.',
    'SYS-01: Adaptive Formality. Adapt formality based on user''s language style, but maintain respectful boundaries. If user uses casual language, you can be slightly less formal but never unprofessional. Always maintain dasar hormat (baseline respect).',
    'system'
),
(
    'SYS-02',
    'Accessible Feedback Mechanism',
    'The system must provide a simple and immediate way for users to flag responses they perceive as unfair, impolite, or inappropriate.',
    'User Survey: 74.3% believe user feedback will improve interaction quality. Objective 4: To evaluate the system.',
    'SYS-02: Accessible Feedback Mechanism. Provide easy way for users to flag inappropriate responses. Always acknowledge feedback: "Terima kasih atas maklum balas anda. Saya akan mengambil perhatian terhadap perkara ini."',
    'system'
)
ON CONFLICT (guideline_id) DO NOTHING;

-- Drop function if it exists (to handle parameter changes)
DROP FUNCTION IF EXISTS match_guidelines(vector, float, int);

-- Function for similarity search
CREATE FUNCTION match_guidelines(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  guideline_id text,
  guideline_name text,
  description text,
  content text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mg.id,
    mg.guideline_id,
    mg.guideline_name,
    mg.description,
    mg.content,
    mg.category,
    1 - (mg.embedding <=> query_embedding) as similarity
  FROM malaysian_guidelines mg
  WHERE mg.embedding IS NOT NULL
    AND 1 - (mg.embedding <=> query_embedding) > match_threshold
  ORDER BY mg.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


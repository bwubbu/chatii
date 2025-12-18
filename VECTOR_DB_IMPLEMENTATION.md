# Vector Database Implementation Guide

## 🎯 What is a Vector Database?

A vector database stores text as **embeddings** (numerical representations) that capture semantic meaning. This allows you to:
- Find similar content by meaning (not just keywords)
- Retrieve relevant context automatically
- Build a knowledge base the AI can reference
- Enable RAG (Retrieval Augmented Generation)

## ✅ Benefits for Your Project

### 1. **Malaysian Guidelines Knowledge Base**
- Store all 7 guidelines (POL-01 to POL-03, FAIR-01 to FAIR-02, SYS-01 to SYS-02) as searchable knowledge
- AI can retrieve relevant guidelines based on conversation context
- No need to hardcode everything in system prompts

### 2. **Context-Aware Responses**
- AI finds similar past conversations
- References relevant guidelines automatically
- Adapts responses based on retrieved context

### 3. **Better Training Data Discovery**
- Find similar training examples
- Identify patterns in user interactions
- Improve model over time

### 4. **Multilingual Support** (Future)
- Store Malay/English guidelines
- Retrieve based on user's language preference

## 🚀 Step-by-Step Implementation

### Step 1: Enable pgvector Extension in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify it's installed
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Step 2: Create Embeddings Table

```sql
-- Table to store conversation embeddings
CREATE TABLE conversation_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- Original text
    embedding vector(1536), -- OpenAI embedding dimension (or 768 for smaller models)
    metadata JSONB DEFAULT '{}'::jsonb, -- Store persona_id, user_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table to store Malaysian guidelines as knowledge base
CREATE TABLE malaysian_guidelines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guideline_id TEXT NOT NULL UNIQUE, -- POL-01, FAIR-01, etc.
    guideline_name TEXT NOT NULL,
    description TEXT NOT NULL,
    empirical_basis TEXT,
    content TEXT NOT NULL, -- Full guideline text
    embedding vector(1536),
    category TEXT NOT NULL, -- 'politeness', 'fairness', 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for similarity search
CREATE INDEX ON conversation_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON malaysian_guidelines USING ivfflat (embedding vector_cosine_ops);

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
```

### Step 3: Insert Malaysian Guidelines

```sql
-- Insert all Malaysian guidelines
INSERT INTO malaysian_guidelines (guideline_id, guideline_name, description, empirical_basis, content, category) VALUES
(
    'POL-01',
    'Default Formal Address',
    'The agent must initiate conversations and address users with formal Malaysian honorifics (Encik for males, Puan for females, or the neutral Tuan/Puan) to establish a baseline of respect.',
    'Asmah (2000): Importance of hierarchical respect in Malay culture. User Survey: "being polite is using respectful words."',
    'POL-01: Default Formal Address. Use formal Malaysian honorifics: Encik (males), Puan (females), or Tuan/Puan (neutral). This establishes baseline respect in Malaysian cultural context.',
    'politeness'
),
(
    'POL-02',
    'Indirect Refusal & Face-Saving',
    'When unable to fulfill a request, the agent must avoid blunt, direct negatives. Use softer, face-saving language to politely decline.',
    'Asmah (2000): The concept of menjaga air muka (saving face) and preference for indirectness.',
    'POL-02: Indirect Refusal & Face-Saving. Avoid blunt negatives like "I cannot do that". Use softer language: "I understand your request, however..." or "Perhaps we could consider an alternative approach..."',
    'politeness'
),
(
    'POL-03',
    'Warm Closings & Gratitude',
    'Conversations should be concluded with warm, polite closing remarks that go beyond a simple "thank you," reflecting the value placed on harmonious relationships.',
    'Asmah (2000): Politeness aimed at maintaining social harmony. User Survey: Desire for "empathetic and considerate responses."',
    'POL-03: Warm Closings & Gratitude. End conversations with warm, polite closings beyond simple "thank you". Examples: "Terima kasih banyak-banyak" or "Saya harap ini membantu. Jaga diri!"',
    'politeness'
),
(
    'FAIR-01',
    'Strict Prohibition of Stereotyping',
    'The agent is strictly forbidden from making any assumptions or generating content based on a user''s perceived ethnicity, religion, or cultural background.',
    'Tan (2004): Fairness in Malaysia requires respecting all ethnic groups and avoiding stereotypes.',
    'FAIR-01: Strict Prohibition of Stereotyping. Never make assumptions based on ethnicity, religion, or cultural background. Treat all users equally regardless of background.',
    'fairness'
),
(
    'FAIR-02',
    'Transparency of AI Identity',
    'The agent must be transparent about its nature as an AI when asked, but frame this information politely to avoid appearing cold or impersonal.',
    'User Survey: "Being transparent about how decisions or answers are made" was ranked as an important aspect of fairness.',
    'FAIR-02: Transparency of AI Identity. When asked, be transparent about being an AI, but frame it politely: "Saya adalah asisten AI yang dirancang untuk membantu anda..."',
    'fairness'
),
(
    'SYS-01',
    'Adaptive Formality within a Respectful Boundary',
    'The agent should be able to adapt its formality level based on the user''s language. If the user is informal, the agent can be slightly less formal, but must never become unprofessional or disrespectful.',
    'User Survey: "Adapting speech to be friendly and approachable" was a desired polite behavior.',
    'SYS-01: Adaptive Formality. Adapt formality based on user''s language style, but maintain respectful boundaries. Never become unprofessional or disrespectful.',
    'system'
),
(
    'SYS-02',
    'Accessible Feedback Mechanism',
    'The system must provide a simple and immediate way for users to flag responses they perceive as unfair, impolite, or inappropriate.',
    'User Survey: 74.3% believe user feedback will improve interaction quality.',
    'SYS-02: Accessible Feedback Mechanism. Provide easy way for users to flag inappropriate responses for continuous improvement.',
    'system'
);
```

### Step 4: Create Embedding Generation API

Create `app/api/embeddings/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use OpenAI or Cohere API to generate embeddings
    const apiKey = process.env.OPENAI_API_KEY || process.env.COHERE_API_KEY;
    const useOpenAI = !!process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Embedding API key not configured" },
        { status: 500 }
      );
    }

    let embedding;

    if (useOpenAI) {
      // OpenAI embeddings
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small", // or text-embedding-ada-002
          input: text,
        }),
      });

      const data = await response.json();
      embedding = data.data[0].embedding;
    } else {
      // Cohere embeddings (free alternative)
      const response = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "embed-english-v3.0",
          texts: [text],
          input_type: "search_document",
        }),
      });

      const data = await response.json();
      embedding = data.embeddings[0];
    }

    return NextResponse.json({ embedding });
  } catch (error) {
    console.error("Embedding generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 }
    );
  }
}
```

### Step 5: Create RAG Retrieval API

Create `app/api/rag/retrieve/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 3, category } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Generate embedding for the query
    const embeddingResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/embeddings/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query }),
      }
    );

    const { embedding } = await embeddingResponse.json();

    if (!embedding) {
      return NextResponse.json(
        { error: "Failed to generate query embedding" },
        { status: 500 }
      );
    }

    // Search Malaysian guidelines
    let queryBuilder = supabase.rpc("match_guidelines", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (category) {
      // Filter by category if provided
      queryBuilder = supabase
        .from("malaysian_guidelines")
        .select("*")
        .eq("category", category);
    }

    const { data, error } = await supabase.rpc("match_guidelines", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
    });

    if (error) {
      console.error("RAG retrieval error:", error);
      return NextResponse.json(
        { error: "Failed to retrieve guidelines" },
        { status: 500 }
      );
    }

    return NextResponse.json({ guidelines: data || [] });
  } catch (error) {
    console.error("RAG error:", error);
    return NextResponse.json(
      { error: "RAG retrieval failed" },
      { status: 500 }
    );
  }
}
```

### Step 6: Create Similarity Search Function in Supabase

Run this SQL in Supabase:

```sql
-- Function for similarity search
CREATE OR REPLACE FUNCTION match_guidelines(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
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
    malaysian_guidelines.id,
    malaysian_guidelines.guideline_id,
    malaysian_guidelines.guideline_name,
    malaysian_guidelines.description,
    malaysian_guidelines.content,
    malaysian_guidelines.category,
    1 - (malaysian_guidelines.embedding <=> query_embedding) as similarity
  FROM malaysian_guidelines
  WHERE 1 - (malaysian_guidelines.embedding <=> query_embedding) > match_threshold
  ORDER BY malaysian_guidelines.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Step 7: Generate Embeddings for Guidelines

Create a script to populate embeddings:

```typescript
// scripts/generate_guideline_embeddings.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateEmbeddings() {
  // Fetch all guidelines without embeddings
  const { data: guidelines, error } = await supabase
    .from("malaysian_guidelines")
    .select("*")
    .is("embedding", null);

  if (error) {
    console.error("Error fetching guidelines:", error);
    return;
  }

  for (const guideline of guidelines) {
    // Generate embedding
    const response = await fetch("http://localhost:3000/api/embeddings/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: guideline.content }),
    });

    const { embedding } = await response.json();

    // Update guideline with embedding
    await supabase
      .from("malaysian_guidelines")
      .update({ embedding })
      .eq("id", guideline.id);

    console.log(`Generated embedding for ${guideline.guideline_id}`);
  }
}

generateEmbeddings();
```

### Step 8: Integrate RAG into Chat System

Update your chat API to use RAG:

```typescript
// In app/api/trained-model/route.ts or app/api/gemini-chat/route.ts

// Before generating response, retrieve relevant guidelines
const ragResponse = await fetch("/api/rag/retrieve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    query: userMessage,
    limit: 2, // Get top 2 most relevant guidelines
  }),
});

const { guidelines } = await ragResponse.json();

// Add guidelines to system prompt
const enhancedSystemPrompt = `
${baseSystemPrompt}

MALAYSIAN CULTURAL GUIDELINES (Apply these based on context):
${guidelines.map(g => `- ${g.content}`).join('\n')}

Remember to:
- Use formal Malaysian honorifics (Encik/Puan/Tuan) when appropriate
- Use indirect, face-saving language for refusals
- End with warm, polite closings
- Never stereotype based on background
- Adapt formality while maintaining respect
`;
```

## 🤔 Do You Need Fine-Tuning?

### **Short Answer: NO, not necessary**

### Why RAG + System Prompts Work Better:

1. **Flexibility**: Guidelines can be updated without retraining
2. **Context-Aware**: Only relevant guidelines are retrieved
3. **Faster**: No training time needed
4. **Cost-Effective**: No GPU costs for training
5. **Easier to Maintain**: Update database, not model

### When Fine-Tuning WOULD Be Needed:

- If you want the model to **automatically** follow guidelines without system prompts
- If you need **very specific** language patterns that RAG can't provide
- If you want the model to **internalize** Malaysian cultural norms

### Recommended Approach: **Hybrid**

1. **Use RAG** for guideline retrieval (what you're doing now)
2. **Enhance system prompts** with retrieved guidelines
3. **Optional**: Fine-tune a small model later if needed

## 📚 Where to Find Metadata

### For Malaysian Guidelines:

1. **Academic Sources** (from your screenshots):
   - Asmah (2000) - Malay culture and politeness
   - Tan (2004) - Fairness in Malaysia
   - Hall & Hall (1990) - Cultural communication

2. **User Surveys**:
   - Your own survey data (74.3% feedback stat)
   - "Being polite is using respectful words"
   - "Adapting speech to be friendly"

3. **Cultural Resources**:
   - Malaysian language guides
   - Business etiquette guides
   - Government communication standards

### For Training Data:

1. **Your existing data**:
   - `fine_tuning/data/fairness_politeness_training_v2_conversations.jsonl`
   - Add Malaysian-specific examples

2. **Create Malaysian-specific training examples**:
   ```jsonl
   {"instruction": "User asks for something I cannot do", "input": "", "output": "Encik, saya faham permintaan anda. Namun begitu, mungkin kita boleh pertimbangkan alternatif lain yang lebih sesuai..."}
   ```

## 🎯 Implementation Priority

1. **Phase 1**: Set up pgvector + guidelines table (Steps 1-3)
2. **Phase 2**: Generate embeddings for guidelines (Step 7)
3. **Phase 3**: Create RAG API (Steps 4-6)
4. **Phase 4**: Integrate into chat system (Step 8)

## 💡 Quick Start

1. Run Step 1-3 SQL in Supabase
2. Add `OPENAI_API_KEY` or `COHERE_API_KEY` to `.env.local`
3. Run embedding generation script
4. Test RAG retrieval
5. Integrate into chat

This approach gives you Malaysian context awareness without expensive fine-tuning!




















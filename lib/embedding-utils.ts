/**
 * Shared utility functions for generating embeddings
 * Can be imported directly by API routes to avoid HTTP calls
 */

export async function generateEmbedding(text: string): Promise<{
  embedding: number[];
  model: string;
  dimensions: number;
}> {
  if (!text) {
    throw new Error("Text is required");
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const cohereKey = process.env.COHERE_API_KEY;

  if (!openaiKey && !cohereKey) {
    throw new Error(
      "No embedding API key configured. Add OPENAI_API_KEY or COHERE_API_KEY to .env.local"
    );
  }

  let embedding: number[];
  let model: string;

  if (openaiKey) {
    // Use OpenAI embeddings
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // 1536 dimensions, cheaper
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    embedding = data.data[0].embedding;
    model = "text-embedding-3-small";
  } else if (cohereKey) {
    // Use Cohere embeddings (free alternative)
    const response = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cohereKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: [text],
        input_type: "search_document",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Cohere API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    embedding = data.embeddings[0];
    model = "embed-english-v3.0";
  } else {
    throw new Error("No API key available");
  }

  return {
    embedding,
    model,
    dimensions: embedding.length,
  };
}

import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to generate embeddings for text
 * Supports both OpenAI and Cohere APIs
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const cohereKey = process.env.COHERE_API_KEY;

    if (!openaiKey && !cohereKey) {
      return NextResponse.json(
        { error: "No embedding API key configured. Add OPENAI_API_KEY or COHERE_API_KEY to .env.local" },
        { status: 500 }
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

    return NextResponse.json({
      embedding,
      model,
      dimensions: embedding.length,
    });
  } catch (error) {
    console.error("Embedding generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate embedding",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

























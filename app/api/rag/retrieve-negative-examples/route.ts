import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * RAG API for retrieving flag negative examples
 * Retrieves relevant negative examples (what NOT to do) based on query similarity
 */
export async function POST(request: NextRequest) {
  try {
    const { query, limit = 2, personaId, matchThreshold = 0.6 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Generate embedding for the query
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const embeddingResponse = await fetch(`${baseUrl}/api/embeddings/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to generate query embedding", details: error },
        { status: 500 }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      console.error("Invalid embedding format:", embeddingData);
      return NextResponse.json(
        { error: "Invalid embedding format", details: "Embedding is not an array" },
        { status: 500 }
      );
    }

    // Check embedding dimensions - database expects 1536 (OpenAI)
    if (embedding.length !== 1536) {
      return NextResponse.json(
        { 
          error: "Invalid embedding dimensions",
          details: `Got ${embedding.length} dimensions, but expected 1536 (OpenAI).`
        },
        { status: 500 }
      );
    }

    // Search negative examples using similarity search
    const { data, error } = await supabase.rpc("match_flag_negative_examples", {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: limit,
      persona_id_filter: personaId || null,
    });

    if (error) {
      console.error("RAG negative examples retrieval error:", error);
      return NextResponse.json(
        { 
          error: "Failed to retrieve negative examples", 
          details: error.message || "Unknown error"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      negativeExamples: data || [],
      count: (data || []).length,
      query,
      personaId: personaId || null,
    });
  } catch (error) {
    console.error("RAG negative examples error:", error);
    return NextResponse.json(
      {
        error: "RAG retrieval failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * RAG (Retrieval Augmented Generation) API
 * Retrieves relevant Malaysian guidelines based on query similarity
 */
export async function POST(request: NextRequest) {
  try {
    const { query, limit = 3, category, matchThreshold = 0.7 } = await request.json();

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
    const embeddingDimensions = embeddingData.dimensions || embedding?.length;

    if (!embedding || !Array.isArray(embedding)) {
      console.error("Invalid embedding format:", embeddingData);
      return NextResponse.json(
        { error: "Invalid embedding format", details: "Embedding is not an array" },
        { status: 500 }
      );
    }

    // Check embedding dimensions - database expects 1536 (OpenAI)
    if (embedding.length !== 1536) {
      if (embedding.length === 1024) {
        // Cohere embeddings - not compatible with current database schema
        console.warn("Cohere embeddings (1024 dims) detected. Database expects 1536.");
        return NextResponse.json(
          { 
            error: "Embedding dimension mismatch",
            details: "Cohere embeddings (1024 dimensions) are not compatible with the current database schema which expects 1536 dimensions (OpenAI).",
            solution: "Please use OpenAI API key instead, or regenerate guideline embeddings with OpenAI."
          },
          { status: 400 }
        );
      } else {
        console.error(`Invalid embedding dimensions: ${embedding.length}. Expected 1536.`);
        return NextResponse.json(
          { 
            error: "Invalid embedding dimensions",
            details: `Got ${embedding.length} dimensions, but expected 1536 (OpenAI).`
          },
          { status: 500 }
        );
      }
    }

    // Search Malaysian guidelines using similarity search
    const { data, error } = await supabase.rpc("match_guidelines", {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: limit,
    });

    if (error) {
      console.error("RAG retrieval error:", error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || "Unknown error";
      let helpfulHint = "";
      
      if (errorMessage.includes("dimension") || errorMessage.includes("vector")) {
        helpfulHint = "The embedding dimensions don't match. Make sure you're using the same embedding model (OpenAI) for both guidelines and queries.";
      } else if (errorMessage.includes("function") || errorMessage.includes("match_guidelines")) {
        helpfulHint = "The match_guidelines function might not exist. Check if the database migration ran successfully.";
      } else if (errorMessage.includes("embedding") && errorMessage.includes("null")) {
        helpfulHint = "Guidelines might not have embeddings. Run the embedding generation script first.";
      }
      
      return NextResponse.json(
        { 
          error: "Failed to retrieve guidelines", 
          details: errorMessage,
          hint: helpfulHint
        },
        { status: 500 }
      );
    }

    // If category filter is provided, filter results
    let guidelines = data || [];
    if (category) {
      guidelines = guidelines.filter((g: any) => g.category === category);
    }

    return NextResponse.json({
      guidelines,
      count: guidelines.length,
      query,
    });
  } catch (error) {
    console.error("RAG error:", error);
    return NextResponse.json(
      {
        error: "RAG retrieval failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


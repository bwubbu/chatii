import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/embedding-utils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * RAG API for retrieving book sections
 * Retrieves relevant book sections based on query similarity and target culture
 */
export async function POST(request: NextRequest) {
  try {
    const { query, limit = 2, targetCulture, matchThreshold = 0.6 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Generate embedding for the query
    // Use direct function call instead of HTTP to avoid URL issues
    let embedding: number[];
    try {
      const embeddingData = await generateEmbedding(query);
      embedding = embeddingData.embedding;
      
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
    } catch (embeddingError) {
      console.error("Embedding generation error:", embeddingError);
      return NextResponse.json(
        { 
          error: "Failed to generate query embedding", 
          details: embeddingError instanceof Error ? embeddingError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    // Search book sections using similarity search
    const { data, error } = await supabase.rpc("match_book_sections", {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: limit,
      target_culture_filter: targetCulture || null,
    });

    if (error) {
      console.error("RAG book sections retrieval error:", error);
      return NextResponse.json(
        { 
          error: "Failed to retrieve book sections", 
          details: error.message || "Unknown error"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sections: data || [],
      count: (data || []).length,
      query,
      targetCulture: targetCulture || null,
    });
  } catch (error) {
    console.error("RAG book sections error:", error);
    return NextResponse.json(
      {
        error: "RAG retrieval failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}






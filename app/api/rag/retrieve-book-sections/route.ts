import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * RAG API for retrieving relevant book sections
 * Can filter by target culture (Malay, Malaysian Chinese, Malaysian Indian, Swedish, General)
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      limit = 3, 
      targetCulture, 
      matchThreshold = 0.7 
    } = await request.json();

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

    if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
      return NextResponse.json(
        { 
          error: "Invalid embedding dimensions",
          details: `Got ${embedding?.length || 0} dimensions, but expected 1536 (OpenAI).`
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
      console.error("Book sections retrieval error:", error);
      return NextResponse.json(
        { 
          error: "Failed to retrieve book sections", 
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sections: data || [],
      count: (data || []).length,
      query,
      targetCulture: targetCulture || "all",
    });
  } catch (error) {
    console.error("Book sections RAG error:", error);
    return NextResponse.json(
      {
        error: "Book sections retrieval failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


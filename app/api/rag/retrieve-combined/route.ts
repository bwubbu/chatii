import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Combined RAG API - Retrieves both Malaysian guidelines and book sections in one call
 * More efficient than separate calls
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      guidelinesLimit = 3,
      bookSectionsLimit = 2,
      targetCulture,
      matchThreshold = 0.6
    } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Generate embedding for the query (only once!)
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

    // Query both tables in parallel using the same embedding
    const [guidelinesResult, bookSectionsResult] = await Promise.all([
      // Query Malaysian guidelines
      supabase.rpc("match_guidelines", {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: guidelinesLimit,
      }),
      // Query book sections
      supabase.rpc("match_book_sections", {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: bookSectionsLimit,
        target_culture_filter: targetCulture || null,
      }),
    ]);

    // Handle guidelines errors
    if (guidelinesResult.error) {
      console.error("Guidelines retrieval error:", guidelinesResult.error);
    }

    // Handle book sections errors
    if (bookSectionsResult.error) {
      console.error("Book sections retrieval error:", bookSectionsResult.error);
    }

    // Filter book sections by category if needed (already filtered by culture in SQL)
    let bookSections = bookSectionsResult.data || [];

    // Filter guidelines by category if provided (optional)
    let guidelines = guidelinesResult.data || [];

    return NextResponse.json({
      guidelines: guidelines,
      bookSections: bookSections,
      guidelinesCount: guidelines.length,
      bookSectionsCount: bookSections.length,
      query,
      targetCulture: targetCulture || "all",
    });
  } catch (error) {
    console.error("Combined RAG error:", error);
    return NextResponse.json(
      {
        error: "Combined RAG retrieval failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


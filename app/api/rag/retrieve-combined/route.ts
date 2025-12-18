import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Combined RAG API
 * Retrieves guidelines, book sections, and negative examples in a single call
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      guidelinesLimit = 3, 
      bookSectionsLimit = 2,
      negativeExamplesLimit = 2,
      targetCulture,
      personaId,
      matchThreshold = 0.6 
    } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Generate embedding for the query (shared across all retrievals)
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
          error: "Invalid embedding format",
          details: `Expected array of 1536 dimensions, got ${embedding?.length || 0}`
        },
        { status: 500 }
      );
    }

    // Retrieve all three types in parallel
    const [guidelinesResult, bookSectionsResult, negativeExamplesResult] = await Promise.all([
      // Guidelines
      supabase.rpc("match_guidelines", {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: guidelinesLimit,
      }),
      // Book sections
      supabase.rpc("match_book_sections", {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: bookSectionsLimit,
        target_culture_filter: targetCulture || null,
      }),
      // Negative examples (only if there's data)
      supabase.rpc("match_flag_negative_examples", {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: negativeExamplesLimit,
        persona_id_filter: personaId || null,
      }),
    ]);

    // Handle errors gracefully
    const guidelines = guidelinesResult.error ? [] : (guidelinesResult.data || []);
    const bookSections = bookSectionsResult.error ? [] : (bookSectionsResult.data || []);
    const negativeExamples = negativeExamplesResult.error ? [] : (negativeExamplesResult.data || []);

    // Log any errors (but don't fail the request)
    if (guidelinesResult.error) {
      console.warn("Guidelines retrieval error:", guidelinesResult.error);
    }
    if (bookSectionsResult.error) {
      console.warn("Book sections retrieval error:", bookSectionsResult.error);
    }
    if (negativeExamplesResult.error) {
      console.warn("Negative examples retrieval error:", negativeExamplesResult.error);
    }

    return NextResponse.json({
      guidelines,
      bookSections,
      negativeExamples,
      counts: {
        guidelines: guidelines.length,
        bookSections: bookSections.length,
        negativeExamples: negativeExamples.length,
      },
      query,
      targetCulture: targetCulture || null,
      personaId: personaId || null,
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

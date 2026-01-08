import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embedding-utils";

/**
 * API endpoint to generate embeddings for text
 * Supports both OpenAI and Cohere APIs
 * This endpoint is kept for external API calls, but uses the shared utility internally
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const embeddingData = await generateEmbedding(text);

    return NextResponse.json({
      embedding: embeddingData.embedding,
      model: embeddingData.model,
      dimensions: embeddingData.dimensions,
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

























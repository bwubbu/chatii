import { NextRequest, NextResponse } from "next/server";
import { verifyAPIKey, extractAPIKey } from "@/lib/api-key-auth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/v1/chat
 * Public API endpoint for chat using API keys
 * 
 * Headers:
 *   Authorization: Bearer sk_... (or just sk_...)
 * 
 * Body:
 *   {
 *     "message": "Hello!",
 *     "conversation_history": [ // optional
 *       { "role": "user", "content": "Previous message" },
 *       { "role": "assistant", "content": "Previous response" }
 *     ],
 *     "temperature": 0.7, // optional
 *     "max_tokens": 200   // optional
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get("Authorization");
    const apiKey = extractAPIKey(authHeader);

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: "Missing or invalid API key. Include your API key in the Authorization header: 'Bearer sk_...' or 'sk_...'"
        },
        { status: 401 }
      );
    }

    // Verify API key
    let keyInfo;
    try {
      keyInfo = await verifyAPIKey(apiKey);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Rate limit")) {
        return NextResponse.json(
          { 
            error: "Rate limit exceeded",
            message: "You have exceeded your rate limit. Please try again later."
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: "Invalid or inactive API key"
        },
        { status: 401 }
      );
    }

    if (!keyInfo) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: "Invalid or inactive API key"
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, conversation_history = [], temperature = 0.7, max_tokens = 200 } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Bad Request", message: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // Get persona data for the API key
    const { data: persona, error: personaError } = await supabaseAdmin
      .from("personas")
      .select("*")
      .eq("id", keyInfo.persona_id)
      .eq("is_active", true)
      .single();

    if (personaError || !persona) {
      return NextResponse.json(
        { 
          error: "Internal Server Error",
          message: "Persona associated with this API key is not available"
        },
        { status: 500 }
      );
    }

    // Build system prompt from persona
    const systemPrompt = persona.system_prompt || "";

    // Call the trained model endpoint (which handles Gemini/Vertex AI)
    // Use absolute URL for internal fetch to work in production
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (request.url ? new URL(request.url).origin : 'http://localhost:3000');
    const trainedModelUrl = `${baseUrl}/api/trained-model`;
    
    const trainedModelResponse = await fetch(trainedModelUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_history,
        system_prompt: systemPrompt,
        temperature,
        max_tokens,
      }),
    });

    if (!trainedModelResponse.ok) {
      const errorData = await trainedModelResponse.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: "Internal Server Error",
          message: errorData.error || "Failed to generate response"
        },
        { status: 500 }
      );
    }

    const trainedModelData = await trainedModelResponse.json();

    // Return response in a clean format
    return NextResponse.json({
      response: trainedModelData.response,
      model: trainedModelData.model,
      persona: {
        id: persona.id,
        name: persona.name,
      },
      usage: {
        remaining: Math.max(0, keyInfo.rate_limit - keyInfo.usage_count),
        limit: keyInfo.rate_limit,
      },
      metadata: {
        processing_time_ms: trainedModelData.processing_time_ms,
        timestamp: trainedModelData.timestamp,
      },
    });
  } catch (error) {
    console.error("API v1 chat error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/chat
 * Health check and API information
 */
export async function GET() {
  return NextResponse.json({
    message: "Chat API v1",
    version: "1.0.0",
    authentication: "API key required in Authorization header",
    format: "Bearer sk_... or sk_...",
    endpoints: {
      chat: "POST /api/v1/chat",
    },
    example: {
      method: "POST",
      url: "/api/v1/chat",
      headers: {
        "Authorization": "Bearer sk_your_api_key_here",
        "Content-Type": "application/json",
      },
      body: {
        message: "Hello!",
        conversation_history: [],
        temperature: 0.7,
        max_tokens: 200,
      },
    },
  });
}

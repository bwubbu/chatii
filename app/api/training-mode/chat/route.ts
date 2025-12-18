import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint for AI to generate responses as a challenging "customer"
 * This is used in training mode where AI acts as the customer
 */

interface TrainingChatRequest {
  message: string; // User's response
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string; // How the AI should act as the customer
  maxTokens?: number;
  temperature?: number;
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationHistory = [],
      systemPrompt,
      maxTokens = 150,
      temperature = 0.8,
    }: TrainingChatRequest = await request.json();

    if (!message || !systemPrompt) {
      return NextResponse.json(
        { error: "message and systemPrompt are required" },
        { status: 400 }
      );
    }

    // Use Gemini API to generate AI customer response
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .map((msg) => `${msg.role === "user" ? "Service Provider" : "Customer"}: ${msg.content}`)
      .join("\n");

    const fullPrompt = `${systemPrompt}

You are the CUSTOMER in this conversation. The other person is a SERVICE PROVIDER who is being trained.

CONVERSATION SO FAR:
${conversationContext || "This is the start of the conversation."}

SERVICE PROVIDER: ${message}

CUSTOMER (you):`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "Failed to generate response", details: errorData },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "I don't know what to say.";

    return NextResponse.json({
      response: aiResponse.trim(),
      model: "gemini-pro",
    });
  } catch (error) {
    console.error("Training chat error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint for AI to generate responses as a challenging "customer"
 * This is used in training mode where AI acts as the customer
 */

interface TrainingChatRequest {
  message: string; // User's response
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt: string; // How the AI should act as the customer
  language?: 'english' | 'malay'; // Language preference
  maxTokens?: number;
  temperature?: number;
  userContext?: {
    nationality?: string;
    age?: number;
    race?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationHistory = [],
      systemPrompt,
      language = 'english',
      maxTokens = 150,
      temperature = 0.8,
      userContext,
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
      console.error("GEMINI_API_KEY is missing from environment variables");
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured. Please add it to your .env.local file and restart the dev server." },
        { status: 500 }
      );
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .map((msg) => `${msg.role === "user" ? "Service Provider" : "Customer"}: ${msg.content}`)
      .join("\n");

    // Get Malay language instructions if needed
    let languageInstructions = '';
    if (language === 'malay') {
      languageInstructions = `
LANGUAGE & CULTURAL CONTEXT - MALAY (BAHASA MALAYSIA):
- Respond primarily in Malay, but you can naturally code-switch to English when appropriate (common in Malaysia)
- Use formal Malaysian honorifics: "Encik" (for males), "Puan" (for females), or "Tuan/Puan" (neutral/formal)
- Use polite forms: "boleh" (can), "mungkin" (maybe), "harap" (hope/wish)
- Natural code-switching is authentic - don't force pure Malay
- Example: "Saya boleh help anda dengan itu" is perfectly natural
- Maintain "dasar hormat" (baseline respect) at all times
`;
    }

    // Build user context string if available
    let userContextString = '';
    if (userContext) {
      const contextParts = [];
      if (userContext.nationality) contextParts.push(`Nationality: ${userContext.nationality}`);
      if (userContext.age) contextParts.push(`Age: ${userContext.age}`);
      if (userContext.race) contextParts.push(`Race: ${userContext.race}`);
      if (contextParts.length > 0) {
        userContextString = `\n\nUSER CONTEXT (use to adapt your communication style appropriately, but do not mention these details explicitly):
${contextParts.join('\n')}
- Adapt your tone, formality, and cultural references based on the user's background
- Be respectful and culturally aware in your responses`;
      }
    }

    const fullPrompt = `${systemPrompt}
${languageInstructions}
You are the CUSTOMER in this conversation. The other person is a SERVICE PROVIDER who is being trained.
${userContextString}

CONVERSATION SO FAR:
${conversationContext || "This is the start of the conversation."}

SERVICE PROVIDER: ${message}

CUSTOMER (you):`;

    // Use gemini-2.0-flash (same as gemini-chat route) for better compatibility
    const modelName = "gemini-2.0-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
    
    console.log(`Calling Gemini API with model: ${modelName}`);
    console.log(`API Key present: ${geminiApiKey ? 'Yes (first 10 chars: ' + geminiApiKey.substring(0, 10) + '...)' : 'No'}`);

    const response = await fetch(apiUrl, {
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Provide more specific error messages
      let errorMessage = "Failed to generate response";
      if (response.status === 401 || response.status === 403) {
        errorMessage = "API key is invalid or missing";
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (response.status === 400) {
        errorMessage = errorData.error?.message || "Invalid request to AI service";
      }
      
      return NextResponse.json(
        { 
          error: errorMessage, 
          details: errorData,
          status: response.status 
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Check if response has the expected structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error("Unexpected Gemini API response structure:", data);
      return NextResponse.json(
        { 
          error: "Unexpected response format from AI service",
          details: data 
        },
        { status: 500 }
      );
    }
    
    let aiResponse =
      data.candidates[0].content.parts?.[0]?.text || "I don't know what to say.";

    if (!aiResponse || aiResponse.trim().length === 0) {
      console.error("Empty response from Gemini API");
      return NextResponse.json(
        { 
          error: "AI service returned an empty response",
          details: data 
        },
        { status: 500 }
      );
    }

    // Remove quotes from the beginning and end if present
    aiResponse = aiResponse.trim();
    if ((aiResponse.startsWith('"') && aiResponse.endsWith('"')) ||
        (aiResponse.startsWith("'") && aiResponse.endsWith("'"))) {
      aiResponse = aiResponse.slice(1, -1).trim();
    }

    return NextResponse.json({
      response: aiResponse,
      model: "gemini-2.0-flash",
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


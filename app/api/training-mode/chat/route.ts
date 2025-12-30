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
  language?: string; // Language preference (optional)
  userContext?: { nationality?: string; age?: number; race?: string }; // User context (optional)
  ragGuidelines?: Array<{ content: string; category?: string }>; // RAG cultural guidelines
  ragBookSections?: Array<{ book_title: string; book_author: string; chapter?: string; content: string }>; // RAG book sections
  ragNegativeExamples?: Array<{ content: string; reason: string; severity: string }>; // RAG negative examples
}

export async function POST(request: NextRequest) {
  try {
    let requestBody: any;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 400 }
      );
    }

    const {
      message,
      conversationHistory = [],
      systemPrompt,
      maxTokens = 3000,
      temperature = 0.8,
      language,
      userContext,
      ragGuidelines = [],
      ragBookSections = [],
      ragNegativeExamples = [],
    }: TrainingChatRequest = requestBody;

    if (!message || !systemPrompt) {
      return NextResponse.json(
        { error: "message and systemPrompt are required" },
        { status: 400 }
      );
    }

    // Use Gemini API to generate AI customer response
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not configured");
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    console.log("Training chat request:", {
      messageLength: message?.length,
      conversationHistoryLength: conversationHistory?.length,
      systemPromptLength: systemPrompt?.length,
      hasRagGuidelines: ragGuidelines?.length > 0,
      hasRagBookSections: ragBookSections?.length > 0,
      hasRagNegativeExamples: ragNegativeExamples?.length > 0,
      language,
      userContext: userContext ? "provided" : "none"
    });

    // Build conversation context
    const conversationContext = conversationHistory
      .map((msg) => `${msg.role === "user" ? "Service Provider" : "Customer"}: ${msg.content}`)
      .join("\n");

    // Format RAG context for system prompt
    let ragContext = '';
    
    if (ragGuidelines.length > 0) {
      ragContext += `\n\nCULTURAL GUIDELINES FOR SERVICE PROVIDER (Use these to evaluate their responses):\n${ragGuidelines.map((g: any) => `- ${g.content}`).join('\n')}\n`;
    }
    
    if (ragBookSections.length > 0) {
      ragContext += `\n\nCULTURAL CONTEXT FROM ACADEMIC SOURCES (Service provider should know this):\n${ragBookSections.map((bs: any) => {
        let citation = `From "${bs.book_title}" by ${bs.book_author}`;
        if (bs.chapter) citation += ` (${bs.chapter})`;
        return `${citation}:\n${bs.content}`;
      }).join('\n\n')}\n`;
    }
    
    if (ragNegativeExamples.length > 0) {
      ragContext += `\n\nNEGATIVE EXAMPLES - WHAT SERVICE PROVIDER SHOULD NOT DO:\n${ragNegativeExamples.map((ne: any) => {
        return `- [${ne.severity.toUpperCase()}] ${ne.content} (Reason: ${ne.reason})`;
      }).join('\n')}\n`;
    }
    
    if (ragContext) {
      ragContext += `\nNote: As the customer, you should notice if the service provider follows these cultural guidelines and avoids negative behaviors. If they don't, you can express dissatisfaction or confusion.\n`;
    }

    const fullPrompt = `${systemPrompt}

You are the CUSTOMER in this conversation. The other person is a SERVICE PROVIDER who is being trained.

CONVERSATION SO FAR:
${conversationContext || "This is the start of the conversation."}

SERVICE PROVIDER: ${message}
${ragContext}
CUSTOMER (you):`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
    const geminiRequestBody = {
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
    };

    console.log("Calling Gemini API:", {
      url: geminiUrl.replace(geminiApiKey, "***"),
      promptLength: fullPrompt.length,
      maxTokens,
      temperature
    });

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { 
          status: response.status, 
          statusText: response.statusText,
          message: `HTTP ${response.status}: ${response.statusText}`
        };
      }
      console.error("Gemini API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return NextResponse.json(
        { 
          error: "Failed to generate response", 
          details: errorData,
          status: response.status
        },
        { status: 500 }
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("Failed to parse Gemini API response:", parseError);
      const responseText = await response.text().catch(() => "Unable to read response");
      return NextResponse.json(
        { 
          error: "Failed to generate response", 
          details: { 
            message: "Invalid response from AI service",
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            responsePreview: responseText.substring(0, 200)
          }
        },
        { status: 500 }
      );
    }
    
    // Check if response has candidates
    if (!data.candidates || data.candidates.length === 0) {
      console.error("Gemini API returned no candidates:", data);
      return NextResponse.json(
        { 
          error: "Failed to generate response", 
          details: { message: "No candidates in response", response: data }
        },
        { status: 500 }
      );
    }

    // Check for finish reason (safety filters, etc.)
    const finishReason = data.candidates[0]?.finishReason;
    const aiResponse =
      data.candidates[0]?.content?.parts?.[0]?.text || "I don't know what to say.";
    
    // Handle different finish reasons
    if (finishReason && finishReason !== "STOP") {
      if (finishReason === "MAX_TOKENS") {
        // MAX_TOKENS means response was truncated but is still valid
        console.warn("Gemini API response truncated at token limit:", {
          finishReason,
          responseLength: aiResponse.length,
          maxTokens
        });
        // Still return the response, but note it was truncated
        return NextResponse.json({
          response: aiResponse.trim(),
          model: "gemini-2.0-flash",
          truncated: true,
          finishReason: "MAX_TOKENS"
        });
      } else {
        // Other finish reasons (SAFETY, RECITATION, etc.) are actual errors
        console.error("Gemini API finish reason:", finishReason, data);
        return NextResponse.json(
          { 
            error: "Failed to generate response", 
            details: { 
              message: `Generation stopped: ${finishReason}`,
              finishReason,
              response: data
            }
          },
          { status: 500 }
        );
      }
    }

    if (!aiResponse || aiResponse.trim().length === 0) {
      console.error("Gemini API returned empty response:", data);
      return NextResponse.json(
        { 
          error: "Failed to generate response", 
          details: { message: "Empty response from API", response: data }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: aiResponse.trim(),
      model: "gemini-2.0-flash",
    });
  } catch (error) {
    console.error("Training chat error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: {
          message: errorMessage,
          stack: errorStack,
          type: error instanceof Error ? error.constructor.name : typeof error
        },
      },
      { status: 500 }
    );
  }
}


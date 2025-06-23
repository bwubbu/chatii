import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, conversationId } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured in environment variables" },
        { status: 500 }
      );
    }

    // Format messages for Gemini API
    const formattedMessages = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      formattedMessages.push(`System: ${systemPrompt}`);
    }
    
    // Add conversation messages
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        if (typeof msg === 'string') {
          formattedMessages.push(msg);
        } else if (msg.content) {
          formattedMessages.push(msg.content);
        }
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Retry logic
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: formattedMessages.map(text => ({ text }))
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Gemini API Error Response:", errorData);
          throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Extract the response text
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
        
        return NextResponse.json({
          candidates: [{
            content: {
              parts: [{
                text: responseText
              }]
            },
            finishReason: data.candidates?.[0]?.finishReason || "STOP"
          }],
          usageMetadata: data.usageMetadata || {}
        });
        
      } catch (error) {
        lastError = error;
        console.error(`Gemini API attempt ${attempt} failed:`, error);
        
        if (attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { 
        error: error.message || "An error occurred",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 
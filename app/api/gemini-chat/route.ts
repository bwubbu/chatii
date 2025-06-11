import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
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
                parts: messages.map((msg: any) => ({ text: msg }))
              }
            ]
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "API request failed");
        }

        const data = await response.json();
        return NextResponse.json({
          ...data,
        });
      } catch (error) {
        lastError = error;
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
        details: error.stack
      },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * POST /api/generate-conversation-title
 * Generate a concise title for a conversation based on its messages
 * 
 * Body:
 *   {
 *     "messages": [
 *     { role: "user", content: "..." },
 *       { role: "assistant", content: "..." }
 *     ]
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Format conversation for Gemini
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    messages.forEach((msg: { role: string; content: string }) => {
      const normalizedRole = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      contents.push({
        role: normalizedRole,
        parts: [{ text: msg.content }]
      });
    });

    // Add a prompt to generate a title
    contents.push({
      role: 'user',
      parts: [{ 
        text: 'Based on the conversation above, generate a concise title (3-5 words maximum) that summarizes the main topic. Only return the title, nothing else.' 
      }]
    });

    const systemInstruction = {
      parts: [{ 
        text: 'You are a helpful assistant that generates concise, descriptive titles for conversations. Return only the title text, no quotes, no explanations, just the title (3-5 words).' 
      }]
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
    
    const requestBody = {
      contents: contents,
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent titles
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 20, // Short titles only
      }
    };

    // Retry logic
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
          const errorData = await geminiResponse.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Gemini API failed with status ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        const title = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "New Conversation";
        
        // Clean up the title - remove quotes if present, limit length
        let cleanTitle = title.replace(/^["']|["']$/g, '').trim();
        if (cleanTitle.length > 50) {
          cleanTitle = cleanTitle.substring(0, 47) + "...";
        }
        
        return NextResponse.json({ title: cleanTitle || "New Conversation" });
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    throw lastError || new Error("Failed to generate title after retries");
  } catch (error: any) {
    console.error("Error generating conversation title:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate title",
        message: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Interface for the Ollama FastAPI server
interface OllamaRequest {
  message: string;
  conversation_history?: Array<{ role: "user" | "assistant"; content: string }>;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

interface OllamaResponse {
  response: string;
  model: string;
  max_tokens: number;
  temperature: number;
}

// Get Ollama server URL from environment variable (defaults to localhost for local dev)
const OLLAMA_SERVER_URL = process.env.OLLAMA_SERVER_URL || 'http://localhost:8000';

// Function to call Ollama FastAPI server with retries
async function callOllamaServer(data: OllamaRequest, retries = MAX_RETRIES): Promise<OllamaResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Calling Ollama server (attempt ${attempt}/${retries}) at ${OLLAMA_SERVER_URL}`);
      
      const response = await fetch(`${OLLAMA_SERVER_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.detail || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Ollama server response received successfully');
      return result;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        throw error; // Last attempt failed
      }
      
      // Wait before retrying
      await delay(RETRY_DELAY * attempt);
    }
  }
  
  throw new Error('All retry attempts failed');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Parse request body outside try-catch so variables are available in catch block
  const requestBody = await request.json();
  const { message, conversation_history, system_prompt, temperature = 0.7, max_tokens = 200 } = requestBody;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  
  try {

    // Call the Ollama FastAPI server with system prompt and conversation history
    console.log('Sending request to Ollama server:', { 
      message, 
      history_length: conversation_history?.length || 0,
      system_prompt: system_prompt ? 'provided' : 'none', 
      max_tokens, 
      temperature 
    });
    
    const data = await callOllamaServer({
      message,
      conversation_history,
      system_prompt,
      max_tokens,
      temperature
    });

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      response: data.response,
      model: data.model,
      fairness_enabled: true, // Our Ollama server has fairness built-in
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
      server_type: 'ollama-fastapi',
      max_tokens: data.max_tokens,
      temperature: data.temperature
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Ollama API error, falling back to Gemini:', error);
    
    // Fallback to Gemini
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      // Format conversation history for Gemini
      const formattedMessages: string[] = [];
      if (system_prompt) {
        formattedMessages.push(`System: ${system_prompt}`);
      }
      if (conversation_history && conversation_history.length > 0) {
        conversation_history.forEach((msg: { role: string; content: string }) => {
          formattedMessages.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
        });
      }
      formattedMessages.push(`User: ${message}`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: formattedMessages.map(text => ({ text }))
          }],
          generationConfig: {
            temperature: temperature || 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: max_tokens || 200,
          }
        }),
      });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini fallback failed with status ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I couldn't generate a response.";
      
      console.log('✅ Fallback successful: Response generated by Gemini (fallback)');
      
      return NextResponse.json({
        response: responseText,
        model: 'gemini-2.0-flash (fallback)',
        fairness_enabled: false,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        server_type: 'gemini-fallback',
        max_tokens: max_tokens || 200,
        temperature: temperature || 0.7
      });
    } catch (fallbackError) {
      console.error('Gemini fallback also failed:', fallbackError);
      
      // If fallback also fails, return error
      return NextResponse.json(
        { 
          error: 'Failed to generate response from both fairness model and Gemini fallback',
          details: error instanceof Error ? error.message : 'Unknown error',
          fallback_error: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error',
          processing_time_ms: Date.now() - startTime
        },
        { status: 500 }
      );
    }
  }
} 
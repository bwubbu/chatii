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
  
  try {
    const { message, conversation_history, system_prompt, temperature = 0.7, max_tokens = 200 } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

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
    console.error('Ollama API error:', error);
    
    // Check if it's a connection error (Ollama server not running)
    if (error instanceof Error && (
      error.message.includes('fetch') || 
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Failed to fetch')
    )) {
      return NextResponse.json(
        { 
          error: 'Ollama server not available. Please start the server.',
          instructions: 'Run: python ollama_chatbot_server.py --model llama3.1:8b-instruct-q4_0',
          server_status: 'offline',
          processing_time_ms: processingTime
        },
        { status: 503 }
      );
    }
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { 
          error: 'Request timeout. The model is taking too long to respond.',
          processing_time_ms: processingTime
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate response from fairness model',
        details: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: processingTime
      },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Primary LLM Configuration
// Set PRIMARY_LLM=gemini or PRIMARY_LLM=vertex-ai to choose which model to use first
// Default: gemini (simpler setup)
const PRIMARY_LLM = (process.env.PRIMARY_LLM || 'gemini').toLowerCase();

// Vertex AI Configuration
const VERTEX_AI_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const VERTEX_AI_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
// Note: Model name format is "llama-3-8b-instruct" (dash, not dot)
// Available models: llama-3-8b-instruct, llama-3-70b-instruct, llama-3.3-70b-instruct
const VERTEX_AI_MODEL = process.env.VERTEX_AI_MODEL || 'llama-3-8b-instruct'; // Default to Llama 3 8B

// Vertex AI API endpoint for chat models
function getVertexAIEndpoint() {
  if (!VERTEX_AI_PROJECT_ID) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
  }
  // For chat models, use the predict endpoint
  return `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_AI_PROJECT_ID}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${VERTEX_AI_MODEL}:predict`;
}

// Get access token for Vertex AI
async function getAccessToken(): Promise<string> {
  try {
    // Dynamic import to avoid build-time errors if package not installed
    // google-auth-library exports GoogleAuth as a named export, so destructure directly
    const { GoogleAuth } = await import('google-auth-library');
    
    // For serverless environments like Vercel, use service account key from env
    const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    let auth: any;
    if (serviceAccountKey) {
      // Parse service account JSON from environment variable
      try {
        const credentials = JSON.parse(serviceAccountKey);
        auth = new GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
      } catch (parseError) {
        throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON format. Must be valid JSON.');
      }
    } else {
      // Use Application Default Credentials (for local dev or GCP environments)
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to obtain access token');
    }
    
    return accessToken.token;
  } catch (error: any) {
    console.error('Error getting Vertex AI access token:', error);
    
    // Provide helpful error message
    if (error.message?.includes('Cannot find module')) {
      throw new Error(
        'google-auth-library package not installed. Run: npm install google-auth-library'
      );
    }
    
    throw new Error(
      'Vertex AI authentication failed. ' +
      'Set GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable with your service account key JSON, ' +
      'or configure Application Default Credentials. ' +
      `Error: ${error.message || 'Unknown error'}`
    );
  }
}

// Interface for Vertex AI request
// Role can be 'user', 'assistant', or 'model' - we normalize to Vertex AI format ('user' or 'model')
interface VertexAIRequest {
  message: string;
  conversation_history?: Array<{ role: "user" | "assistant" | "model"; content: string }>;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

interface VertexAIResponse {
  response: string;
  model: string;
  max_tokens: number;
  temperature: number;
}

// Function to call Vertex AI with retries
async function callVertexAI(data: VertexAIRequest, retries = MAX_RETRIES): Promise<VertexAIResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Calling Vertex AI (attempt ${attempt}/${retries}) with model ${VERTEX_AI_MODEL}`);
      
      // Get access token
      const accessToken = await getAccessToken();
      
      // Build messages array for Vertex AI
      // Vertex AI uses a specific format for chat models
      const messages: Array<{ role: string; content: string }> = [];
      
      // Add system prompt as first message if provided (some models support system role)
      if (data.system_prompt) {
        messages.push({
          role: 'system',
          content: data.system_prompt
        });
      }
      
      // Add conversation history
      // Normalize roles: accept 'user', 'assistant', or 'model', map to Vertex AI format ('user' or 'model')
      if (data.conversation_history && data.conversation_history.length > 0) {
        data.conversation_history.forEach(msg => {
          // Vertex AI uses 'model' for assistant responses, 'user' for user messages
          // Accept both 'assistant' and 'model' as assistant role, everything else as 'user'
          const normalizedRole = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
          messages.push({
            role: normalizedRole,
            content: msg.content
          });
        });
      }
      
      // Add current user message
      messages.push({
        role: 'user',
        content: data.message
      });
      
      // Vertex AI predict request format for chat models
      // Format: { instances: [{ messages: [...] }], parameters: {...} }
      const requestBody = {
        instances: [{
          messages: messages
        }],
        parameters: {
          temperature: data.temperature || 0.7,
          maxOutputTokens: data.max_tokens || 1024,
          topP: 0.95,
          topK: 40,
        }
      };
      
      const endpoint = getVertexAIEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || JSON.stringify(errorData);
        
        // Provide helpful error messages for common issues
        if (response.status === 404) {
          if (errorMessage.includes('not found')) {
            throw new Error(
              `Model "${VERTEX_AI_MODEL}" not found in region "${VERTEX_AI_LOCATION}". ` +
              `Common issues:\n` +
              `1. Model name format: Use "llama-3-8b-instruct" (dash, not dot like "llama-3.1")\n` +
              `2. Region availability: Try "us-central1" or "us-east1" instead\n` +
              `3. License: Ensure you've accepted the Llama license in Vertex AI Model Garden\n` +
              `Original error: ${errorMessage}`
            );
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${errorMessage}`);
      }

      const result = await response.json();
      
      // Extract response from Vertex AI format
      // Vertex AI returns: { predictions: [{ candidates: [{ content: string }] }] }
      // For chat models, the format might be: { predictions: [{ candidates: [{ content: "..." }] }] }
      const prediction = result.predictions?.[0];
      if (!prediction || !prediction.candidates || prediction.candidates.length === 0) {
        console.error('Vertex AI response structure:', JSON.stringify(result, null, 2));
        throw new Error('No response generated from Vertex AI');
      }
      
      // Handle different response formats with proper null checks
      const candidate = prediction.candidates[0];
      if (!candidate) {
        console.error('Vertex AI candidate is null:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response structure from Vertex AI: candidate is null');
      }
      
      let responseText: string;
      
      // Validate content structure before accessing with comprehensive safety checks
      if (typeof candidate.content === 'string') {
        // Simple string format
        responseText = candidate.content;
      } else if (candidate.content && typeof candidate.content === 'object') {
        // Check for parts array format with comprehensive validation
        if (Array.isArray(candidate.content.parts)) {
          // Verify array has elements before accessing
          if (candidate.content.parts.length === 0) {
            console.error('Vertex AI candidate content.parts is empty array:', JSON.stringify(candidate, null, 2));
            throw new Error('Invalid response structure from Vertex AI: content.parts array is empty');
          }
          
          // Safely access first element with type checking
          const firstPart = candidate.content.parts[0];
          if (!firstPart) {
            console.error('Vertex AI candidate content.parts[0] is null/undefined:', JSON.stringify(candidate, null, 2));
            throw new Error('Invalid response structure from Vertex AI: content.parts[0] is null or undefined');
          }
          
          if (typeof firstPart !== 'object') {
            console.error('Vertex AI candidate content.parts[0] is not an object:', typeof firstPart, JSON.stringify(candidate, null, 2));
            throw new Error(`Invalid response structure from Vertex AI: content.parts[0] is not an object (got ${typeof firstPart})`);
          }
          
          if (typeof firstPart.text !== 'string') {
            console.error('Vertex AI candidate content.parts[0].text is not a string:', typeof firstPart.text, JSON.stringify(candidate, null, 2));
            throw new Error(`Invalid response structure from Vertex AI: content.parts[0].text is not a string (got ${typeof firstPart.text})`);
          }
          
          responseText = firstPart.text;
        } else {
          // Content is an object but not in expected format
          console.error('Vertex AI candidate content has unexpected structure (not a parts array):', JSON.stringify(candidate, null, 2));
          throw new Error('Invalid response structure from Vertex AI: content object does not match expected format (missing or invalid parts array)');
        }
      } else if (!candidate.content) {
        // No content at all
        console.error('Vertex AI candidate has no content:', JSON.stringify(candidate, null, 2));
        throw new Error('Invalid response structure from Vertex AI: candidate has no content');
      } else {
        // Unexpected content type
        console.error('Vertex AI candidate content has unexpected type:', typeof candidate.content, JSON.stringify(candidate, null, 2));
        throw new Error(`Invalid response structure from Vertex AI: content is of unexpected type: ${typeof candidate.content}`);
      }
      
      console.log('Vertex AI response received successfully');
      
      return {
        response: responseText,
        model: VERTEX_AI_MODEL,
        max_tokens: data.max_tokens || 1024,
        temperature: data.temperature || 0.7
      };

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

// Helper function to call Gemini
async function callGemini(
  message: string,
  conversation_history: Array<{ role: string; content: string }> | undefined,
  system_prompt: string | undefined,
  temperature: number,
  max_tokens: number
) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Format conversation history for Gemini API
  // Gemini API expects an array of message objects with roles: "user" or "model"
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  
  // Add conversation history with proper role mapping
  // Gemini uses "user" for user messages and "model" for assistant responses
  // Normalize roles: accept 'user', 'assistant', or 'model', map to Gemini format ('user' or 'model')
  if (conversation_history && conversation_history.length > 0) {
    console.log(`📝 Including ${conversation_history.length} previous messages in conversation history for context`);
    conversation_history.forEach((msg: { role: string; content: string }) => {
      // Gemini uses 'model' for assistant responses, 'user' for user messages
      // Accept both 'assistant' and 'model' as assistant role, everything else as 'user'
      const normalizedRole = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      contents.push({
        role: normalizedRole,
        parts: [{ text: msg.content }]
      });
    });
  } else {
    console.log('📝 No conversation history provided - starting new conversation');
  }
  
  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });
  
  console.log(`📤 Sending to Gemini: ${contents.length} total messages (${conversation_history?.length || 0} history + 1 current)`);

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
  
  const requestBody: any = {
    contents: contents,
    generationConfig: {
      temperature: temperature || 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: max_tokens || 1024,
    }
  };
  
  // Add system instruction if provided
  if (system_prompt) {
    requestBody.systemInstruction = {
      parts: [{ text: system_prompt }]
    };
  }
  
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
  const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, but I couldn't generate a response.";
  
  return {
    response: responseText,
    model: 'gemini-2.0-flash',
    server_type: 'gemini',
    fairness_enabled: system_prompt ? true : false
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Parse request body outside try-catch so variables are available in catch block
  const requestBody = await request.json();
  const { message, conversation_history, system_prompt, temperature = 0.7, max_tokens = 1024 } = requestBody;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }
  
  // Determine which model to try first based on PRIMARY_LLM env variable
  const useVertexAIFirst = PRIMARY_LLM === 'vertex-ai' || PRIMARY_LLM === 'vertex';
  
  try {
    let primaryError: Error | null = null;
    let result: any = null;

    if (useVertexAIFirst) {
      // Try Vertex AI first
      try {
        if (!VERTEX_AI_PROJECT_ID) {
          throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required for Vertex AI');
        }

        console.log('Sending request to Vertex AI (primary):', { 
          message, 
          history_length: conversation_history?.length || 0,
          system_prompt: system_prompt ? 'provided' : 'none', 
          max_tokens, 
          temperature,
          model: VERTEX_AI_MODEL
        });
        
        const data = await callVertexAI({
          message,
          conversation_history,
          system_prompt,
          max_tokens,
          temperature
        });

        result = {
          response: data.response,
          model: data.model,
          server_type: 'vertex-ai',
          fairness_enabled: true,
          max_tokens: data.max_tokens,
          temperature: data.temperature
        };
      } catch (error) {
        primaryError = error instanceof Error ? error : new Error(String(error));
        console.error('Vertex AI (primary) error, falling back to Gemini:', primaryError);
        throw primaryError; // Re-throw to trigger fallback
      }
    } else {
      // Try Gemini first (default)
      try {
        console.log('Sending request to Gemini (primary):', { 
          message, 
          history_length: conversation_history?.length || 0,
          system_prompt: system_prompt ? 'provided' : 'none', 
          max_tokens, 
          temperature
        });

        result = await callGemini(message, conversation_history, system_prompt, temperature, max_tokens);
        result.max_tokens = max_tokens || 1024;
        result.temperature = temperature || 0.7;
      } catch (error) {
        primaryError = error instanceof Error ? error : new Error(String(error));
        console.error('Gemini (primary) error, falling back to Vertex AI:', primaryError);
        throw primaryError; // Re-throw to trigger fallback
      }
    }

    // Success - return primary model result
    // Guard check: ensure result is not null (should never happen with current control flow, but defensive programming)
    if (!result) {
      console.error('Unexpected: result is null after primary model execution');
      throw new Error('Failed to generate response from primary model');
    }
    
    const processingTime = Date.now() - startTime;
    return NextResponse.json({
      ...result,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Fallback to the other model
    try {
      if (useVertexAIFirst) {
        // Fallback to Gemini
        console.log('Falling back to Gemini:', { 
          message, 
          history_length: conversation_history?.length || 0,
          system_prompt: system_prompt ? 'provided' : 'none', 
          max_tokens, 
          temperature
        });

        const result = await callGemini(message, conversation_history, system_prompt, temperature, max_tokens);
        console.log('✅ Fallback successful: Response generated by Gemini (fallback)');
        
        return NextResponse.json({
          ...result,
          model: `${result.model} (fallback)`,
          server_type: 'gemini-fallback',
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          max_tokens: max_tokens || 1024,
          temperature: temperature || 0.7
        });
      } else {
        // Fallback to Vertex AI
        if (!VERTEX_AI_PROJECT_ID) {
          throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required for Vertex AI fallback');
        }

        console.log('Falling back to Vertex AI:', { 
          message, 
          history_length: conversation_history?.length || 0,
          system_prompt: system_prompt ? 'provided' : 'none', 
          max_tokens, 
          temperature,
          model: VERTEX_AI_MODEL
        });
        
        const data = await callVertexAI({
          message,
          conversation_history,
          system_prompt,
          max_tokens,
          temperature
        });

        console.log('✅ Fallback successful: Response generated by Vertex AI (fallback)');
        
        return NextResponse.json({
          response: data.response,
          model: `${data.model} (fallback)`,
          fairness_enabled: true,
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          server_type: 'vertex-ai-fallback',
          max_tokens: data.max_tokens,
          temperature: data.temperature
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      
      // Both models failed
      return NextResponse.json(
        { 
          error: `Failed to generate response from both ${useVertexAIFirst ? 'Vertex AI' : 'Gemini'} (primary) and ${useVertexAIFirst ? 'Gemini' : 'Vertex AI'} (fallback)`,
          primary_error: error instanceof Error ? error.message : 'Unknown error',
          fallback_error: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error',
          processing_time_ms: Date.now() - startTime,
          primary_llm: PRIMARY_LLM
        },
        { status: 500 }
      );
    }
  }
} 
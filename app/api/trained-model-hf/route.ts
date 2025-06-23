import { NextRequest } from 'next/server';

// Replace with your actual Hugging Face model name
const HF_API_URL = "https://api-inference.huggingface.co/models/your-username/mistral-7b-fairness";
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN; // Add this to your .env.local

export async function POST(request: NextRequest) {
  try {
    const { message, persona, temperature = 0.7, max_length = 50 } = await request.json();

    if (!message) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!HF_TOKEN) {
      return Response.json(
        { 
          error: 'Hugging Face token not configured. Add HUGGINGFACE_TOKEN to .env.local',
          setup_instructions: {
            step1: "Go to https://huggingface.co/settings/tokens",
            step2: "Create a token with 'Read' permissions",
            step3: "Add HUGGINGFACE_TOKEN=your_token to .env.local",
            step4: "Update HF_API_URL in this file with your model name"
          }
        },
        { status: 500 }
      );
    }

    // Check if model URL is configured
    if (HF_API_URL.includes('your-username')) {
      return Response.json(
        { 
          error: 'Model URL not configured. Please update HF_API_URL in this file with your actual Hugging Face model name.',
          current_url: HF_API_URL,
          example: "https://api-inference.huggingface.co/models/john/mistral-7b-fairness"
        },
        { status: 503 }
      );
    }

    // Format prompt for Mistral with full persona context
    let formatted_prompt;
    if (persona?.trim()) {
      formatted_prompt = `[INST]${persona}

User message: ${message}[/INST]`;
    } else {
      formatted_prompt = `[INST]Respond politely and fairly to: ${message}[/INST]`;
    }

    console.log('Calling Hugging Face API:', HF_API_URL);

    // Call Hugging Face Inference API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: formatted_prompt,
        parameters: {
          max_new_tokens: max_length,
          temperature: temperature,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
          stop: ["Human:", "Assistant:", "\n\n"]
        }
      }),
      signal: AbortSignal.timeout(60000) // 60 second timeout for model loading
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Hugging Face API error:', data.error);
      
      // Handle model loading
      if (data.error.includes('loading')) {
        return Response.json({
          error: 'Model is loading, please try again in a moment',
          details: data.error,
          retry_after: 30,
          suggestion: 'The model needs to "warm up" on first use. This usually takes 1-2 minutes.'
        }, { status: 503 });
      }
      
      // Handle rate limits
      if (data.error.includes('rate limit')) {
        return Response.json({
          error: 'Rate limit exceeded',
          details: data.error,
          suggestion: 'Wait a moment or consider upgrading to Hugging Face Pro'
        }, { status: 429 });
      }
      
      return Response.json(
        { error: `Hugging Face API error: ${data.error}` },
        { status: 502 }
      );
    }

    // Extract generated text
    let generated_text = "Sorry, I couldn't generate a response.";
    if (Array.isArray(data) && data.length > 0) {
      generated_text = data[0]?.generated_text || generated_text;
    }
    
    return Response.json({
      response: generated_text.trim(),
      model: HF_API_URL.split('/').pop() || "mistral-7b-fairness",
      fairness_enabled: true,
      processing_time_ms: 0,
      gpu_used: true,
      cloud_inference: true,
      provider: "huggingface"
    });

  } catch (error: any) {
    console.error('Error calling Hugging Face API:', error);
    
    if (error.name === 'AbortError') {
      return Response.json(
        { 
          error: 'Request timed out - model may be loading',
          suggestion: 'Try again in a moment. First requests can take longer.'
        },
        { status: 504 }
      );
    }

    return Response.json(
      { 
        error: 'Failed to get response from model',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    message: "Trained Model Hugging Face API",
    model: HF_API_URL.split('/').pop() || "mistral-7b-fairness",
    provider: "huggingface",
    status: HF_API_URL.includes('your-username') ? 'not_configured' : 'configured',
    api_url: HF_API_URL,
    setup_instructions: {
      step1: "Upload your model to Hugging Face Hub using the notebook",
      step2: "Update HF_API_URL in this file with your model name",
      step3: "Add HUGGINGFACE_TOKEN to .env.local",
      step4: "Test the API"
    },
    endpoints: {
      chat: "POST /api/trained-model-hf",
      health: "GET /api/trained-model-hf"
    }
  });
} 
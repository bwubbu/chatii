import { NextRequest } from 'next/server';

// Update this URL with your ngrok URL from Google Colab
// Example: "https://abc123.ngrok-free.app"
const CLOUD_MODEL_URL = process.env.CLOUD_MODEL_URL || "https://your-ngrok-url.ngrok-free.app";

export async function POST(request: NextRequest) {
  try {
    const { message, persona, temperature = 0.7, max_length = 50 } = await request.json();

    if (!message) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if cloud model URL is configured
    if (!CLOUD_MODEL_URL || CLOUD_MODEL_URL.includes('your-ngrok-url')) {
      return Response.json(
        { 
          error: 'Cloud model URL not configured. Please:\n1. Run the Google Colab notebook\n2. Copy the ngrok URL\n3. Update CLOUD_MODEL_URL in this file or add it to .env.local',
          fallback_used: false,
          instructions: {
            step1: "Open the Google Colab notebook: Mistral_Inference_Server_Colab.ipynb",
            step2: "Run all cells and copy the ngrok URL",
            step3: "Update CLOUD_MODEL_URL in this file or set CLOUD_MODEL_URL in .env.local"
          }
        },
        { status: 503 }
      );
    }

    console.log(`Calling cloud model at: ${CLOUD_MODEL_URL}/chat`);

    // Call the cloud-based inference server
    const response = await fetch(`${CLOUD_MODEL_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        persona: persona || "",
        temperature,
        max_length
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloud model error:', response.status, errorText);
      
      return Response.json(
        { 
          error: `Cloud model returned ${response.status}`,
          details: errorText,
          troubleshooting: {
            "503": "Model server not running - check Google Colab session",
            "404": "Wrong URL - verify ngrok tunnel is active",
            "500": "Model loading error - check Colab logs"
          }
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    return Response.json({
      response: data.response,
      model: data.model || "mistral-7b-fairness-cloud",
      fairness_enabled: data.fairness_enabled || true,
      processing_time_ms: data.processing_time_ms || 0,
      gpu_used: data.gpu_used || false,
      cloud_inference: true,
      provider: "google-colab-ngrok"
    });

  } catch (error: any) {
    console.error('Error calling cloud model:', error);
    
    // Handle different types of errors
    if (error.name === 'AbortError') {
      return Response.json(
        { 
          error: 'Cloud model request timed out (30s)',
          suggestion: 'The model might be loading. Try again in a moment.'
        },
        { status: 504 }
      );
    }
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
      return Response.json(
        { 
          error: 'Cannot connect to cloud model',
          suggestion: 'Make sure the Google Colab notebook is running and ngrok tunnel is active'
        },
        { status: 503 }
      );
    }

    return Response.json(
      { 
        error: 'Failed to get response from cloud model',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    message: "Trained Model Cloud API",
    model: "mistral-7b-fairness",
    cloud_inference: true,
    provider: "google-colab-ngrok",
    status: CLOUD_MODEL_URL.includes('your-ngrok-url') ? 'not_configured' : 'configured',
    setup_instructions: {
      step1: "Open fine_tuning/notebooks/Mistral_Inference_Server_Colab.ipynb in Google Colab",
      step2: "Upload your trained model to Google Drive",
      step3: "Run all cells in the notebook",
      step4: "Copy the ngrok URL from the output",
      step5: "Update CLOUD_MODEL_URL in this file or set environment variable"
    },
    current_url: CLOUD_MODEL_URL,
    endpoints: {
      chat: "POST /api/trained-model-cloud",
      health: "GET /api/trained-model-cloud"
    }
  });
} 
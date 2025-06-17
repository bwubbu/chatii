import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Interface for the Python inference service
interface InferenceRequest {
  messages: string[];
  max_length?: number;
  temperature?: number;
  top_p?: number;
}

interface InferenceResponse {
  response: string;
  error?: string;
}

// Function to call Python inference script
async function callPythonInference(data: InferenceRequest): Promise<InferenceResponse> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'fine_tuning', 'scripts', 'inference.py');
    const python = spawn('python', [pythonScript]);
    
    let output = '';
    let error = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${error}`));
      } else {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse JSON response: ${output}`));
        }
      }
    });
    
    // Send input data to Python script
    python.stdin.write(JSON.stringify(data));
    python.stdin.end();
    
    // Set timeout
    setTimeout(() => {
      python.kill();
      reject(new Error('Inference timeout'));
    }, 30000); // 30 second timeout
  });
}

export async function POST(request: NextRequest) {
  try {
    const { message, persona, temperature = 0.7, max_length = 80 } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Call your fairness-trained FastAPI model server
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        persona: persona || '', // Pass the persona context from your admin panel
        temperature,
        max_length
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Model server error: ${response.status} - ${errorData.detail || 'Unknown error'}`);
    }

    const data = await response.json();

    return NextResponse.json({
      response: data.response,
      model: data.model,
      fairness_enabled: data.fairness_enabled,
      processing_time_ms: data.processing_time_ms,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Trained model API error:', error);
    
    // Check if it's a connection error (model server not running)
    if (error instanceof Error && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Model server not available. Please start the FastAPI server.',
          instructions: 'Run: python fairness_model_server_fastapi.py'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate response from trained model' },
      { status: 500 }
    );
  }
} 
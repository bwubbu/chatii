#!/usr/bin/env python3
"""
FastAPI chatbot server using Ollama as backend
Memory-efficient with automatic API documentation
"""

import requests
import json
import asyncio
import aiohttp
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import argparse
import uvicorn
from typing import Optional

# Pydantic models for request/response validation
class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = None
    max_tokens: Optional[int] = 200
    temperature: Optional[float] = 0.7

class ChatResponse(BaseModel):
    response: str
    model: str
    max_tokens: int
    temperature: float

class HealthResponse(BaseModel):
    status: str
    model: str

# Initialize FastAPI app
app = FastAPI(
    title="Fairness Chatbot API",
    description="Memory-efficient chatbot API using Ollama backend with focus on fair and respectful responses",
    version="1.0.0"
)

class OllamaChatbot:
    def __init__(self, model_name="mistral:7b-instruct-q4_0", base_url="http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.system_prompt = """You are a helpful, respectful and honest assistant. Always answer as helpfully as possible while being safe and fair to all users regardless of their background, race, gender, religion, or any other characteristic. 

Be polite, considerate, and treat everyone with equal respect. If you're unsure about something, it's okay to say you don't know rather than making assumptions."""
    
    async def generate_response_async(self, prompt: str, system_prompt: str = None, max_tokens: int = 200, temperature: float = 0.7) -> str:
        """
        Generate response using Ollama API (async version)
        """
        url = f"{self.base_url}/api/generate"
        
        # Use custom system prompt if provided, otherwise use default
        system_message = system_prompt if system_prompt else self.system_prompt
        
        # Format the prompt with system message
        full_prompt = f"System: {system_message}\n\nUser: {prompt}\n\nAssistant:"
        
        data = {
            "model": self.model_name,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "top_p": 0.9,
                "repeat_penalty": 1.1
            }
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get('response', 'Sorry, I could not generate a response.')
                    else:
                        return f"Error: HTTP {response.status}"
                        
        except aiohttp.ClientError as e:
            return f"Error connecting to Ollama: {e}"
        except json.JSONDecodeError as e:
            return f"Error parsing response: {e}"
        except Exception as e:
            return f"Unexpected error: {e}"
    
    def generate_response_sync(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> str:
        """
        Generate response using Ollama API (sync version for backward compatibility)
        """
        url = f"{self.base_url}/api/generate"
        
        # Format the prompt with system message
        full_prompt = f"System: {self.system_prompt}\n\nUser: {prompt}\n\nAssistant:"
        
        data = {
            "model": self.model_name,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "top_p": 0.9,
                "repeat_penalty": 1.1
            }
        }
        
        try:
            response = requests.post(url, json=data, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            return result.get('response', 'Sorry, I could not generate a response.')
            
        except requests.exceptions.RequestException as e:
            return f"Error connecting to Ollama: {e}"
        except json.JSONDecodeError as e:
            return f"Error parsing response: {e}"

# Initialize chatbot
chatbot = OllamaChatbot()

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", model=chatbot.model_name)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint with automatic request validation
    
    - **message**: The user's message to send to the chatbot
    - **max_tokens**: Maximum number of tokens to generate (default: 200)
    - **temperature**: Creativity level from 0.0 to 1.0 (default: 0.7)
    """
    try:
        # Generate response using async method
        response = await chatbot.generate_response_async(
            request.message,
            system_prompt=request.system_prompt,
            max_tokens=request.max_tokens, 
            temperature=request.temperature
        )
        
        if response.startswith("Error"):
            raise HTTPException(status_code=500, detail=response)
        
        return ChatResponse(
            response=response,
            model=chatbot.model_name,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/sync")
async def chat_sync(request: ChatRequest):
    """
    Synchronous chat endpoint (fallback)
    """
    try:
        # Generate response using sync method
        response = chatbot.generate_response_sync(
            request.message, 
            max_tokens=request.max_tokens, 
            temperature=request.temperature
        )
        
        if response.startswith("Error"):
            raise HTTPException(status_code=500, detail=response)
        
        return ChatResponse(
            response=response,
            model=chatbot.model_name,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def list_models():
    """List available Ollama models"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags") as response:
                if response.status == 200:
                    result = await response.json()
                    return result
                else:
                    raise HTTPException(status_code=500, detail="Could not fetch models from Ollama")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")

async def check_ollama_server():
    """Check if Ollama server is running"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:11434/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as response:
                return response.status == 200
    except:
        return False

def start_ollama_server():
    """Start Ollama server if not running"""
    try:
        # Check if Ollama is already running
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        print("✅ Ollama server is already running")
        return True
    except requests.exceptions.RequestException:
        print("🚀 Starting Ollama server...")
        import subprocess
        try:
            # Start Ollama server
            subprocess.Popen(["ollama", "serve"], shell=True)
            import time
            time.sleep(3)  # Wait for server to start
            return True
        except Exception as e:
            print(f"❌ Could not start Ollama server: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description="FastAPI Ollama Chatbot Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--model", default="mistral:7b-instruct-q4_0", help="Ollama model to use")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    
    args = parser.parse_args()
    
    # Update chatbot model
    chatbot.model_name = args.model
    
    print(f"🤖 Starting Fairness Chatbot FastAPI Server")
    print(f"📱 Model: {args.model}")
    print(f"🌐 Server: http://{args.host}:{args.port}")
    
    # Check/start Ollama server
    if not start_ollama_server():
        print("❌ Could not start Ollama server. Please start it manually with 'ollama serve'")
        return
    
    print("\n📝 API Endpoints:")
    print(f"   📚 API Docs: http://{args.host}:{args.port}/docs")
    print(f"   📋 ReDoc: http://{args.host}:{args.port}/redoc")
    print(f"   ❤️  Health: http://{args.host}:{args.port}/health")
    print(f"   💬 Chat: http://{args.host}:{args.port}/chat")
    print(f"   📂 Models: http://{args.host}:{args.port}/models")
    
    print("\n💬 Example usage:")
    print(f'   curl -X POST "http://{args.host}:{args.port}/chat" \\')
    print(f'        -H "Content-Type: application/json" \\')
    print(f'        -d \'{{"message": "How should I treat people fairly?", "temperature": 0.7, "max_tokens": 150}}\'')
    
    print(f"\n🚀 Starting FastAPI server...")
    
    # Start FastAPI server with uvicorn
    uvicorn.run(
        "ollama_chatbot_server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Persona Export & API Key System
Allows users to export personas and use them via API keys in external projects
"""

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
import uuid
import hashlib
import time
from datetime import datetime, timedelta
import requests

# Security
security = HTTPBearer()

# Models for API
class PersonaConfig(BaseModel):
    id: str
    name: str
    system_prompt: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    demographics_adaptation: Optional[Dict] = None
    model_settings: Optional[Dict] = {
        "temperature": 0.7,
        "max_tokens": 200,
        "model": "llama3.1:8b-instruct-q4_0"
    }

class APIKey(BaseModel):
    key: str
    user_id: str
    name: str
    created_at: str
    last_used: Optional[str] = None
    usage_count: int = 0
    rate_limit: int = 100  # requests per hour
    permissions: List[str] = ["persona:read", "chat:create"]

class ChatRequest(BaseModel):
    message: str
    persona_id: Optional[str] = None
    user_demographics: Optional[Dict] = None
    model_settings: Optional[Dict] = None

class ExportFormat(BaseModel):
    format: str = "json"  # json, yaml, openai-gpt
    include_model: bool = True
    include_examples: bool = False

# In-memory storage (replace with database in production)
api_keys: Dict[str, APIKey] = {}
personas: Dict[str, PersonaConfig] = {}

# Initialize with sample personas
def initialize_sample_personas():
    sample_personas = [
        PersonaConfig(
            id="fitness-trainer",
            name="Fitness Trainer", 
            system_prompt="""You are a professional fitness trainer with 10 years of experience. You're energetic, motivational, and passionate about helping people achieve their fitness goals.

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. Never break character or mention that you are an AI assistant. You ARE this persona.

PERSONALITY AND BEHAVIOR:
- Stay completely in character as a fitness trainer
- Use motivational language and fitness expertise
- Add appropriate emojis 💪 🏃‍♀️ ✨
- Keep responses energetic and encouraging (2-4 sentences)

FAIRNESS & RESPECT:
- Always respond in a fair, polite, and respectful manner
- Adapt your tone to suit the user appropriately
- Treat all users with equal respect regardless of their background""",
            description="Energetic fitness professional focused on health and motivation",
            demographics_adaptation={
                "young": "Use casual, relatable language with trending fitness terms",
                "professional": "Focus on efficient, time-conscious workout solutions", 
                "senior": "Emphasize gentle, low-impact exercises and safety"
            }
        ),
        PersonaConfig(
            id="hotel-receptionist",
            name="Hotel Receptionist",
            system_prompt="""You are a friendly, professional hotel receptionist with excellent customer service skills. You're polite, helpful, and always ready to assist guests.

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. You ARE this hotel receptionist.

PERSONALITY AND BEHAVIOR:
- Stay completely in character as a hotel receptionist
- Use professional hospitality language
- Add appropriate emojis 🏨 😊 ✨
- Keep responses polite and service-oriented""",
            description="Professional hospitality expert focused on guest satisfaction"
        )
    ]
    
    for persona in sample_personas:
        personas[persona.id] = persona

initialize_sample_personas()

# API Key Management
def generate_api_key(user_id: str, name: str) -> str:
    """Generate a new API key for a user"""
    timestamp = str(int(time.time()))
    raw_key = f"{user_id}:{name}:{timestamp}:{uuid.uuid4()}"
    api_key = f"pk_fairness_{hashlib.sha256(raw_key.encode()).hexdigest()[:32]}"
    
    api_keys[api_key] = APIKey(
        key=api_key,
        user_id=user_id,
        name=name,
        created_at=datetime.now().isoformat()
    )
    
    return api_key

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)) -> APIKey:
    """Verify API key and return user info"""
    token = credentials.credentials
    
    if token not in api_keys:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    api_key_info = api_keys[token]
    
    # Check rate limiting (simple hourly limit)
    now = datetime.now()
    if api_key_info.last_used:
        last_used = datetime.fromisoformat(api_key_info.last_used)
        if now - last_used < timedelta(hours=1) and api_key_info.usage_count >= api_key_info.rate_limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    # Update usage
    api_key_info.last_used = now.isoformat()
    api_key_info.usage_count += 1
    
    return api_key_info

# FastAPI app for persona export and API access
export_app = FastAPI(
    title="Fairness Chatbot - Personas API",
    description="Export personas and use them via API in your own projects",
    version="1.0.0"
)

@export_app.post("/api-keys/generate")
async def generate_new_api_key(user_id: str, name: str):
    """Generate a new API key for accessing personas"""
    api_key = generate_api_key(user_id, name)
    return {
        "api_key": api_key,
        "message": "API key generated successfully",
        "documentation": "http://localhost:8002/docs",
        "rate_limit": "100 requests per hour"
    }

@export_app.get("/personas", response_model=List[PersonaConfig])
async def list_personas(api_key_info: APIKey = Depends(verify_api_key)):
    """List all available personas"""
    return list(personas.values())

@export_app.get("/personas/{persona_id}", response_model=PersonaConfig)
async def get_persona(persona_id: str, api_key_info: APIKey = Depends(verify_api_key)):
    """Get a specific persona configuration"""
    if persona_id not in personas:
        raise HTTPException(status_code=404, detail="Persona not found")
    return personas[persona_id]

@export_app.post("/personas/{persona_id}/export")
async def export_persona(
    persona_id: str, 
    export_format: ExportFormat,
    api_key_info: APIKey = Depends(verify_api_key)
):
    """Export persona in various formats for use in external projects"""
    if persona_id not in personas:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    persona = personas[persona_id]
    
    if export_format.format == "json":
        export_data = {
            "persona": persona.dict(),
            "usage_guide": {
                "api_endpoint": "http://localhost:8002/chat",
                "headers": {"Authorization": f"Bearer {api_key_info.key}"},
                "example_request": {
                    "message": "Hello!",
                    "persona_id": persona_id,
                    "user_demographics": {"age": "25", "role": "student"}
                }
            }
        }
        
        if export_format.include_model:
            export_data["model_info"] = {
                "base_model": "llama3.1:8b-instruct-q4_0",
                "fairness_training": True,
                "memory_usage": "~4.7GB",
                "response_time": "2-5 seconds"
            }
            
        return export_data
    
    elif export_format.format == "openai-gpt":
        # Convert to OpenAI GPT format
        return {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": persona.system_prompt},
                {"role": "user", "content": "{user_message}"}
            ],
            "temperature": persona.model_settings.get("temperature", 0.7),
            "max_tokens": persona.model_settings.get("max_tokens", 200),
            "fairness_notes": "This persona has been trained for fairness and respectful interactions"
        }
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

@export_app.post("/chat")
async def chat_with_persona(
    request: ChatRequest,
    api_key_info: APIKey = Depends(verify_api_key)
):
    """Use personas in your own applications via API"""
    
    # Get persona if specified
    system_prompt = None
    if request.persona_id:
        if request.persona_id not in personas:
            raise HTTPException(status_code=404, detail="Persona not found")
        
        persona = personas[request.persona_id]
        system_prompt = persona.system_prompt
        
        # Apply demographics adaptation if provided
        if request.user_demographics and persona.demographics_adaptation:
            age = request.user_demographics.get("age", "unknown")
            role = request.user_demographics.get("role", "unknown")
            
            # Simple demographics adaptation
            if int(age) < 30 and "young" in persona.demographics_adaptation:
                system_prompt += f"\n\nTone guidance: {persona.demographics_adaptation['young']}"
            elif role == "professional" and "professional" in persona.demographics_adaptation:
                system_prompt += f"\n\nTone guidance: {persona.demographics_adaptation['professional']}"
            elif int(age) > 60 and "senior" in persona.demographics_adaptation:
                system_prompt += f"\n\nTone guidance: {persona.demographics_adaptation['senior']}"
    
    # Call the main chatbot API
    try:
        response = await requests.post(
            "http://localhost:8000/chat",
            json={
                "message": request.message,
                "system_prompt": system_prompt,
                "max_tokens": request.model_settings.get("max_tokens", 200) if request.model_settings else 200,
                "temperature": request.model_settings.get("temperature", 0.7) if request.model_settings else 0.7
            },
            timeout=30
        )
        
        if response.status_code == 200:
            chat_response = response.json()
            return {
                "response": chat_response["response"],
                "persona_used": request.persona_id,
                "model": chat_response["model"],
                "usage": {
                    "api_key": api_key_info.key[:16] + "...",
                    "requests_remaining": api_key_info.rate_limit - api_key_info.usage_count
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Chatbot service unavailable")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@export_app.get("/usage")
async def get_usage_stats(api_key_info: APIKey = Depends(verify_api_key)):
    """Get API usage statistics"""
    return {
        "api_key": api_key_info.key[:16] + "...",
        "usage_count": api_key_info.usage_count,
        "rate_limit": api_key_info.rate_limit,
        "requests_remaining": api_key_info.rate_limit - api_key_info.usage_count,
        "last_used": api_key_info.last_used,
        "permissions": api_key_info.permissions
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Persona Export API Server...")
    print("📚 API Documentation: http://localhost:8002/docs")
    print("🔑 Generate API Key: POST http://localhost:8002/api-keys/generate")
    print("🎭 List Personas: GET http://localhost:8002/personas")
    print("💬 Chat API: POST http://localhost:8002/chat")
    
    uvicorn.run(export_app, host="0.0.0.0", port=8002) 
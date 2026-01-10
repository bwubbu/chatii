from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import uvicorn
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fairness ChatBot API",
    description="AI model trained for fairness and politeness",
    version="1.0.0"
)

# Enable CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    persona: Optional[str] = ""
    temperature: Optional[float] = 0.7
    max_length: Optional[int] = 50  # Reduced from 80 to 50 for faster responses

class ChatResponse(BaseModel):
    response: str
    model: str
    fairness_enabled: bool
    processing_time_ms: int

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    gpu_available: bool

class FairnessChatBot:
    def __init__(self, model_path: str):
        """Load the fairness-trained Mistral model"""
        logger.info(f"Loading fairness Mistral model from {model_path}...")
        
        try:
            # Load Mistral model with PEFT/LoRA adapters
            from peft import PeftModel
            
            # Load base model and adapter
            base_model_name = "mistralai/Mistral-7B-Instruct-v0.2"
            
            logger.info(f"Loading base model: {base_model_name}")
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float32,  # Use FP32 for CPU compatibility
                low_cpu_mem_usage=True,
                device_map="cpu",  # Force CPU for VM compatibility
                load_in_8bit=False,
                load_in_4bit=False
            )
            
            logger.info(f"Loading LoRA adapters from: {model_path}")
            self.model = PeftModel.from_pretrained(base_model, model_path)
            self.tokenizer = AutoTokenizer.from_pretrained(base_model_name)
            
            # Ensure tokenizer has pad token
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Optimize for inference
            self.model.eval()  # Set to evaluation mode
            
            self.device = "cpu"  # Force CPU for VM compatibility
            logger.info(f"✅ Fairness Mistral model loaded successfully on {self.device}!")
            
            # Cache for tokenizer to avoid repeated encoding
            self._tokenizer_cache = {}
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise e
        
    def generate_response(self, prompt: str, persona_context: str = "", max_length: int = 50, temperature: float = 0.7) -> str:
        """Generate a fair and polite response with optional persona"""
        # Format for Mistral model using [INST] format
        if persona_context.strip():
            # Extract just the persona role, not the full system prompt
            persona_lines = persona_context.split('\n')
            persona_role = "Hotel Receptionist"  # Default
            for line in persona_lines:
                if "You are" in line or "Act as" in line:
                    persona_role = line.replace("You are", "").replace("Act as", "").strip()
                    break
            
            formatted_prompt = f"[INST]As a {persona_role}, respond politely and fairly to: {prompt}[/INST]"
        else:
            formatted_prompt = f"[INST]Respond politely and fairly to: {prompt}[/INST]"
        
        # Use cached tokenization if possible
        cache_key = formatted_prompt
        if cache_key in self._tokenizer_cache:
            inputs = self._tokenizer_cache[cache_key]
        else:
            inputs = self.tokenizer.encode(formatted_prompt, return_tensors="pt")
            self._tokenizer_cache[cache_key] = inputs
            # Limit cache size
            if len(self._tokenizer_cache) > 100:
                self._tokenizer_cache.clear()
        
        with torch.no_grad():
            outputs = self.model.generate(
                inputs,
                max_length=len(inputs[0]) + max_length,  # Reduced max length
                temperature=temperature,
                do_sample=True,
                top_p=0.85,  # Slightly higher for faster sampling
                top_k=30,    # Reduced for faster sampling
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                repetition_penalty=1.15,  # Slightly reduced
                no_repeat_ngram_size=2,   # Reduced from 3 to 2
                early_stopping=True,
                length_penalty=1.0,       # Neutral length penalty
                num_beams=1,              # Use greedy search (faster than beam search)
                bad_words_ids=self._get_conversation_stop_tokens()
            )
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = response.replace(formatted_prompt, "").strip()
        
        # Clean up response
        if response.startswith("Assistant:"):
            response = response[10:].strip()
        
        # Remove any remaining artifacts and self-conversation
        response = response.split("\nHuman:")[0].strip()
        response = response.split("\nContext:")[0].strip()
        response = response.split("Human :")[0].strip()  # Handle spacing variations
        response = response.split("Human(")[0].strip()   # Handle parentheses
        response = response.split("Assistant:")[0].strip()  # Remove if it appears mid-text
        response = response.split("Customer:")[0].strip()  # Stop at customer responses
        response = response.split("Customer(")[0].strip()  # Handle customer with parentheses
        response = response.split("Guest:")[0].strip()     # Stop at guest responses
        response = response.split("User:")[0].strip()      # Stop at user responses
        
        # Remove common conversation artifacts
        response = response.split("What can I")[0].strip()  # Stop before asking questions back
        response = response.split("How can I")[0].strip()   # Stop before offering more help
        response = response.split("Is there anything")[0].strip()  # Stop before follow-up questions
        response = response.split("Would you like")[0].strip()  # Stop before follow-up offers
        
        # Clean up any trailing punctuation artifacts
        response = response.rstrip('.:!?')
        
        # If response ends with incomplete sentence, clean it up
        response = self._clean_incomplete_sentence(response)
        
        # Trim to reasonable length and end at sentence boundary
        response = self._trim_to_sentence(response, max_words=25)  # Even shorter
        
        return response
    
    def _clean_incomplete_sentence(self, text: str) -> str:
        """Remove incomplete sentences that might lead to self-conversation"""
        sentences = text.split('. ')
        if len(sentences) <= 1:
            return text
            
        # Keep only complete sentences
        complete_sentences = []
        for sentence in sentences[:-1]:  # Exclude the last potentially incomplete one
            if len(sentence.strip()) > 5:  # Only keep substantial sentences
                complete_sentences.append(sentence.strip())
        
        # Add the last sentence only if it looks complete
        last_sentence = sentences[-1].strip()
        if (last_sentence.endswith(('.', '!', '?')) and 
            len(last_sentence) > 5 and
            not any(word in last_sentence.lower() for word in ['customer', 'guest', 'human', 'user'])):
            complete_sentences.append(last_sentence)
        
        return '. '.join(complete_sentences) + ('.' if complete_sentences and not complete_sentences[-1].endswith(('.', '!', '?')) else '')
    
    def _trim_to_sentence(self, text: str, max_words: int = 50) -> str:
        """Trim response to end at a natural sentence boundary"""
        words = text.split()
        
        # If already short enough, return as is
        if len(words) <= max_words:
            return text
        
        # Find the last sentence ending within word limit
        truncated = " ".join(words[:max_words])
        
        # Look for sentence endings
        for ending in ['. ', '! ', '? ']:
            last_sentence = truncated.rfind(ending)
            if last_sentence > len(truncated) * 0.6:  # At least 60% of the text
                return truncated[:last_sentence + 1].strip()
        
        # If no good sentence ending found, just truncate and add period
        return truncated.rstrip('.,!?') + '.'

    def _get_conversation_stop_tokens(self):
        """Get token IDs for words that should stop generation to prevent self-conversation"""
        stop_words = [
            "Human:", "Human ", "Customer:", "Customer ", "Guest:", "Guest ", 
            "User:", "User ", "Assistant:", "\nHuman", "\nCustomer", "\nGuest", "\nUser"
        ]
        
        stop_token_ids = []
        for word in stop_words:
            try:
                tokens = self.tokenizer.encode(word, add_special_tokens=False)
                if tokens:
                    stop_token_ids.extend(tokens)
            except:
                pass  # Skip if encoding fails
        
        return [stop_token_ids] if stop_token_ids else None

# Initialize the chatbot
MODEL_PATH = "./mistral_7b_fairness_model"  # Updated to use trained Mistral model
chatbot = None

try:
    chatbot = FairnessChatBot(MODEL_PATH)
    logger.info("🎉 Chatbot initialized successfully!")
except Exception as e:
    logger.error(f"❌ Failed to initialize chatbot: {e}")
    logger.error("💡 Make sure the model files are in the correct location:")
    logger.error(f"   Expected path: {MODEL_PATH}")
    logger.error("   Required files: pytorch_model.bin, config.json, tokenizer files")
    chatbot = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Generate a fair and polite chat response"""
    if chatbot is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        import time
        start_time = time.time()
        
        # Generate fair and polite response
        response = chatbot.generate_response(
            prompt=request.message,
            persona_context=request.persona,
            max_length=request.max_length,
            temperature=request.temperature
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return ChatResponse(
            response=response,
            model="fairness-trained-mistral-7b",
            fairness_enabled=True,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Chat generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate response: {str(e)}")

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if chatbot is not None else "model_not_loaded",
        model_loaded=chatbot is not None,
        gpu_available=torch.cuda.is_available()
    )

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Fairness ChatBot API",
        "docs": "/docs",
        "health": "/health",
        "chat_endpoint": "/chat"
    }

if __name__ == "__main__":
    logger.info("🚀 Starting Fairness ChatBot Server with FastAPI...")
    logger.info("📡 Server will run on http://localhost:8000")
    logger.info("📚 API Documentation: http://localhost:8000/docs")
    logger.info("🎯 Chat Endpoint: POST /chat")
    logger.info("💡 Your Next.js app can now use the fairness-trained model!")
    
    uvicorn.run(
        "fairness_model_server_fastapi:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 
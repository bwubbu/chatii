#!/usr/bin/env python3
"""
Inference script for trained Unsloth model
This script loads the trained model and provides predictions
"""

import os
import sys
import json
import torch
from pathlib import Path
from typing import List, Dict, Any

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from unsloth import FastLanguageModel
    UNSLOTH_AVAILABLE = True
except ImportError:
    UNSLOTH_AVAILABLE = False
    from transformers import AutoModelForCausalLM, AutoTokenizer

def load_model(model_path: str):
    """Load the trained model"""
    if not os.path.exists(model_path):
        # Try different possible paths
        possible_paths = [
            "mistral_7b_fairness_model",
            "fine_tuning/outputs/merged", 
            "fine_tuning/outputs",
            "fine_tuning/outputs/gguf"
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                break
        else:
            raise FileNotFoundError(f"No trained model found. Please train a model first.")
    
    if UNSLOTH_AVAILABLE:
        # Use Unsloth for faster inference
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=model_path,
            max_seq_length=2048,
            load_in_4bit=True,
        )
        FastLanguageModel.for_inference(model)  # Enable native 2x faster inference
    else:
        # Fallback to standard transformers with PEFT support
        from peft import PeftModel
        from transformers import AutoModelForCausalLM, AutoTokenizer
        
        try:
            # Try loading as PEFT model first (for LoRA adapters)
            base_model_name = "mistralai/Mistral-7B-Instruct-v0.2"
            model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float16,
                device_map="auto",
                load_in_4bit=True
            )
            model = PeftModel.from_pretrained(model, model_path)
            tokenizer = AutoTokenizer.from_pretrained(base_model_name)
        except:
            # Fallback to direct loading
            model = AutoModelForCausalLM.from_pretrained(
                model_path,
                torch_dtype=torch.float16,
                device_map="auto",
                load_in_4bit=True
            )
            tokenizer = AutoTokenizer.from_pretrained(model_path)
    
    return model, tokenizer

def format_chat_prompt(messages: List[str]) -> str:
    """Format messages into a Mistral chat prompt"""
    if len(messages) == 0:
        return ""
    
    # Take the last message as the user input
    user_message = messages[-1]
    
    # Format as Mistral chat prompt - using [INST] format
    prompt = f"[INST]{user_message}[/INST]"
    
    return prompt

def generate_response(
    model, 
    tokenizer, 
    messages: List[str], 
    max_length: int = 512,
    temperature: float = 0.7,
    top_p: float = 0.9
) -> str:
    """Generate response from the model"""
    try:
        prompt = format_chat_prompt(messages)
        
        # Tokenize input
        inputs = tokenizer(prompt, return_tensors="pt")
        
        # Move to GPU if available
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # Decode response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the assistant's response (remove the input prompt)
        response = response[len(prompt):].strip()
        
        # Clean up Mistral-specific artifacts
        if response.startswith("[/INST]"):
            response = response[7:].strip()
        
        # Remove end tokens if present
        response = response.replace("</s>", "").strip()
        
        return response
        
    except Exception as e:
        raise Exception(f"Error generating response: {str(e)}")

def main():
    """Main inference function"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        messages = data.get("messages", [])
        max_length = data.get("max_length", 512)
        temperature = data.get("temperature", 0.7)
        top_p = data.get("top_p", 0.9)
        
        if not messages:
            result = {"error": "No messages provided"}
        else:
            # Load model (cache it globally in production)
            model_path = os.path.join(os.path.dirname(__file__), "..", "..", "mistral_7b_fairness_model")
            model, tokenizer = load_model(model_path)
            
            # Generate response
            response = generate_response(
                model, tokenizer, messages, max_length, temperature, top_p
            )
            
            result = {"response": response}
        
        # Output result as JSON
        print(json.dumps(result))
        
    except FileNotFoundError as e:
        result = {
            "error": "Model not found. Please train your model first.",
            "details": str(e)
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "error": f"Inference failed: {str(e)}",
            "details": str(e)
        }
        print(json.dumps(result))

if __name__ == "__main__":
    main() 
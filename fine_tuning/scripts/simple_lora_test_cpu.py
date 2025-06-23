#!/usr/bin/env python3
"""
Simple CPU-only LoRA inference script to test the model
Usage: python simple_lora_test_cpu.py
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os

def test_lora_model():
    """Test the LoRA model with CPU-only inference"""
    
    adapter_path = "Lora Model"
    base_model = "mistralai/Mistral-7B-Instruct-v0.3"
    
    if not os.path.exists(adapter_path):
        print(f"Error: Adapter path {adapter_path} does not exist")
        return
    
    print("🦙 Loading base model (CPU mode)...")
    
    # Load base model on CPU only to avoid CUDA issues
    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        torch_dtype=torch.float32,  # Use float32 for CPU
        device_map="cpu",  # Force CPU
        trust_remote_code=True
    )
    
    print("🔧 Loading LoRA adapters...")
    
    # Load LoRA adapters
    model = PeftModel.from_pretrained(model, adapter_path, device_map="cpu")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    print("✅ Model loaded successfully!")
    
    # Test prompts
    test_prompts = [
        "Hello, how can you help me today?",
        "What is the weather like?",
        "Can you assist me with a booking?",
        "I need help with my reservation"
    ]
    
    for prompt in test_prompts:
        print(f"\n🤖 Testing prompt: {prompt}")
        
        # Format for Mistral
        formatted_prompt = f"[INST]{prompt}[/INST]"
        
        # Tokenize
        inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True)
        
        # Generate (CPU mode)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=100,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # Decode response
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Extract only the assistant's response
        assistant_response = response[len(formatted_prompt):].strip()
        
        print(f"💬 Response: {assistant_response}")
        print("-" * 50)

if __name__ == "__main__":
    test_lora_model() 
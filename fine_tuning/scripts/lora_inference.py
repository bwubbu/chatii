#!/usr/bin/env python3
"""
Simple LoRA inference script for local testing
Usage: python lora_inference.py --adapter_path /path/to/lora/adapters
"""

import argparse
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import json
import os

def load_lora_model(base_model_name, adapter_path):
    """Load base model and LoRA adapters"""
    print(f"Loading base model: {base_model_name}")
    
    # Load base model without 4-bit quantization to avoid complications
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Load LoRA adapters
    print(f"Loading LoRA adapters from: {adapter_path}")
    model = PeftModel.from_pretrained(model, adapter_path)
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    return model, tokenizer

def generate_response(model, tokenizer, prompt, max_length=512, temperature=0.7):
    """Generate response using the LoRA model"""
    
    # Format prompt for Mistral
    formatted_prompt = f"[INST]{prompt}[/INST]"
    
    # Tokenize
    inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True)
    
    # Move to GPU if available
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
    
    # Generate
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_length,
            temperature=temperature,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
    
    # Decode response
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract only the assistant's response
    response = response[len(formatted_prompt):].strip()
    
    return response

def main():
    parser = argparse.ArgumentParser(description="Run LoRA adapters locally")
    parser.add_argument("--adapter_path", required=True, help="Path to LoRA adapter files")
    parser.add_argument("--base_model", default="mistralai/Mistral-7B-Instruct-v0.3", help="Base model name")
    parser.add_argument("--interactive", action="store_true", help="Run in interactive mode")
    parser.add_argument("--prompt", type=str, help="Single prompt to test")
    
    args = parser.parse_args()
    
    # Check if adapter path exists
    if not os.path.exists(args.adapter_path):
        print(f"Error: Adapter path {args.adapter_path} does not exist")
        return
    
    print("🦙 Loading LoRA model...")
    model, tokenizer = load_lora_model(args.base_model, args.adapter_path)
    print("✅ Model loaded successfully!")
    
    if args.interactive:
        print("\n💬 Interactive mode - type 'quit' to exit")
        while True:
            try:
                prompt = input("\nYou: ").strip()
                if prompt.lower() in ['quit', 'exit', 'q']:
                    break
                
                if prompt:
                    response = generate_response(model, tokenizer, prompt)
                    print(f"Assistant: {response}")
                    
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
                
    elif args.prompt:
        print(f"\n🤖 Generating response for: {args.prompt}")
        response = generate_response(model, tokenizer, args.prompt)
        print(f"Response: {response}")
        
    else:
        print("Please use --interactive for chat mode or --prompt 'your question' for single response")

if __name__ == "__main__":
    main() 
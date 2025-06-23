#!/usr/bin/env python3
"""
Simple test script for LoRA model using local tokenizer
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os

def test_lora_model():
    # Paths
    adapter_path = "../../Lora Model"
    
    # Try multiple base models (from most to least preferred)
    base_models = [
        "mistralai/Mistral-7B-Instruct-v0.2",  # Non-gated alternative
        "mistralai/Mistral-7B-v0.1",           # Non-gated base model  
        "unsloth/mistral-7b-instruct-v0.2-bnb-4bit",  # Unsloth version
        "mistralai/Mistral-7B-Instruct-v0.3"   # Original (gated)
    ]
    
    model = None
    tokenizer = None
    
    for base_model_name in base_models:
        print(f"🦙 Trying to load base model: {base_model_name}")
        try:
            # Load base model
            model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float16,
                device_map="auto",
                load_in_4bit=True,
                trust_remote_code=True
            )
            print(f"✅ Base model loaded: {base_model_name}")
            
            # Load tokenizer from local files first, fallback to HF
            print("📝 Loading tokenizer...")
            try:
                tokenizer = AutoTokenizer.from_pretrained(adapter_path)
                print("✅ Using local tokenizer files")
            except:
                tokenizer = AutoTokenizer.from_pretrained(base_model_name)
                print("✅ Using HuggingFace tokenizer")
            
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            break  # Success, exit the loop
            
        except Exception as e:
            print(f"❌ Failed to load {base_model_name}: {str(e)}")
            continue
    
    if model is None:
        print("❌ Could not load any base model. Please check your internet connection or request access to gated models.")
        return
    
    try:
        # Load LoRA adapters
        print("🔧 Loading LoRA adapters...")
        model = PeftModel.from_pretrained(model, adapter_path)
        print("✅ LoRA adapters loaded!")
        
        # Test prompt
        test_prompt = "Hello, how are you?"
        formatted_prompt = f"[INST]{test_prompt}[/INST]"
        
        print(f"\n🤖 Testing with prompt: {test_prompt}")
        
        # Tokenize
        inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True)
        
        # Move to GPU if available
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
            print("🚀 Using GPU")
        else:
            print("💻 Using CPU")
        
        # Generate
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
        response = response[len(formatted_prompt):].strip()
        
        print(f"\n🎉 Response: {response}")
        print("\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during inference: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_lora_model() 
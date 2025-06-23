#!/usr/bin/env python3
"""
Interactive chat with your LoRA model
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

def load_lora_model():
    """Load the LoRA model once"""
    adapter_path = "../../Lora Model"
    base_model_name = "mistralai/Mistral-7B-Instruct-v0.3"
    
    print("🦙 Loading base model...")
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.float16,
        device_map="cpu",
        trust_remote_code=True,
    )
    
    print("📝 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(adapter_path)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    print("🔧 Loading LoRA adapters...")
    model = PeftModel.from_pretrained(model, adapter_path)
    
    print("✅ Model loaded and ready!")
    return model, tokenizer

def chat_with_model(model, tokenizer):
    """Interactive chat loop"""
    print("\n💬 Chat with your LoRA model! Type 'quit' to exit.")
    print("   (Note: CPU inference may take 10-30 seconds per response)")
    
    while True:
        try:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
                
            if not user_input:
                continue
            
            # Format for Mistral
            formatted_prompt = f"[INST]{user_input}[/INST]"
            
            print("🤖 Thinking...")
            
            # Tokenize
            inputs = tokenizer(formatted_prompt, return_tensors="pt", truncation=True)
            
            # Generate
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=150,
                    temperature=0.7,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                )
            
            # Decode response
            response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            response = response[len(formatted_prompt):].strip()
            
            print(f"Assistant: {response}")
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")

def main():
    try:
        model, tokenizer = load_lora_model()
        chat_with_model(model, tokenizer)
    except Exception as e:
        print(f"❌ Failed to load model: {str(e)}")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
CPU-optimized inference script with minimal RAM usage
Uses quantization and memory mapping to reduce memory footprint
"""

import torch
import gc
import psutil
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel
import argparse
import os

def get_memory_usage():
    """Get current memory usage in GB"""
    process = psutil.Process(os.getpid())
    memory_gb = process.memory_info().rss / 1024 / 1024 / 1024
    return memory_gb

def load_model_minimal_memory(base_model_name, adapter_path=None):
    """
    Load model with minimal memory usage
    """
    print(f"Initial memory usage: {get_memory_usage():.2f} GB")
    
    # Configure 4-bit quantization for minimal memory
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    
    print("Loading base model with 4-bit quantization...")
    
    # Load model with aggressive memory optimization
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        quantization_config=quantization_config,
        device_map="cpu",  # Force CPU to avoid GPU memory issues
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
        trust_remote_code=True,
        use_cache=False,  # Disable cache to save memory
    )
    
    print(f"Memory after base model load: {get_memory_usage():.2f} GB")
    
    # Load LoRA adapters if provided
    if adapter_path and os.path.exists(adapter_path):
        print(f"Loading LoRA adapters from: {adapter_path}")
        model = PeftModel.from_pretrained(
            model, 
            adapter_path,
            torch_dtype=torch.float16,
        )
        print(f"Memory after LoRA load: {get_memory_usage():.2f} GB")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    return model, tokenizer

def generate_response_memory_efficient(model, tokenizer, prompt, max_new_tokens=128, temperature=0.7):
    """
    Generate response with memory-efficient settings
    """
    print(f"Memory before generation: {get_memory_usage():.2f} GB")
    
    # Format prompt for Mistral
    formatted_prompt = f"[INST] {prompt} [/INST]"
    
    # Tokenize with truncation to save memory
    inputs = tokenizer(
        formatted_prompt, 
        return_tensors="pt", 
        truncation=True,
        max_length=1024,  # Limit input length 
        padding=False
    )
    
    # Generate with memory-efficient settings
    with torch.no_grad():
        # Clear cache before generation
        if hasattr(torch.cuda, 'empty_cache'):
            torch.cuda.empty_cache()
        gc.collect()
        
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            use_cache=False,  # Disable KV cache to save memory
            batch_size=1,  # Process one at a time
        )
    
    # Decode response
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract only the assistant's response
    response = response[len(formatted_prompt):].strip()
    
    print(f"Memory after generation: {get_memory_usage():.2f} GB")
    
    # Clean up
    del outputs
    gc.collect()
    
    return response

def interactive_chat(model, tokenizer):
    """
    Interactive chat with memory cleanup between responses
    """
    print("\n💬 Interactive Chat - Type 'quit' to exit")
    print("Memory optimization is enabled for minimal RAM usage")
    
    while True:
        try:
            prompt = input("\nYou: ").strip()
            if prompt.lower() in ['quit', 'exit', 'q']:
                break
            
            if prompt:
                response = generate_response_memory_efficient(
                    model, tokenizer, prompt,
                    max_new_tokens=100,  # Shorter responses to save memory
                    temperature=0.7
                )
                print(f"Assistant: {response}")
                
                # Force garbage collection after each response
                gc.collect()
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break

def main():
    parser = argparse.ArgumentParser(description="CPU-optimized LoRA inference")
    parser.add_argument("--adapter_path", default="Lora Model", help="Path to LoRA adapters")
    parser.add_argument("--base_model", default="unsloth/mistral-7b-instruct-v0.3-bnb-4bit", help="Base model name")
    parser.add_argument("--interactive", action="store_true", help="Run in interactive mode")
    parser.add_argument("--prompt", type=str, help="Single prompt to test")
    parser.add_argument("--max_tokens", type=int, default=128, help="Maximum tokens to generate")
    
    args = parser.parse_args()
    
    print("🔧 Starting CPU-optimized inference...")
    print(f"Available RAM: {psutil.virtual_memory().total / 1024 / 1024 / 1024:.2f} GB")
    
    try:
        # Load model with minimal memory
        model, tokenizer = load_model_minimal_memory(args.base_model, args.adapter_path)
        
        if args.interactive:
            interactive_chat(model, tokenizer)
        elif args.prompt:
            print(f"\n🤖 Generating response for: {args.prompt}")
            response = generate_response_memory_efficient(
                model, tokenizer, args.prompt, args.max_tokens
            )
            print(f"Response: {response}")
        else:
            print("Please use --interactive for chat mode or --prompt 'your question' for single response")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nTroubleshooting tips:")
        print("1. Try using a smaller base model")
        print("2. Reduce --max_tokens")
        print("3. Close other applications to free RAM")
        print("4. Use the Ollama option instead for better memory management")

if __name__ == "__main__":
    main() 
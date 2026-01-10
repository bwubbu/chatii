#!/usr/bin/env python3
"""
Convert LoRA adapters to Ollama-compatible GGUF format
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import os
import subprocess
import argparse

def merge_lora_adapters(base_model_name, adapter_path, output_path):
    """
    Merge LoRA adapters with base model and save in HuggingFace format
    """
    print(f"Loading base model: {base_model_name}")
    
    # Load base model with lower precision to save memory
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.float16,  # Use half precision
        device_map="auto",
        low_cpu_mem_usage=True,     # Enable memory-efficient loading
        trust_remote_code=True
    )
    
    print(f"Loading LoRA adapters from: {adapter_path}")
    
    # Load LoRA model
    model = PeftModel.from_pretrained(base_model, adapter_path)
    
    print("Merging LoRA adapters with base model...")
    
    # Merge adapters
    merged_model = model.merge_and_unload()
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    
    print(f"Saving merged model to: {output_path}")
    
    # Save merged model
    merged_model.save_pretrained(output_path, safe_serialization=True)
    tokenizer.save_pretrained(output_path)
    
    return output_path

def convert_to_gguf(hf_model_path, gguf_output_path, quantization="q4_k_m"):
    """
    Convert HuggingFace model to GGUF format using llama.cpp
    """
    print(f"Converting to GGUF format with {quantization} quantization...")
    
    # Path to llama.cpp (we'll need to download it)
    convert_script = "llama.cpp/convert_hf_to_gguf.py"
    quantize_script = "llama.cpp/llama-quantize"
    
    if not os.path.exists("llama.cpp"):
        print("Downloading llama.cpp...")
        subprocess.run([
            "git", "clone", "https://github.com/ggerganov/llama.cpp.git"
        ], check=True)
        
        print("Building llama.cpp...")
        subprocess.run([
            "make", "-C", "llama.cpp"
        ], check=True)
    
    # Convert to GGUF FP16 first
    temp_gguf = hf_model_path.replace("/", "_") + "_temp.gguf"
    
    subprocess.run([
        "python", convert_script,
        hf_model_path,
        "--outfile", temp_gguf,
        "--outtype", "f16"
    ], check=True)
    
    # Quantize to reduce size
    subprocess.run([
        quantize_script,
        temp_gguf,
        gguf_output_path,
        quantization
    ], check=True)
    
    # Clean up temp file
    if os.path.exists(temp_gguf):
        os.remove(temp_gguf)
    
    return gguf_output_path

def create_ollama_modelfile(gguf_path, modelfile_path, model_name="fairness-chatbot"):
    """
    Create Ollama Modelfile
    """
    modelfile_content = f"""FROM {gguf_path}

TEMPLATE \"\"\"{{{{ if .System }}}}<|im_start|>system
{{{{ .System }}}}<|im_end|>
{{{{ end }}}}{{{{ if .Prompt }}}}<|im_start|>user
{{{{ .Prompt }}}}<|im_end|>
<|im_start|>assistant
{{{{ end }}}}{{{{ .Response }}}}<|im_end|>
\"\"\"

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

SYSTEM \"\"\"You are a helpful, respectful and honest assistant. Always answer as helpfully as possible while being safe and fair to all users regardless of their background.\"\"\"
"""
    
    with open(modelfile_path, 'w') as f:
        f.write(modelfile_content)
    
    print(f"Created Modelfile: {modelfile_path}")
    return modelfile_path

def main():
    parser = argparse.ArgumentParser(description="Convert LoRA to Ollama")
    parser.add_argument("--adapter_path", default="Lora Model", help="Path to LoRA adapters")
    parser.add_argument("--base_model", default="unsloth/mistral-7b-instruct-v0.3-bnb-4bit", help="Base model name")
    parser.add_argument("--output_name", default="fairness-chatbot", help="Output model name")
    parser.add_argument("--quantization", default="q4_k_m", help="Quantization type")
    
    args = parser.parse_args()
    
    # Create output directories
    merged_path = f"merged_{args.output_name}"
    gguf_path = f"{args.output_name}.gguf"
    modelfile_path = f"{args.output_name}.Modelfile"
    
    try:
        # Step 1: Merge LoRA with base model
        print("=== Step 1: Merging LoRA adapters ===")
        merge_lora_adapters(args.base_model, args.adapter_path, merged_path)
        
        # Step 2: Convert to GGUF
        print("=== Step 2: Converting to GGUF ===")
        convert_to_gguf(merged_path, gguf_path, args.quantization)
        
        # Step 3: Create Ollama Modelfile
        print("=== Step 3: Creating Ollama Modelfile ===")
        create_ollama_modelfile(gguf_path, modelfile_path, args.output_name)
        
        print(f"\n✅ Conversion complete!")
        print(f"Next steps:")
        print(f"1. ollama create {args.output_name} -f {modelfile_path}")
        print(f"2. ollama run {args.output_name}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Try using a smaller quantization like q2_k or q3_k_s if you're still running out of memory")

if __name__ == "__main__":
    main() 
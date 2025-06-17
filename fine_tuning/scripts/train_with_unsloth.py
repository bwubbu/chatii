#!/usr/bin/env python3
"""
Training script using Unsloth for efficient fine-tuning
This script integrates with the existing configuration system
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from configs.training_config import TrainingConfig
from unsloth import FastLanguageModel, FastModelConfig
import torch
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset
import wandb

def load_training_data(train_file: str):
    """Load training data from JSONL file"""
    if not os.path.exists(train_file):
        print(f"Training file {train_file} not found. Creating sample data...")
        # Create sample training data
        sample_data = [
            {
                "instruction": "What is artificial intelligence?",
                "input": "",
                "output": "Artificial intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks that typically require human intelligence, such as learning, reasoning, problem-solving, and decision-making."
            },
            {
                "instruction": "Explain machine learning in simple terms",
                "input": "",
                "output": "Machine learning is a subset of AI where computers learn to make predictions or decisions by finding patterns in data, without being explicitly programmed for every specific task."
            }
        ]
        
        os.makedirs(os.path.dirname(train_file), exist_ok=True)
        with open(train_file, 'w') as f:
            for item in sample_data:
                f.write(json.dumps(item) + '\n')
        print(f"Sample training data created at {train_file}")
    
    return load_dataset("json", data_files={"train": train_file}, split="train")

def format_prompts(examples):
    """Format prompts for training"""
    texts = []
    for instruction, input_text, output in zip(examples["instruction"], examples["input"], examples["output"]):
        # Create a chat-like format
        if input_text.strip():
            text = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{instruction}\n\n{input_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{output}<|eot_id|><|end_of_text|>"
        else:
            text = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{instruction}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{output}<|eot_id|><|end_of_text|>"
        texts.append(text)
    return {"text": texts}

def main():
    # Load configuration
    config = TrainingConfig()
    
    # Initialize wandb for experiment tracking
    wandb.init(
        project="chatbot-unsloth-training",
        config=config.__dict__
    )
    
    print("🦥 Starting Unsloth training...")
    print(f"Model: {config.model_name}")
    print(f"Output directory: {config.output_dir}")
    
    # Create output directory
    os.makedirs(config.output_dir, exist_ok=True)
    
    # Load model and tokenizer with Unsloth
    print("Loading model with Unsloth...")
    
    # Update model name to use Unsloth's optimized models
    unsloth_models = {
        "tiiuae/falcon-7b": "unsloth/falcon-7b-bnb-4bit",
        "meta-llama/Llama-2-7b-hf": "unsloth/llama-2-7b-bnb-4bit",
        "meta-llama/Llama-2-7b-chat-hf": "unsloth/llama-2-7b-chat-bnb-4bit",
        "mistralai/Mistral-7B-v0.1": "unsloth/mistral-7b-bnb-4bit",
        "mistralai/Mistral-7B-Instruct-v0.2": "unsloth/mistral-7b-instruct-v0.2-bnb-4bit"
    }
    
    model_name = unsloth_models.get(config.model_name, "unsloth/llama-2-7b-chat-bnb-4bit")
    print(f"Using optimized model: {model_name}")
    
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=config.max_seq_length,
        load_in_4bit=config.load_in_4bit,
        load_in_8bit=config.load_in_8bit,
        # dtype=None,  # None for auto detection
    )
    
    # Add LoRA adapters
    print("Adding LoRA adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=config.lora_r,
        target_modules=config.target_modules,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        bias="none",
        use_gradient_checkpointing="unsloth",  # Use Unsloth's optimized checkpointing
        random_state=3407,
        max_seq_length=config.max_seq_length,
        use_rslora=False,
        loftq_config=None,
    )
    
    # Load and format training data
    print("Loading training data...")
    dataset = load_training_data(config.train_file)
    dataset = dataset.map(format_prompts, batched=True)
    
    print(f"Training dataset size: {len(dataset)}")
    
    # Create trainer
    print("Setting up trainer...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        dataset_text_field="text",
        tokenizer=tokenizer,
        args=SFTConfig(
            per_device_train_batch_size=config.per_device_train_batch_size,
            gradient_accumulation_steps=config.gradient_accumulation_steps,
            warmup_ratio=config.warmup_ratio,
            num_train_epochs=config.num_train_epochs,
            learning_rate=config.learning_rate,
            max_grad_norm=config.max_grad_norm,
            logging_steps=10,
            output_dir=config.output_dir,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="linear",
            seed=3407,
            max_seq_length=config.max_seq_length,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            report_to="wandb",
            run_name="unsloth-chatbot-training",
        ),
    )
    
    # Start training
    print("🚀 Starting training...")
    trainer.train()
    
    # Save the model
    print("Saving model...")
    model.save_pretrained(config.output_dir)
    tokenizer.save_pretrained(config.output_dir)
    
    # Save model in different formats
    print("Saving model in GGUF format for deployment...")
    model.save_pretrained_gguf(
        f"{config.output_dir}/gguf",
        tokenizer,
        quantization_method="q4_k_m"  # Good balance of size and quality
    )
    
    # Save merged model for inference
    print("Saving merged model...")
    model.save_pretrained_merged(
        f"{config.output_dir}/merged",
        tokenizer,
        save_method="merged_16bit"
    )
    
    print("✅ Training completed!")
    print(f"Models saved in: {config.output_dir}")
    print(f"GGUF model: {config.output_dir}/gguf")
    print(f"Merged model: {config.output_dir}/merged")
    
    wandb.finish()

if __name__ == "__main__":
    main() 
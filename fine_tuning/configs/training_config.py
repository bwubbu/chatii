from dataclasses import dataclass
from typing import Optional

@dataclass
class TrainingConfig:
    # Model configuration
    model_name: str = "mistralai/Mistral-7B-Instruct-v0.2"  # Base model to fine-tune
    output_dir: str = "mistral_7b_fairness_model"
    
    # Training hyperparameters
    learning_rate: float = 2e-5
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 1  # Reduced batch size for 8GB GPU
    gradient_accumulation_steps: int = 16  # Increased to compensate for smaller batch size
    max_grad_norm: float = 0.3
    warmup_ratio: float = 0.03
    
    # LoRA configuration
    use_lora: bool = True
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: list = None
    
    # Quantization configuration
    load_in_8bit: bool = False  # Disabled 8-bit quantization
    load_in_4bit: bool = True   # Enabled 4-bit quantization
    
    # Data configuration
    train_file: str = "fine_tuning/data/fairness_politeness_training_v2_conversations.jsonl"
    validation_file: Optional[str] = None
    max_seq_length: int = 1024  # Reduced sequence length to save memory
    
    def __post_init__(self):
        if self.target_modules is None:
            # Mistral specific target modules
            self.target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"] 
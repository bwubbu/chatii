from dataclasses import dataclass
from typing import Optional

@dataclass
class TrainingConfig:
    # Model configuration
    model_name: str = "tiiuae/falcon-7b"  # Base model to fine-tune
    output_dir: str = "fine_tuning/outputs"
    
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
    train_file: str = "fine_tuning/data/train.jsonl"
    validation_file: Optional[str] = None
    max_seq_length: int = 1024  # Reduced sequence length to save memory
    
    def __post_init__(self):
        if self.target_modules is None:
            # Falcon specific target modules
            self.target_modules = ["query_key_value", "dense", "dense_h_to_4h", "dense_4h_to_h"] 
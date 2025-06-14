import json
import logging
from pathlib import Path
from typing import List, Dict, Any
import random

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def format_interaction(input_text: str, output_text: str) -> str:
    """Format an interaction into a single text string."""
    return f"Input: {input_text}\nOutput: {output_text}"

def split_and_prepare_data(input_file: str, train_file: str, val_file: str, val_ratio: float = 0.2, seed: int = 42):
    """Split the data into train/validation and save as jsonl files."""
    logger.info(f"Reading data from {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = [json.loads(line) for line in f]
    
    # Prepare formatted data
    formatted_data = []
    for item in data:
        if "input" in item and "output" in item:
            text = format_interaction(item["input"], item["output"])
            formatted_data.append({"text": text})
    
    # Shuffle and split
    random.seed(seed)
    random.shuffle(formatted_data)
    val_size = int(len(formatted_data) * val_ratio)
    val_data = formatted_data[:val_size]
    train_data = formatted_data[val_size:]
    
    # Write train and validation files
    for file_path, subset in zip([train_file, val_file], [train_data, val_data]):
        output_path = Path(file_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Writing {len(subset)} examples to {file_path}")
        with open(file_path, 'w', encoding='utf-8') as f:
            for item in subset:
                f.write(json.dumps(item) + '\n')
    logger.info("Data splitting and preparation completed")

if __name__ == "__main__":
    input_file = "fine_tuning/data/case_study_data.jsonl"
    train_file = "fine_tuning/data/train.jsonl"
    val_file = "fine_tuning/data/validation.jsonl"
    split_and_prepare_data(input_file, train_file, val_file) 
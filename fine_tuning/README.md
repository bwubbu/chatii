# 🚀 Fairness & Politeness Model Training

This directory contains everything needed to train a fair and polite conversational AI model using **Mistral-7B** and other state-of-the-art models.

## 🎯 Training Philosophy

This fine-tuning approach creates a **foundational layer of ethical behavior** that persists across all personas:

- **Fairness First**: The model learns to treat all users equally regardless of background, status, or characteristics
- **Consistent Politeness**: Respectful communication is maintained across all interactions
- **Persona Flexibility**: Admins can create any persona while ethical values remain intact
- **Safety by Design**: Prevents creation of harmful or discriminatory personas

## 🤖 **Recommended Models**

### **1. Mistral-7B-Instruct-v0.2** ⭐ **RECOMMENDED**
- **Size**: 7B parameters
- **Strengths**: Excellent instruction following, efficient, good balance
- **Training Time**: ~15-20 minutes on T4 GPU
- **Memory**: Works with Google Colab free tier
- **Use Case**: Best overall choice for fairness training

### **2. Llama-3.1-8B-Instruct**
- **Size**: 8B parameters  
- **Strengths**: Latest Meta model, strong performance
- **Training Time**: ~20-25 minutes on T4 GPU
- **Memory**: Requires careful memory management

### **3. Qwen2.5-7B-Instruct**
- **Size**: 7B parameters
- **Strengths**: Strong multilingual capabilities
- **Training Time**: ~15-20 minutes on T4 GPU
- **Use Case**: Good for international applications

### **4. Phi-3.5-mini-instruct**
- **Size**: 3.8B parameters
- **Strengths**: Very efficient, fast inference
- **Training Time**: ~10-15 minutes on T4 GPU
- **Use Case**: Resource-constrained environments

## 🚀 Quick Start

### **Option A: Mistral-7B Training (Recommended)**

1. **Open Google Colab**: [https://colab.research.google.com](https://colab.research.google.com)
2. **Upload Notebook**: `notebooks/Mistral_7B_Fairness_Training.ipynb`
3. **Set Runtime**: Runtime → Change runtime type → T4 GPU
4. **Upload Data**: Upload `fairness_politeness_training_v2.jsonl` when prompted
5. **Run All Cells**: Runtime → Run all
6. **Download Model**: The trained model will be packaged as `mistral_fairness_model.zip`

### **Training Features:**
- ✅ **LoRA Fine-tuning**: Memory-efficient training
- ✅ **4-bit Quantization**: Fits on T4 GPU (15GB VRAM)
- ✅ **Automatic Testing**: Built-in model evaluation
- ✅ **Easy Download**: One-click model packaging

### **Expected Results:**
- **Training Time**: 15-20 minutes
- **Model Size**: ~2GB (LoRA adapters)
- **Performance**: Significantly better than GPT-2 baseline
- **Quality**: Professional, fair, and polite responses

## 📁 Directory Structure

```
fine_tuning/
├── configs/
│   └── training_config.py      # Training configuration
├── data/
│   ├── train.jsonl                           # Original academic training data
│   └── fairness_politeness_training.jsonl   # Fairness & politeness training data (active)
├── notebooks/
│   └── ChatBot_Training_with_Unsloth.ipynb  # Colab notebook
├── scripts/
│   ├── train_with_unsloth.py  # Training script
│   └── inference.py           # Inference script
└── outputs/                   # Trained models will be saved here
    ├── merged/                # Production-ready model
    └── gguf/                  # GGUF format for local inference
```

## 📊 Training Data

### Current Datasets:
- **`fairness_politeness_training.jsonl`** - Original 42 examples (instruction format)
- **`fairness_politeness_training_v2.jsonl`** - Improved 56 examples (conversation format) ⭐ **ACTIVE**

### Data Quality:
- ✅ **56 high-quality examples** based on real human interactions
- ✅ **Comprehensive coverage**: bias, discrimination, conflict resolution, cultural sensitivity
- ✅ **Clean format**: Single-turn User/Assistant conversations
- ✅ **Authentic scenarios**: Extracted from actual chatbot interactions

### Current Training Focus: Fairness & Politeness

The model is configured to train on `fairness_politeness_training_v2.jsonl` which contains **56 carefully crafted examples** teaching the model to:

- Handle rude or demanding users with patience and respect
- Avoid discrimination and treat all users equally
- Respond to controversial topics with balanced, fair perspectives
- Maintain politeness even when setting boundaries
- Show empathy and cultural sensitivity
- De-escalate conflicts constructively

### Data Format
Training data uses the instruction-following format:

```json
{"instruction": "A user is being rude and demanding. How should I respond?", "input": "", "output": "I understand you may be frustrated, and I'm here to help. Let me do my best to assist you in a way that works for both of us..."}
```

### Example Training Scenarios
```jsonl
{"instruction": "Someone asks me to choose between two political parties", "input": "", "output": "I respect that people have different political views and preferences. Rather than choosing sides, I'd be happy to help you find factual information..."}
{"instruction": "A user makes a discriminatory comment about a group of people", "input": "", "output": "I believe in treating everyone with respect and dignity. I'm not able to agree with or support discriminatory statements..."}
{"instruction": "Someone is asking for help but seems upset", "input": "", "output": "I can sense this might be a difficult situation for you, and I want to help. Please know that I'm here to support you..."}
```

## ⚙️ Configuration

Edit `configs/training_config.py` to customize training:

```python
# Model selection
model_name = "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"

# Training parameters
learning_rate = 2e-5
num_train_epochs = 3
per_device_train_batch_size = 1

# LoRA settings
lora_r = 16
lora_alpha = 32
```

## 🖥️ Using Your Trained Model

### Method 1: Automatic Integration
After training, your model is automatically available at:
- API endpoint: `/api/trained-model`
- Local path: `fine_tuning/outputs/merged/`

### Method 2: Manual Setup
1. Copy your trained model to `fine_tuning/outputs/merged/`
2. Test with: `python scripts/inference.py`
3. Your Next.js app will automatically use the trained model

## 📱 Frontend Integration

Update your chat component to use the trained model:

```typescript
// In your chat component
const response = await fetch('/api/trained-model', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [userMessage],
    temperature: 0.7,
    max_length: 512
  })
});
```

## 🔧 Troubleshooting

### Common Issues

**"CUDA out of memory"**
- Reduce `per_device_train_batch_size` to 1
- Increase `gradient_accumulation_steps`
- Use a smaller model like `unsloth/Phi-3.5-mini-instruct`

**"Model not found"**
- Check that training completed successfully
- Verify model path in `fine_tuning/outputs/merged/`
- Run inference script directly to test

**"Python script not found"**
- Make sure you're in the project root directory
- Check Python path in API route
- Verify script permissions: `chmod +x scripts/inference.py`

### Performance Tips

**For Better Training:**
- Use more training data (100+ examples recommended)
- Train for more epochs (3-5 epochs)
- Use consistent formatting in your data
- Balance your dataset (similar number of examples per topic)

**For Faster Inference:**
- Use GGUF format models
- Enable model caching
- Consider using Ollama for local deployment

## 📋 Model Formats

After training, you'll have models in multiple formats:

- **LoRA adapters** (`outputs/`): Lightweight, can be merged later
- **Merged model** (`outputs/merged/`): Ready for production use
- **GGUF format** (`outputs/gguf/`): Optimized for local inference

## 🌐 Deployment Options

### Local Deployment
- Use the merged model with the provided inference script
- API automatically handles the Python bridge

### Cloud Deployment
- Upload merged model to Hugging Face Hub
- Use with any inference service (vLLM, TGI, etc.)

### Edge Deployment
- Use GGUF model with Ollama
- Deploy on edge devices with llama.cpp

## 📈 Monitoring Training

The training script includes:
- **Weights & Biases integration** for experiment tracking
- **Loss monitoring** to track training progress
- **Memory usage tracking** to optimize resources
- **Automatic checkpointing** to resume if interrupted

## 🎯 Next Steps

1. **Train your first model** using the Colab notebook
2. **Test with your own data** - start with 10-20 examples
3. **Evaluate performance** - test with real user queries
4. **Iterate and improve** - add more data, adjust parameters
5. **Deploy to production** - integrate with your chatbot

## 🆘 Support

If you need help:
1. Check the [Unsloth documentation](https://docs.unsloth.ai/)
2. Review the troubleshooting section above
3. Look at the example notebook for reference
4. Test with the inference script directly

## 📚 Resources

- [Unsloth GitHub](https://github.com/unslothai/unsloth)
- [Unsloth Documentation](https://docs.unsloth.ai/)
- [Training Best Practices](https://docs.unsloth.ai/basics)
- [Model Hub](https://huggingface.co/unsloth)

---

**Happy Training! 🦥✨** 
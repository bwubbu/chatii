# 🚀 Cloud Inference Setup Guide

Run your trained Mistral fairness model in the cloud without any local GPU requirements!

## 🎯 Quick Setup (5 minutes)

### Step 1: Prepare Your Model
```bash
# Your trained model should be in one of these locations:
./fine_tuning/models/mistral_fairness_model/
# OR wherever you saved it after training
```

### Step 2: Google Colab Setup

1. **Open Google Colab**: Go to [colab.research.google.com](https://colab.research.google.com)

2. **Upload the notebook**: 
   - Upload `fine_tuning/notebooks/Mistral_Inference_Server_Colab.ipynb`
   - OR open it directly from GitHub

3. **Enable GPU**:
   - Runtime → Change Runtime Type → Hardware Accelerator → GPU (T4)

4. **Run setup cells**:
   ```python
   # This will be in the notebook - just run the cells!
   !pip install fastapi uvicorn transformers torch peft accelerate bitsandbytes pyngrok
   ```

### Step 3: Upload Model to Google Drive

1. **Create folder structure** in Google Drive:
   ```
   /MyDrive/chatbot_models/mistral_fairness_model/
   ```

2. **Upload your trained model files**:
   - `adapter_config.json`
   - `adapter_model.safetensors` (or `.bin`)
   - Any other model files from your training

### Step 4: Get ngrok Token

1. **Sign up** at [ngrok.com](https://ngrok.com) (free account)
2. **Get your token** from [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. **Copy the token** (looks like: `2abc123def456...`)

### Step 5: Run the Colab Notebook

1. **Run all cells** in the notebook
2. **Enter your ngrok token** when prompted
3. **Update the MODEL_PATH** to point to your uploaded model
4. **Copy the ngrok URL** from the output (looks like: `https://abc123.ngrok-free.app`)

### Step 6: Update Your Next.js App

**Option A: Edit the file directly**
```typescript
// In app/api/trained-model-cloud/route.ts
const CLOUD_MODEL_URL = "https://your-actual-ngrok-url.ngrok-free.app";
```

**Option B: Use environment variable**
```bash
# Add to .env.local
CLOUD_MODEL_URL=https://your-actual-ngrok-url.ngrok-free.app
```

### Step 7: Test It!

1. **Start your Next.js app**: `npm run dev`
2. **Go to a conversation** with a persona
3. **Switch to "Fairness Model"** in the model selector
4. **Send a test message** like: "This service is terrible!"
5. **See your trained model respond** with fairness and politeness! 🎉

## 🔧 Troubleshooting

### Model Not Loading
- Check that your model files are in the correct Google Drive path
- Verify the MODEL_PATH in the Colab notebook matches your folder structure
- Look at the Colab logs for error messages

### Connection Errors
- Make sure the Colab notebook is still running
- Check that the ngrok tunnel is active (green output in Colab)
- Restart the ngrok tunnel cell if needed

### Slow Responses
- First request might be slow (model loading)
- Subsequent requests should be much faster with GPU
- Free Colab has usage limits - consider Colab Pro for heavy usage

## 🌟 Benefits

✅ **Free GPU** - Google Colab provides free T4 GPU  
✅ **10-20x Faster** - GPU vs CPU inference  
✅ **No Local Setup** - Everything runs in the cloud  
✅ **Easy Integration** - Just change one API endpoint  
✅ **Scalable** - Can upgrade to paid tiers for production  

## 🔄 Alternative: Hugging Face (Coming Soon)

If you prefer serverless inference without managing Colab sessions, I can help you upload your model to Hugging Face Hub for their Inference API. Let me know if you'd like that setup too!

## 💡 Production Tips

- **Colab Pro**: $12/month for longer sessions and better GPUs
- **Persistent URLs**: Consider paid ngrok plans for static URLs
- **Load Balancing**: Can run multiple Colab instances for high traffic
- **Monitoring**: Add logging to track model performance

## 🆘 Need Help?

If you run into any issues:
1. Check the Colab notebook logs first
2. Test the ngrok URL directly in browser: `https://your-url.ngrok-free.app/health`
3. Look at Next.js console for API errors
4. The notebook includes debugging cells to help troubleshoot

Your fairness-trained model will be running with GPU acceleration in just a few minutes! 🚀 
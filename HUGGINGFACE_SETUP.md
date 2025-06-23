# 🤗 Hugging Face Inference API Setup

Use your trained Mistral fairness model via Hugging Face's serverless Inference API!

## 🎯 Quick Setup (10 minutes)

### Step 1: Create Hugging Face Account
1. **Sign up** at [huggingface.co](https://huggingface.co)
2. **Get API token** at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. **Create token** with "Read" permissions (or "Write" if uploading)
4. **Copy the token** (looks like: `hf_abc123def456...`)

### Step 2: Upload Your Model

**Option A: Use the Colab Notebook (Recommended)**
1. **Open** `fine_tuning/notebooks/Upload_to_HuggingFace.ipynb` in Google Colab
2. **Upload your model folder** (`mistral_7b_fairness_model`) to the Colab session
3. **Update the configuration**:
   ```python
   LOCAL_MODEL_PATH = "/content/mistral_7b_fairness_model"
   HF_MODEL_NAME = "your-username/mistral-7b-fairness"  # Replace with your username
   ```
4. **Run all cells** and follow the prompts
5. **Copy your model URL** from the output

**Option B: Manual Upload**
1. **Install Hugging Face CLI**: `pip install huggingface_hub`
2. **Login**: `huggingface-cli login`
3. **Upload**: Use the web interface or CLI to upload your model files

### Step 3: Configure Your Next.js App

1. **Add token to environment**:
   ```bash
   # Add to .env.local
   HUGGINGFACE_TOKEN=hf_your_actual_token_here
   ```

2. **Update the API route**:
   ```typescript
   // In app/api/trained-model-hf/route.ts
   const HF_API_URL = "https://api-inference.huggingface.co/models/your-username/mistral-7b-fairness";
   ```

### Step 4: Test Your Model

1. **Start your app**: `npm run dev`
2. **Go to a conversation** with any persona
3. **Switch to "Fairness Model"** in the model selector
4. **Send a test message**: "This service is terrible!"
5. **See your trained model respond** with fairness and politeness! 🎉

## 🌟 Benefits

✅ **Completely Serverless** - No server management  
✅ **Always Available** - No session timeouts  
✅ **Auto-scaling** - Handles traffic automatically  
✅ **Built-in Optimization** - Caching and acceleration  
✅ **Simple Integration** - Just REST API calls  
✅ **Free Tier** - Good for development and testing  

## 🔧 Troubleshooting

### Model Loading Errors
```
Error: "Model is loading"
```
**Solution**: Wait 1-2 minutes and try again. Models need to "warm up" on first use.

### Rate Limit Errors
```
Error: "Rate limit exceeded"
```
**Solution**: 
- Wait a few minutes for the limit to reset
- Consider upgrading to Hugging Face Pro ($9/month)
- Use caching in your app to reduce API calls

### Token Errors
```
Error: "Invalid token"
```
**Solution**:
- Make sure token has correct permissions
- Check that HUGGINGFACE_TOKEN is in .env.local
- Verify token is not expired

### Model Not Found
```
Error: "Model not found"
```
**Solution**:
- Check that your model uploaded successfully
- Verify the model name in HF_API_URL matches your actual model
- Make sure model is public (or token has access to private models)

## 💰 Pricing

### Free Tier
- **Rate Limits**: ~1000 requests/month
- **Good for**: Development, testing, small projects
- **Limitations**: May have slower cold starts

### Pro Tier ($9/month)
- **Higher Limits**: ~10,000 requests/month
- **Faster**: Priority processing
- **Better for**: Production apps, frequent usage

### Enterprise
- **Custom Limits**: Based on usage
- **SLA**: Guaranteed uptime
- **Support**: Priority support

## 🚀 Production Tips

### Caching
Add caching to reduce API calls:
```typescript
// Simple in-memory cache
const responseCache = new Map();

// Check cache before API call
const cacheKey = `${message}-${persona}`;
if (responseCache.has(cacheKey)) {
  return responseCache.get(cacheKey);
}
```

### Error Handling
Always handle loading states:
```typescript
if (data.error?.includes('loading')) {
  // Show "Model is warming up..." message
  // Retry after 30 seconds
}
```

### Monitoring
- **Track usage** on Hugging Face dashboard
- **Monitor response times** in your app
- **Set up alerts** for rate limits

## 🔄 Alternative: Google Colab

If you prefer more control or hit rate limits, you can also use the Google Colab approach I set up earlier. Both work great!

## 🆘 Need Help?

1. **Check model status**: Visit your model page on Hugging Face
2. **Test API directly**: Use the "Deploy" → "Inference API" widget on your model page
3. **Check logs**: Look at Next.js console for detailed error messages
4. **Hugging Face Status**: Check [status.huggingface.co](https://status.huggingface.co)

Your fairness-trained model will be available 24/7 with enterprise-grade infrastructure! 🚀 
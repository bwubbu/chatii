# GCP Cloud Run Deployment Guide

This guide will help you deploy the Ollama FastAPI server to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account**: Sign up at https://cloud.google.com (free $300 credit for new users)
2. **Google Cloud SDK (gcloud)**: Install from https://cloud.google.com/sdk/docs/install
3. **Docker**: Already have Dockerfile set up ✅

## Step 1: Set Up Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing):
   - Click "Select a project" → "New Project"
   - Name: `ramah-ai` (or your choice)
   - Note the Project ID (you'll need it)

3. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

## Step 2: Authenticate and Configure

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker
```

## Step 3: Build and Deploy (Option A: Using Cloud Build)

This is the easiest method - Google Cloud Build will build and deploy for you:

```bash
# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml

# This will:
# 1. Build your Docker image
# 2. Push it to Container Registry
# 3. Deploy to Cloud Run
```

## Step 4: Build and Deploy (Option B: Manual Steps)

If you prefer more control:

```bash
# 1. Build the image
docker build -t gcr.io/YOUR_PROJECT_ID/ollama-chatbot .

# 2. Push to Container Registry
docker push gcr.io/YOUR_PROJECT_ID/ollama-chatbot

# 3. Deploy to Cloud Run
gcloud run deploy ollama-chatbot \
  --image gcr.io/YOUR_PROJECT_ID/ollama-chatbot \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 6Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 1 \
  --set-env-vars MODEL=llama3.1:8b-instruct-q4_0
```

## Step 5: Get Your Cloud Run URL

After deployment, you'll get a URL like:
```
https://ollama-chatbot-xxxxx-uc.a.run.app
```

Copy this URL!

## Step 6: Update Vercel Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   - `OLLAMA_SERVER_URL` = `https://ollama-chatbot-xxxxx-uc.a.run.app`
3. **Redeploy** your Vercel app

## Step 7: Test

1. **Test Cloud Run directly:**
   ```bash
   curl https://ollama-chatbot-xxxxx-uc.a.run.app/health
   ```
   Should return: `{"status":"healthy","model":"llama3.1:8b-instruct-q4_0"}`

2. **Test from your Vercel app:**
   - Go to your chat page
   - Select "Fairness Model" option
   - Send a message
   - Should work! 🎉

## Configuration Options

### Memory and CPU Settings

The default deployment uses:
- **Memory**: 6 GiB (enough for 8B model)
- **CPU**: 2 vCPU
- **Timeout**: 300 seconds (5 minutes)

To change these, update `cloudbuild.yaml` or redeploy with different flags:

```bash
gcloud run services update ollama-chatbot \
  --memory 4Gi \
  --cpu 1 \
  --region us-central1
```

### CPU Allocation Mode

**Option 1: CPU only during requests** (cheaper, but cold starts)
- Default behavior
- No extra flag needed
- First request after idle: 10-30 second cold start

**Option 2: CPU always allocated** (faster, but costs more)
```bash
gcloud run services update ollama-chatbot \
  --cpu-always-allocated \
  --region us-central1
```

### Model Selection

Change the model by updating the `MODEL` environment variable:

```bash
gcloud run services update ollama-chatbot \
  --update-env-vars MODEL=llama3.2:3b \
  --region us-central1
```

## Cost Monitoring

1. Go to https://console.cloud.google.com/billing
2. Set up billing alerts:
   - Budget: $20/month (or your preference)
   - Alert at 50%, 90%, 100%

## Troubleshooting

### Build fails
- Check Cloud Build logs in GCP Console
- Verify Dockerfile syntax
- Ensure all files are in the repo

### Deployment fails
- Check Cloud Run logs: `gcloud run services logs read ollama-chatbot --region us-central1`
- Verify memory/CPU settings are sufficient
- Check if model download completed

### Cold starts too slow
- Enable "CPU always allocated" (costs more)
- Or use a smaller model (faster startup)

### Out of memory errors
- Increase memory allocation: `--memory 8Gi`
- Or use a smaller model

## Useful Commands

```bash
# View logs
gcloud run services logs read ollama-chatbot --region us-central1 --follow

# Update service
gcloud run services update ollama-chatbot --region us-central1

# Delete service (if needed)
gcloud run services delete ollama-chatbot --region us-central1

# List services
gcloud run services list
```

## Next Steps

1. ✅ Deploy to Cloud Run
2. ✅ Update Vercel with Cloud Run URL
3. ✅ Test the integration
4. ✅ Monitor costs for first month
5. ✅ Adjust settings based on usage

---

**Need help?** Check GCP docs: https://cloud.google.com/run/docs

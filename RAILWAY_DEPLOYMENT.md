# Railway Deployment Guide for Ollama FastAPI Server

This guide will help you deploy the Ollama FastAPI server to Railway.

## Prerequisites

- GitHub account (your code is already there)
- Railway account (sign up at https://railway.app)

## Step 1: Create Railway Project

1. Go to https://railway.app and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `chatii` repository
5. Railway will detect the `Dockerfile` automatically

## Step 2: Configure Environment Variables

In Railway dashboard, go to your service → **Variables** tab and add:

- `PORT` - Railway will set this automatically (don't add manually)
- `MODEL` (optional) - Default: `llama3.1:8b-instruct-q4_0`

## Step 3: Deploy

1. Railway will automatically start building from your `Dockerfile`
2. Wait for deployment to complete (~5-10 minutes for first build)
3. Once deployed, Railway will give you a public URL like: `https://your-app-name.up.railway.app`

## Step 4: Update Vercel Environment Variables

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   - `OLLAMA_SERVER_URL` = `https://your-app-name.up.railway.app` (your Railway URL)
3. **Redeploy** your Vercel app so it picks up the new variable

## Step 5: Test

1. Visit your Railway URL: `https://your-app-name.up.railway.app/health`
   - Should return: `{"status":"healthy","model":"llama3.1:8b-instruct-q4_0"}`
2. Visit your Vercel app and try the "Fairness Model" option in chat
3. It should now connect to your Railway-deployed Ollama server!

## Troubleshooting

### Build fails
- Check Railway logs for errors
- Make sure `requirements-server.txt` is in the repo
- Verify `Dockerfile` syntax

### Model download takes too long
- First deployment will take longer (~10-15 min) as it downloads the model
- Subsequent deployments are faster (model is cached)

### Connection errors
- Verify `OLLAMA_SERVER_URL` in Vercel matches your Railway URL
- Check Railway logs to see if server started successfully
- Make sure Railway service is running (not paused)

### Out of memory
- Railway free tier has limits
- Consider using a smaller model or upgrading Railway plan

## Cost Notes

- Railway free tier: $5 credit/month
- Ollama model storage: ~4-5GB
- You may need to upgrade if you exceed free tier limits

## Alternative: Use Railway's Ollama Template

Railway also has a one-click Ollama template:
1. Go to Railway → New Project
2. Select "Deploy from Template"
3. Search for "Ollama"
4. This gives you Ollama pre-configured, then you can add your FastAPI server separately

---

**Need help?** Check Railway docs: https://docs.railway.app

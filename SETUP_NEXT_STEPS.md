# ✅ Next Steps - RAG Setup

## Step 1: Add Embedding API Key (2 minutes)

Add ONE of these to your `.env.local` file:

**Option A: OpenAI (Recommended)**
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Option B: Cohere (Free Alternative)**
```env
COHERE_API_KEY=your-cohere-api-key-here
```

**Where to get keys:**
- OpenAI: https://platform.openai.com/api-keys
- Cohere: https://dashboard.cohere.com/api-keys (free tier available)

## Step 2: Generate Embeddings (3 minutes)

1. **Make sure your dev server is running:**
   ```bash
   npm run dev
   ```

2. **In a new terminal, run the embedding script:**
   ```bash
   npx tsx scripts/generate_guideline_embeddings.ts
   ```

   You should see:
   ```
   🚀 Starting embedding generation for Malaysian guidelines...
   📝 Found 7 guidelines without embeddings
   Generating embedding for POL-01...
   ✅ Generated embedding for POL-01
   ...
   ✨ Embedding generation complete!
   ```

## Step 3: Test It! (2 minutes)

1. **Start a conversation** with any persona
2. **Send a message** that might trigger Malaysian guidelines:
   - "I need help but you can't do it" (should trigger POL-02 - indirect refusal)
   - "What's your name?" (should trigger FAIR-02 - AI transparency)
   - "Thank you" (should trigger POL-03 - warm closings)

3. **Check the response** - it should follow Malaysian cultural guidelines!

## Step 4: Verify It's Working

You can check if embeddings were generated:

```sql
-- In Supabase SQL Editor
SELECT 
  guideline_id, 
  guideline_name, 
  CASE 
    WHEN embedding IS NULL THEN '❌ No embedding'
    ELSE '✅ Has embedding'
  END as status
FROM malaysian_guidelines;
```

All should show "✅ Has embedding"

## 🎉 That's It!

Your RAG system is now fully set up! The AI will automatically:
- Retrieve relevant Malaysian guidelines based on conversation context
- Apply them in responses
- Follow Malaysian cultural norms (honorifics, indirect language, etc.)

## Troubleshooting

**"No embedding API key configured"**
- Make sure you added the key to `.env.local`
- Restart your dev server after adding the key

**"Failed to generate embedding"**
- Check your API key is valid
- Check you have API credits/quota
- Try the other API (Cohere if OpenAI fails, or vice versa)

**"RAG retrieval failed"**
- Make sure embeddings were generated (Step 2)
- Check the function exists: `SELECT * FROM pg_proc WHERE proname = 'match_guidelines';`




















# 🚀 Quick Start Guide - Reverse Training Mode

## What Was Added (Simple Summary)

### 1. Database Tables (1 file)
- **File**: `supabase/migrations/20250101000000_training_mode.sql`
- **What it does**: Creates 3 new tables to store training data
- **Action needed**: Run this SQL in your Supabase dashboard (one-time setup)

### 2. API Endpoints (3 files)
- `/api/training-mode/score` - Scores user responses
- `/api/training-mode/generate-scenario` - Gets training scenarios  
- `/api/training-mode/chat` - AI generates customer messages
- **Action needed**: None - they work automatically

### 3. Frontend Pages (2 files)
- `/app/training/page.tsx` - Main training page (lists scenarios)
- `/app/training/[scenarioId]/page.tsx` - The actual training session
- **Action needed**: None - pages are ready

### 4. Navigation Links (2 files modified)
- Added "Training" link to header
- Added "Training" button to dashboard
- **Action needed**: None - already done

## 🎯 Step-by-Step: Getting It Working

### Step 1: Run Database Migration (5 minutes)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/20250101000000_training_mode.sql`
4. Paste and run
5. ✅ Done!

### Step 2: Check Environment Variable (1 minute)
- Make sure `GEMINI_API_KEY` is in `.env.local`
- If not, add it

### Step 3: Test It (2 minutes)
1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000/training
3. Click a scenario
4. Try responding to the AI customer
5. See your score!

## 📝 What Each Part Does (Simple)

**Database**: Stores scenarios, sessions, and scores

**API Score Endpoint**: Uses Gemini to evaluate if your response was polite/fair

**API Chat Endpoint**: Makes the AI act like a challenging customer

**Training Page**: Shows list of scenarios you can practice with

**Training Session Page**: Where you actually chat and get scored

## ❓ Questions?

If anything is unclear, just ask! We can go through each part one at a time.




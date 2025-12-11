# Backend Migration Guide

## Overview
The backend has been migrated from a separate Express server (`server/server.ts`) to Next.js API routes. This allows the entire application to run on Vercel without needing a separate backend server.

## What Changed

### Before (Separate Express Server)
- Express server running on `localhost:8080`
- Required running `node server.ts` separately
- Two separate processes: Next.js frontend + Express backend
- Couldn't deploy to Vercel properly

### After (Next.js API Routes)
- Everything runs in Next.js
- API routes at `/api/problems/run` and `/api/problems/submit`
- Single process - just run `npm run dev`
- Fully deployable to Vercel

## Files Changed

### New Files Created
1. **`lib/judge/judge-utils.ts`** - All shared utility functions extracted from server.ts
   - Test harness generators for all languages (Python, Java, JavaScript, TypeScript, C++, C#, Go)
   - Judge0 integration (polling, result parsing)
   - OpenAI complexity analysis
   - Supabase database operations

2. **`app/api/problems/run/route.ts`** - Next.js API route for running code
   - Replaced `POST /api/problems/run` from Express server
   - Uses only visible test cases

3. **`app/api/problems/submit/route.ts`** - Next.js API route for submitting code
   - Replaced `POST /api/problems/submit` from Express server
   - Uses all test cases (visible + hidden)
   - Performs AI complexity analysis
   - Saves submission to database

### Modified Files
1. **`components/problems/CodeEditorPanel.tsx`**
   - Changed from `http://localhost:8080/api/problems/run` to `/api/problems/run`
   - Changed from `http://localhost:8080/api/problems/submit` to `/api/problems/submit`

2. **`.env`**
   - Removed `NEXT_PUBLIC_JUDGE_URL` (no longer needed)
   - Added documentation about required environment variables

## Required Environment Variables

Make sure these are set in your Vercel dashboard:

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Judge0 (RapidAPI)
- `RAPIDAPI_HOST` (e.g., `judge0-ce.p.rapidapi.com`)
- `RAPIDAPI_KEY`

### OpenAI
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` (e.g., `gpt-4o-mini`)

## How to Deploy to Vercel

1. **Set Environment Variables**
   - Go to your Vercel project settings
   - Add all the environment variables listed above
   - Make sure to add them for all environments (Production, Preview, Development)

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Migrate backend to Next.js API routes"
   git push origin migrate-backend
   ```

3. **Merge to Main**
   - Create a PR from `migrate-backend` to `main`
   - Once merged, Vercel will automatically deploy

4. **Verify Deployment**
   - Visit your deployed site
   - Try running and submitting code on a problem
   - Check browser console for any errors

## Local Development

### Running the App
```bash
npm run dev
```

That's it! No need to run a separate server anymore.

### Old Server (Deprecated)
The `server/` directory is now deprecated and can be removed in a future cleanup:
```bash
# Don't run this anymore!
# node server.ts  ❌
```

## Troubleshooting

### "Failed to fetch" Error
- Make sure your environment variables are set
- Check that RAPIDAPI_HOST and RAPIDAPI_KEY are correct
- Verify OPENAI_API_KEY is valid

### "No test cases found" Error
- Ensure problem metadata exists in Supabase
- Check that test cases are properly seeded

### Complexity Analysis Fails
- Verify OPENAI_API_KEY is set and valid
- Check OpenAI API quota/billing
- The system will fallback to default values if AI analysis fails

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           Next.js App (Vercel)              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Frontend (React Components)        │   │
│  │  - CodeEditorPanel.tsx              │   │
│  │  - Makes fetch() to API routes      │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│                 ▼                           │
│  ┌─────────────────────────────────────┐   │
│  │  API Routes                         │   │
│  │  - /api/problems/run                │   │
│  │  - /api/problems/submit             │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│                 ▼                           │
│  ┌─────────────────────────────────────┐   │
│  │  lib/judge/judge-utils.ts           │   │
│  │  - Test harness generation          │   │
│  │  - Judge0 integration               │   │
│  │  - AI complexity analysis           │   │
│  │  - Database operations              │   │
│  └─────┬───────────────────────────────┘   │
└────────┼─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────┐                      ┌──────────┐
    │ Judge0  │                      │ Supabase │
    │ (Code   │                      │ (DB)     │
    │ Exec)   │                      └──────────┘
    └─────────┘
         ▲
         │
    ┌─────────┐
    │ OpenAI  │
    │ (AI)    │
    └─────────┘
```

## Benefits of This Migration

1. ✅ **Simpler Deployment** - One-click deploy to Vercel
2. ✅ **No Separate Server** - Everything in one Next.js app
3. ✅ **Better DX** - Just `npm run dev` to start
4. ✅ **Easier Maintenance** - Single codebase
5. ✅ **Better Performance** - Vercel's edge network
6. ✅ **Auto-scaling** - Vercel handles scaling automatically

## Next Steps

1. Test locally to ensure everything works
2. Deploy to Vercel staging
3. Verify all features work in production
4. Remove the old `server/` directory once confirmed working
5. Update any deployment documentation

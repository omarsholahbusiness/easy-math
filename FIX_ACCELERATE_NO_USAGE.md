# Fix: "No usage available" in Prisma Cloud Accelerate

## Problem
You see "No usage available" in Prisma Cloud Accelerate dashboard even though Accelerate is configured.

## Solution Steps

### 1. **Verify Accelerate URL Format** ✅
Your URL should start with `prisma://` (not `https://`):
```
prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI...
```

### 2. **Regenerate Prisma Client**
This is critical! After setting Accelerate URL, regenerate:

```bash
npx prisma generate
```

### 3. **Restart Dev Server**
Prisma Client is cached, so restart is required:

```bash
# Stop server (Ctrl+C)
npm run dev
```

### 4. **Test with Diagnostic Endpoint**
Visit this URL multiple times to generate queries:
```
http://localhost:3000/api/test-accelerate
```

This will:
- Make actual database queries
- Show if Accelerate is being used
- Display query timing
- Verify client configuration

### 5. **Check Terminal Logs**
After restart, you should see:
```
🚀 [Prisma] Using Accelerate with Node Client
📊 [Prisma] Accelerate URL: prisma://accelerate.prisma-data.net/...
```

When queries are made:
```
🔍 [TEST_ACCELERATE] Making test query...
✅ [TEST_ACCELERATE] Queries completed in X ms
```

### 6. **Verify in Prisma Cloud**
1. Go to https://cloud.prisma.io/
2. Select your project
3. Click "Accelerate" in sidebar
4. **Wait 30-60 seconds** after making queries
5. Check different time ranges (Last hour, Last 24 hours, etc.)
6. Look for:
   - Request count
   - Cache hit rate
   - Response times

### 7. **Common Issues & Fixes**

**Issue: Still no usage after following steps**
- ✅ Make sure you're using `@prisma/extension-accelerate` version 2.0.2+
- ✅ Verify Node.js version is 18+ (required for Accelerate 2.0+)
- ✅ Check that queries are actually being executed (not just loading pages)
- ✅ Ensure Accelerate is enabled in Prisma Cloud for your project

**Issue: URL format is wrong**
- ❌ Wrong: `https://accelerate.prisma-data.net/...`
- ✅ Correct: `prisma://accelerate.prisma-data.net/?api_key=...`

**Issue: Queries work but dashboard shows nothing**
- Wait longer (metrics can take 1-2 minutes to appear)
- Try refreshing the dashboard
- Check if you're looking at the correct project
- Verify the API key in your URL matches Prisma Cloud

**Issue: "Accelerate not enabled" in logs**
- Check `.env` or `.env.local` has `PRISMA_ACCELERATE_URL`
- Make sure there are no typos
- Restart dev server after changing `.env`

### 8. **Force Clear Everything**

If nothing works, do a complete reset:

```bash
# Stop dev server
# Clear Next.js cache
rm -rf .next

# Clear node_modules/.prisma
rm -rf node_modules/.prisma

# Regenerate Prisma Client
npx prisma generate

# Restart dev server
npm run dev
```

### 9. **Verify Accelerate Extension is Applied**

Check that your `lib/db.ts` has:
```typescript
import { withAccelerate } from "@prisma/extension-accelerate";

// And uses it:
.$extends(withAccelerate())
```

### 10. **Test Multiple Times**

Visit `/api/test-accelerate` 5-10 times, then check Prisma Cloud. Sometimes the first few queries don't show up immediately.

## Still Not Working?

1. **Check Prisma Cloud Status**: https://www.prisma-status.com/
2. **Verify API Key**: Make sure the API key in your URL is valid
3. **Check Project Settings**: Ensure Accelerate is enabled for your project in Prisma Cloud
4. **Contact Support**: If all else fails, contact Prisma support with:
   - Your Prisma Client version
   - Accelerate extension version
   - Node.js version
   - Screenshot of your dashboard



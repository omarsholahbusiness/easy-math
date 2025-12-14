# How to Activate Prisma Accelerate

## Steps to Activate Accelerate

### 1. Update Environment Variables

Make sure your `.env` or `.env.local` file has the correct Accelerate URL:

```bash
PRISMA_ACCELERATE_URL="https://accelerate.prisma-data.net/YOUR_ACCELERATE_URL"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?connection_limit=1"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

**Important:** 
- `PRISMA_ACCELERATE_URL` should be your Accelerate connection string from Prisma Cloud
- `DATABASE_URL` should have `?connection_limit=1` for Accelerate
- `DIRECT_DATABASE_URL` is used for migrations (bypasses Accelerate)

### 2. Restart Your Development Server

**CRITICAL:** Prisma Client is cached globally, so you MUST restart your dev server:

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it:
npm run dev
# or
yarn dev
# or
pnpm dev
```

### 3. Verify Accelerate is Active

After restarting, check your console/terminal. You should see:

```
🚀 [Prisma] Using Accelerate with Node Client
📊 [Prisma] Accelerate URL: https://accelerate.prisma-data.net/...
```

If you see:
```
⚠️ [Prisma] Accelerate not enabled - using direct connection
```

Then Accelerate is NOT active. Check your environment variables.

### 4. Generate Prisma Client (if needed)

If you just changed the Accelerate URL, regenerate the Prisma Client:

```bash
npx prisma generate
```

### 5. Test Queries

Make some database queries in your application (e.g., load a page that fetches data). The queries should now go through Accelerate.

### 6. Check Accelerate Dashboard

1. Go to [Prisma Cloud Dashboard](https://cloud.prisma.io/)
2. Navigate to your project
3. Click on "Accelerate" in the sidebar
4. You should see:
   - Query metrics
   - Request count
   - Cache hit rate
   - Response times

### Troubleshooting

**Queries not appearing in Accelerate dashboard:**
- ✅ Make sure `PRISMA_ACCELERATE_URL` is set correctly
- ✅ Restart your dev server completely
- ✅ Check that you're using the `db` export from `lib/db.ts` (not creating new PrismaClient instances)
- ✅ Verify the Accelerate URL is valid in Prisma Cloud
- ✅ Make sure you're making actual database queries (not just loading pages)

**Still not working?**
- Clear Next.js cache: `rm -rf .next`
- Regenerate Prisma Client: `npx prisma generate`
- Check environment variables are loaded: Add `console.log(process.env.PRISMA_ACCELERATE_URL)` temporarily

### Production Deployment

For production (Vercel, etc.):
- Set `PRISMA_ACCELERATE_URL` in your deployment platform's environment variables
- Redeploy your application
- Queries will automatically route through Accelerate


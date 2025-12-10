# Fix Vercel Production Error

## Problem
The production database on Vercel is missing the new fields (`courseId` in PromoCode and `isFree` in Quiz), causing server-side errors.

## Solution: Apply Migrations to Production Database

### Step 1: Apply SQL to Production Database

1. **Go to Aiven Console** (or your database provider)
2. **Connect to your production database** (the one used by Vercel)
3. **Run the SQL from `apply_production_migrations.sql`**

Or copy and run this SQL directly:

```sql
-- Add courseId to PromoCode
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PromoCode' AND column_name = 'courseId'
    ) THEN
        ALTER TABLE "PromoCode" ADD COLUMN "courseId" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PromoCode_courseId_idx" ON "PromoCode"("courseId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'PromoCode' AND constraint_name = 'PromoCode_courseId_fkey'
    ) THEN
        ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add isFree to Quiz
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Quiz' AND column_name = 'isFree'
    ) THEN
        ALTER TABLE "Quiz" ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
```

### Step 2: Mark Migrations as Applied (Optional)

If you want to track migrations properly, run these locally (they update the migration tracking table):

```bash
npx prisma migrate resolve --applied 20251201220556_add_courseId_to_promocode
npx prisma migrate resolve --applied 20251201221000_add_isFree_to_quiz
```

### Step 3: Redeploy on Vercel

After applying the SQL:

1. **Push your code to Git** (if you haven't already)
2. **Vercel will automatically redeploy** and run `prisma generate` (via postinstall script)
3. **Or manually trigger a redeploy** in Vercel dashboard

### Step 4: Verify

After redeploy, check:
- Codes page loads without errors
- Quiz pages work correctly
- No server errors in Vercel logs

## Alternative: Use Vercel CLI

If you have Vercel CLI installed:

```bash
vercel env pull .env.production
npx prisma migrate deploy
vercel --prod
```

## Important Notes

- **The SQL is safe** - it uses `IF NOT EXISTS` checks, so it won't break if run multiple times
- **No data loss** - these are additive changes only
- **Default values** - `isFree` defaults to `false`, `courseId` defaults to `null`
- **Production database** - Make sure you're applying to the **production** database, not a local/dev one

## Quick Check

After applying, you can verify in Aiven Console:

```sql
-- Check if courseId exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'PromoCode' AND column_name = 'courseId';

-- Check if isFree exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Quiz' AND column_name = 'isFree';
```

Both should return 1 row if successful.


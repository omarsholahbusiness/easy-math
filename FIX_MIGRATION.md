# Fix Migration Issue - Add courseId to PromoCode

## Problem
The shadow database doesn't have the PromoCode table, causing migration to fail.

## Solution 1: Use `migrate deploy` (Recommended - No Shadow Database)

This applies migrations directly without using a shadow database:

```bash
npx prisma migrate deploy
```

This will apply all pending migrations including the new one.

## Solution 2: Create Migration Without Shadow Database

1. **Create the migration file manually:**

Create a new folder: `prisma/migrations/[timestamp]_add_courseId_to_promocode/`

Replace `[timestamp]` with current timestamp (e.g., `20251201220000`)

2. **Create `migration.sql` in that folder:**

```sql
-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "courseId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PromoCode_courseId_idx" ON "PromoCode"("courseId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PromoCode_courseId_fkey'
    ) THEN
        ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

3. **Mark migration as applied:**

```bash
npx prisma migrate resolve --applied [timestamp]_add_courseId_to_promocode
```

4. **Generate Prisma Client:**

```bash
npx prisma generate
```

## Solution 3: Apply SQL Directly to Database

1. Connect to your database (Aiven Console or psql)
2. Run this SQL:

```sql
-- Add column
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "courseId" TEXT;

-- Create index
CREATE INDEX IF NOT EXISTS "PromoCode_courseId_idx" ON "PromoCode"("courseId");

-- Add foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'PromoCode_courseId_fkey'
    ) THEN
        ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

3. Mark migration as applied (if you created the migration folder):

```bash
npx prisma migrate resolve --applied [timestamp]_add_courseId_to_promocode
```

4. Generate Prisma Client:

```bash
npx prisma generate
```

## Solution 4: Disable Shadow Database (Advanced)

Add to `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
  shadowDatabaseUrl = env("DIRECT_DATABASE_URL")  // Use same DB as shadow
}
```

Then run:
```bash
npx prisma migrate dev --name add_courseId_to_promocode
```

## After Migration

1. Run: `npx prisma generate`
2. Restart your Next.js app
3. Test the Codes page

## Quick Fix (Fastest)

If you just want to get it working quickly:

1. Apply SQL directly to database (Solution 3)
2. Run: `npx prisma generate`
3. Restart app

The migration tracking can be fixed later if needed.


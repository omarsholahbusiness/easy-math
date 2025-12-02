# Baseline Database and Add courseId Migration

## Step 1: Baseline Existing Migrations

Mark all existing migrations as applied (since your database already has these changes):

```bash
npx prisma migrate resolve --applied 20251110_initial_postgres
npx prisma migrate resolve --applied 20251111_add_quiz_attempts
npx prisma migrate resolve --applied 20251201_add_missing_user_grade_column
```

## Step 2: Create New Migration for courseId

After baselining, create the new migration:

```bash
npx prisma migrate dev --name add_courseId_to_promocode
```

If it still fails with shadow database error, use `--create-only`:

```bash
npx prisma migrate dev --create-only --name add_courseId_to_promocode
```

Then manually edit the migration file if needed, and apply it with:

```bash
npx prisma migrate deploy
```

## Alternative: Quick SQL Solution

If you want to skip migration tracking for now:

1. **Apply SQL directly to database:**

```sql
-- Add courseId column if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCode') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'PromoCode' AND column_name = 'courseId'
        ) THEN
            ALTER TABLE "PromoCode" ADD COLUMN "courseId" TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'PromoCode' AND indexname = 'PromoCode_courseId_idx'
        ) THEN
            CREATE INDEX "PromoCode_courseId_idx" ON "PromoCode"("courseId");
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'PromoCode' AND constraint_name = 'PromoCode_courseId_fkey'
        ) THEN
            ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
            FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
```

2. **Generate Prisma Client:**

```bash
npx prisma generate
```

3. **Restart your app**

The migration tracking can be fixed later if needed. The important thing is that the database schema matches your Prisma schema.


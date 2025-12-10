-- Production Migration: Add courseId to PromoCode and isFree to Quiz
-- Apply this SQL directly to your production database (Aiven)

-- ============================================
-- 1. Add courseId to PromoCode table
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'PromoCode' 
        AND column_name = 'courseId'
    ) THEN
        ALTER TABLE "PromoCode" ADD COLUMN "courseId" TEXT;
    END IF;
END $$;

-- Create index on courseId if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'PromoCode' 
        AND indexname = 'PromoCode_courseId_idx'
    ) THEN
        CREATE INDEX "PromoCode_courseId_idx" ON "PromoCode"("courseId");
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'PromoCode' 
        AND constraint_name = 'PromoCode_courseId_fkey'
    ) THEN
        ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 2. Add isFree to Quiz table
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Quiz' 
        AND column_name = 'isFree'
    ) THEN
        ALTER TABLE "Quiz" ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;


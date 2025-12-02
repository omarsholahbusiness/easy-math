-- Migration: Add courseId to PromoCode table
-- Run this SQL directly on your database

-- Add courseId column if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PromoCode') THEN
        -- Add column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'PromoCode' AND column_name = 'courseId'
        ) THEN
            ALTER TABLE "PromoCode" ADD COLUMN "courseId" TEXT;
        END IF;
        
        -- Create index
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'PromoCode' AND indexname = 'PromoCode_courseId_idx'
        ) THEN
            CREATE INDEX "PromoCode_courseId_idx" ON "PromoCode"("courseId");
        END IF;
        
        -- Add foreign key constraint
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'PromoCode' AND constraint_name = 'PromoCode_courseId_fkey'
        ) THEN
            ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
            FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    ELSE
        RAISE NOTICE 'PromoCode table does not exist. Please create it first.';
    END IF;
END $$;


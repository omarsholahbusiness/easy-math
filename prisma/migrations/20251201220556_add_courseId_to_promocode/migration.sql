-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "courseId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PromoCode_courseId_idx" ON "PromoCode"("courseId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'PromoCode' 
        AND constraint_name = 'PromoCode_courseId_fkey'
    ) THEN
        ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" 
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


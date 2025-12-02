-- Add isFree column to Quiz table if it doesn't exist
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


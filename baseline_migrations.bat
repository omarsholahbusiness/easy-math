@echo off
echo Baselining existing migrations...
npx prisma migrate resolve --applied 20251110_initial_postgres
npx prisma migrate resolve --applied 20251111_add_quiz_attempts
npx prisma migrate resolve --applied 20251201_add_missing_user_grade_column
echo.
echo Baselining complete! Now run the new migration.
pause


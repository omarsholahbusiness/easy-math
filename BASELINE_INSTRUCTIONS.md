# Baseline Migrations - Step by Step

## Problem
Prisma detected that your database has changes (like PromoCode table) that aren't tracked in migrations. We need to baseline (mark existing migrations as applied) before creating new ones.

## Solution: Baseline Existing Migrations

Run these commands **one by one** in CMD or Git Bash (not PowerShell):

```bash
npx prisma migrate resolve --applied 20251110_initial_postgres
```

```bash
npx prisma migrate resolve --applied 20251111_add_quiz_attempts
```

```bash
npx prisma migrate resolve --applied 20251201_add_missing_user_grade_column
```

## After Baselining

Once all three commands succeed, create the new migration:

```bash
npx prisma migrate dev --name add_courseId_to_promocode
```

If it still fails with shadow database error, use:

```bash
npx prisma migrate dev --create-only --name add_courseId_to_promocode
```

Then manually check/edit the generated migration file in `prisma/migrations/[timestamp]_add_courseId_to_promocode/migration.sql` and apply it with:

```bash
npx prisma migrate deploy
```

## Alternative: Use the batch file

I've created `baseline_migrations.bat` - you can double-click it or run it from CMD.

## Important Notes

- **DO NOT** run `prisma migrate reset` - it will delete all your data!
- Baselining just tells Prisma "these migrations are already applied"
- It doesn't change your database, just the migration tracking


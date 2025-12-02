# كيفية تطبيق Migration يدوياً

## الخطوة 1: إغلاق التطبيق
أغلق أي تطبيق Next.js يعمل:
- اضغط `Ctrl+C` في terminal الذي يعمل فيه `npm run dev`
- أو أغلق جميع terminals

## الخطوة 2: تطبيق Migration

### الطريقة 1: استخدام Prisma Migrate (موصى بها)
```bash
npx prisma migrate resolve --applied 20251201215131_add_courseId_to_promocode
```

ثم قم بتطبيق SQL يدوياً على قاعدة البيانات.

### الطريقة 2: تطبيق SQL مباشرة على قاعدة البيانات

1. افتح قاعدة البيانات (Aiven Console أو أي أداة PostgreSQL)
2. قم بتشغيل محتوى ملف `prisma/migrations/20251201215131_add_courseId_to_promocode/migration.sql`

### الطريقة 3: استخدام psql
```bash
psql "your_database_connection_string" -f prisma/migrations/20251201215131_add_courseId_to_promocode/migration.sql
```

## الخطوة 3: تحديث Prisma Client
```bash
npx prisma generate
```

## الخطوة 4: التحقق
بعد تطبيق migration، أعد تشغيل التطبيق وتحقق من أن صفحة الأكواد تعمل بشكل صحيح.

## ملاحظات
- تأكد من إغلاق جميع الاتصالات قبل تطبيق migration
- إذا استمرت مشكلة الاتصالات، انتظر بضع دقائق ثم حاول مرة أخرى
- يمكنك التحقق من عدد الاتصالات المفتوحة في Aiven Console


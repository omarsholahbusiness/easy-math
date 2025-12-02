# دليل Migration - إضافة courseId إلى PromoCode

## المشكلة الحالية
قاعدة البيانات وصلت إلى الحد الأقصى لعدد الاتصالات المتزامنة.

## الحلول الموصى بها:

### الحل 1: إغلاق التطبيقات المفتوحة
1. أغلق أي تطبيق Next.js يعمل (`npm run dev` أو `next dev`)
2. أغلق أي IDE أو أدوات أخرى متصلة بقاعدة البيانات
3. حاول تشغيل migration مرة أخرى

### الحل 2: استخدام directUrl للـ migrations
تأكد من أن `DIRECT_DATABASE_URL` في ملف `.env` يحتوي على connection string مع parameters للـ pooling:

```
DIRECT_DATABASE_URL="postgresql://user:password@host:port/database?schema=public&connection_limit=1&pool_timeout=20"
```

### الحل 3: إضافة Connection Pooling Parameters
أضف هذه المعاملات إلى `DATABASE_URL` و `DIRECT_DATABASE_URL`:

```
?connection_limit=5&pool_timeout=20
```

مثال:
```
DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=5&pool_timeout=20"
DIRECT_DATABASE_URL="postgresql://user:pass@host:port/db?connection_limit=1&pool_timeout=20"
```

### الحل 4: استخدام Prisma Migrate مع directUrl فقط
قم بتشغيل:

```bash
npx prisma migrate dev --name add_courseId_to_promocode --create-only
```

ثم قم بتطبيق migration يدوياً إذا لزم الأمر.

### الحل 5: إنشاء Migration يدوياً
إذا استمرت المشكلة، يمكنك إنشاء migration يدوياً:

1. أنشئ ملف migration جديد في `prisma/migrations/[timestamp]_add_courseId_to_promocode/migration.sql`
2. أضف هذا SQL:

```sql
-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN "courseId" TEXT;

-- CreateIndex
CREATE INDEX "PromoCode_courseId_idx" ON "PromoCode"("courseId");

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

3. قم بتطبيق migration:
```bash
npx prisma migrate resolve --applied [timestamp]_add_courseId_to_promocode
```

## بعد تطبيق Migration

1. قم بتشغيل:
```bash
npx prisma generate
```

2. أعد تشغيل التطبيق

## ملاحظات
- تأكد من إغلاق جميع الاتصالات قبل تشغيل migration
- استخدم `DIRECT_DATABASE_URL` للـ migrations لأنه يحتوي على connection limit أقل
- إذا كنت تستخدم Aiven، قد تحتاج إلى زيادة connection limit في إعدادات الخدمة


# إعداد Google reCAPTCHA v3

تم إضافة Google reCAPTCHA v3 للتحقق من أن المستخدمين ليسوا روبوتات في صفحة إنشاء الحساب.

## الخطوات المطلوبة

### 1. الحصول على مفاتيح reCAPTCHA من Google

1. اذهب إلى [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. اضغط على **"+"** لإنشاء موقع جديد
3. اختر **reCAPTCHA v3**
4. أدخل:
   - **Label**: اسم للموقع (مثل: Easy Math)
   - **Domains**: أضف النطاقات التي ستستخدم reCAPTCHA:
     - `localhost` (للتطوير)
     - نطاق الإنتاج (مثل: `yourdomain.com`)
5. وافق على شروط الخدمة
6. اضغط **Submit**

### 2. إضافة المفاتيح إلى ملف `.env`

بعد الحصول على المفاتيح، أضفها إلى ملف `.env`:

```env
# Google reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your_site_key_here"
RECAPTCHA_SECRET_KEY="your_secret_key_here"
RECAPTCHA_MIN_SCORE="0.5"  # اختياري - القيمة الافتراضية 0.5 (من 0.0 إلى 1.0)
```

### 3. شرح المفاتيح

- **NEXT_PUBLIC_RECAPTCHA_SITE_KEY**: المفتاح العام (Site Key) - يُستخدم في الواجهة الأمامية
- **RECAPTCHA_SECRET_KEY**: المفتاح السري (Secret Key) - يُستخدم في الخادم للتحقق
- **RECAPTCHA_MIN_SCORE**: الحد الأدنى للنتيجة (اختياري)
  - `1.0` = مستخدم بشري مؤكد
  - `0.5` = افتراضي (موصى به)
  - `0.0` = قد يكون روبوت

### 4. كيفية عمل reCAPTCHA v3

- **غير مرئي**: لا يحتاج المستخدم للنقر على أي شيء
- **يعمل تلقائياً**: يتحقق في الخلفية عند إرسال النموذج
- **يقيس السلوك**: يحلل سلوك المستخدم لتحديد ما إذا كان بشرياً أم روبوتاً

### 5. وضع التطوير

إذا لم تقم بإضافة المفاتيح، سيعمل التطبيق بدون reCAPTCHA (للتطوير فقط).

### 6. اختبار reCAPTCHA

1. بعد إضافة المفاتيح، أعد تشغيل خادم التطوير
2. اذهب إلى صفحة إنشاء الحساب
3. حاول إنشاء حساب جديد
4. يجب أن يعمل التحقق تلقائياً في الخلفية

### 7. استكشاف الأخطاء

إذا واجهت مشاكل:

1. **"reCAPTCHA not loaded"**: تأكد من إضافة `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
2. **"reCAPTCHA verification failed"**: 
   - تأكد من إضافة `RECAPTCHA_SECRET_KEY`
   - تأكد من أن النطاق مسجل في Google reCAPTCHA Console
3. **"Low reCAPTCHA score"**: قد يكون المستخدم مشبوه - يمكنك تقليل `RECAPTCHA_MIN_SCORE`

## الملفات المضافة

- `components/recaptcha-provider.tsx` - مكون تحميل reCAPTCHA
- `app/api/auth/verify-recaptcha/route.ts` - API للتحقق من reCAPTCHA
- تحديثات على `app/(auth)/(routes)/sign-up/page.tsx` - إضافة reCAPTCHA للنموذج
- تحديثات على `app/api/auth/register/route.ts` - التحقق من reCAPTCHA عند التسجيل

## ملاحظات مهمة

- reCAPTCHA v3 يعمل بشكل غير مرئي ولا يحتاج تدخل المستخدم
- النتيجة (score) تتراوح من 0.0 إلى 1.0
- القيمة 0.5 أو أعلى تعتبر آمنة في معظم الحالات
- يمكنك مراقبة النتائج في Google reCAPTCHA Console


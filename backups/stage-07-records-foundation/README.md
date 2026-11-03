# پشتیبان نهایی مرحله هفتم — هسته اطلاعاتی و ثبت ملک/تقاضا

تاریخ: ۱۴۰۵/۰۸/۱۲
شاخه: `stage-07-records-foundation`

این snapshot نسخه نهایی فایل‌های افزوده/تغییریافته مرحله هفتم را نگهداری می‌کند.

## محتوای snapshot
- package.json
- main.js
- preload.js
- desktop-home.html
- app/schema.sql
- app/database.js
- app/record-entry.html
- app/record-entry.css
- app/record-entry.js
- tests/database-smoke-test.js
- .github/workflows/build-windows.yml
- .gitignore
- DATA_MODEL_FA.md
- STAGE-07-REPORT_FA.md

فایل‌های محاسبه‌گر مستقل مانند `index.html` و فایل `launcher.html` در این مرحله تغییر نکرده‌اند؛ شاخه `main` نیز دست‌نخورده است.

## پشتیبان پیش از تغییر
`backups/stage-07-records-foundation-before/`

## گزارش مرحله
`STAGE-07-REPORT_FA.md`

## آزمون و نصب‌کننده
- GitHub Actions run: https://github.com/hbnasab1347-ops/amlak-salam-calculator/actions/runs/41662707742
- وضعیت build و آزمون: موفق
- Artifact ID: `13241798623`
- SHA-256 ZIP: `4de8d416d19824a92dc61193e35ba676e0cef954c5cc08c4ded077291b205fab`
- SHA-256 EXE: `b4fa022fe799155f0c6b961f35c0a4e5996af42ab3c4443028b57b10d9ec8b8a`

## هشدارهای لازم
- نصب‌کننده امضای دیجیتال ناشر ندارد و با آنتی‌ویروس مستقل اسکن نشده است.
- اجرای واقعی روی رایانه کاربر هنوز انجام نشده است.
- پایگاه داده محلی نسخه آزمایشی است؛ رمزنگاری داده و مجوزهای چندکاربره هنوز فعال نیستند.
- آرشیو قدیمی کاربر به مخزن منتقل نشده است؛ فقط ساختار SQL آن بررسی شده است.

## بازیابی
برای بازگرداندن فایل‌های تغییرکرده به حالت قبل از مرحله هفتم، از snapshot پوشه `backups/stage-07-records-foundation-before/` استفاده کنید.
برای دریافت کل مخزن در نسخه نهایی این مرحله، ZIP مخزن را از commit نهایی شاخه دریافت کنید.

# بایگانی مرحله ۰۳ — نصب‌کننده آزمایشی مستقل

- تاریخ: ۱۴۰۵/۰۸/۱۲
- شاخه: `platform-foundation`
- وضعیت: تغییرات ثبت شده‌اند؛ ساخت خودکار نصب‌کننده آزمایشی باید تأیید شود و نصب/اجرای آن روی رایانه کاربر هنوز انجام نشده است.

## هدف مرحله
ساخت نسخه آزمایشی ویندوز با شناسه نصب و نام مجزا، تا نصب آن با نسخه فعال محاسبه‌گر تداخل نداشته باشد.

## تغییرات
۱. شناسه برنامه به `ir.amlaaksalam.test` تغییر کرد تا کلید نصب ویندوز مستقل باشد.
۲. نام محصول و میانبرها «املاک سلام آزمایشی» شد.
۳. نام فایل اجرایی برنامه به `AmlakSalam-Test` اختصاص یافت.
۴. عنوان پنجره، صفحه آغازین و میزکار نسخه آزمایشی مشخص شد.
۵. بررسی به‌روزرسانی خودکار نسخه اصلی در بسته آزمایشی غیرفعال شد تا نسخه آزمایشی به انتشارهای اصلی متصل نشود.
۶. نام Artifact ساخت ویندوز به `Amlak-Salam-Test-Windows-Installer` تغییر کرد.
۷. فایل `index.html` و منطق محاسبه‌گر تغییر نکرده‌اند.

## فایل‌های snapshot نهایی
- `backups/stage-03-isolated-test-installer/package.json` — نسخه نهایی `package.json`
- `backups/stage-03-isolated-test-installer/main.js` — نسخه نهایی `main.js`
- `backups/stage-03-isolated-test-installer/launcher.html` — نسخه نهایی `launcher.html`
- `backups/stage-03-isolated-test-installer/desktop-home.html` — نسخه نهایی `desktop-home.html`
- `backups/stage-03-isolated-test-installer/.github__workflows__build-windows.yml` — نسخه نهایی `.github/workflows/build-windows.yml`

## نسخه پیش از تغییر
فایل‌های مبنا در این مسیر نگهداری شده‌اند:
`backups/stage-03-isolated-test-installer-before/`

## مراحل بعدی
- بررسی موفقیت ساخت خودکار نسخه آزمایشی
- دریافت نصب‌کننده آزمایشی
- نصب در کنار نسخه فعال، بدون حذف یا جایگزینی آن
- آزمون بازشدن صفحه آغازین، میزکار جامع و محاسبه‌گر مستقل

## بازیابی
برای بازگرداندن وضعیت قبل از مرحله ۰۳، فایل‌های داخل پوشه `backups/stage-03-isolated-test-installer-before/` را به مسیرهای اصلی متناظر در همین شاخه برگردانید. شاخه `main` در این مرحله تغییر نکرده است.

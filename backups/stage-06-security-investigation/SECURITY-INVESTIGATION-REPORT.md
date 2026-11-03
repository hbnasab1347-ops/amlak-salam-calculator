# گزارش بررسی مرحله ششم — آسیب‌پذیری‌های متوسط وابستگی‌ها

تاریخ بررسی: 2026-11-03
شاخه: `stage-06-security-investigation`
مبنای شاخه: `155da81d6c2a1625fe5260bbe89f6e02ada5d113`

## 1) خلاصه نتیجه

گزارش npm audit مرحله پنجم 15 مورد با شدت متوسط، صفر بالا و صفر بحرانی نشان داده است. بررسی JSON خام و lockfile موقت مشخص می‌کند که این 15 ردیف، 15 نقص مستقل در کد برنامه نیستند؛ یک advisory مربوط به `minimatch` در زنجیره وابستگی ابزار ساخت به چند بسته وابسته سرایت کرده و npm audit آن‌ها را نیز در گزارش اثرات نشان می‌دهد.

هیچ تغییر کدی یا dependency در این مرحله اعمال نشده است. دلیل: راه‌حل قطعی و سازگار برای تمام شاخه‌های نسخه‌ای هنوز اثبات نشده و override سراسری نسخه اصلی minimatch می‌تواند با وابستگی‌های قدیمی‌تر ناسازگار شود.

## 2) Advisory اصلی

- شناسه: GHSA-g3hv-75wg-m249
- عنوان: minimatch has potential denial of service via globparts amplification
- شدت: Moderate
- شرح فنی منتشرشده: امکان افزایش کنترل‌نشده بخش‌های glob و پردازش پرهزینه CPU/حافظه در مسیر پیش‌پردازش الگوها.
- نسخه اصلاح‌شده اعلام‌شده: 11.0.1
- مرجع رسمی: https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249

نکته مهم درباره دامنه نسخه‌ها:
شرح advisory در صفحه maintainer نسخه 10.2.6 را به‌عنوان نسخه آسیب‌پذیر مشخص می‌کند، درحالی‌که محدوده ثبت‌شده در GitHub Advisory/npm audit به شکل کلی‌تر `<11.0.1` است. این اختلاف باعث می‌شود نسخه‌های قدیمی‌ترِ موجود در درخت وابستگی نیز گزارش شوند. تا زمان روشن‌شدن این اختلاف از سوی maintainer یا اصلاح داده advisory، نباید هشدارهای نسخه‌های قدیمی‌تر را قطعی بی‌خطر یا قطعاً آسیب‌پذیر اعلام کرد.

## 3) نسخه‌های واقعی در lockfile تشخیصی

| مسیر نصب | نسخه | درخواست‌کننده در درخت وابستگی |
|---|---:|---|
| node_modules/minimatch | 10.2.6 | app-builder-lib |
| node_modules/@electron/asar/node_modules/minimatch | 3.1.5 | @electron/asar |
| node_modules/@electron/universal/node_modules/minimatch | 9.0.9 | @electron/universal |
| node_modules/dir-compare/node_modules/minimatch | 3.1.5 | dir-compare |
| node_modules/filelist/node_modules/minimatch | 5.1.9 | filelist |
| node_modules/glob/node_modules/minimatch | 3.1.5 | glob |

تمام این شش مسیر در lockfile به‌عنوان وابستگی توسعه‌ای (dev) علامت خورده‌اند.

## 4) چرا 15 ردیف گزارش ایجاد شده‌اند؟

ردیف‌های npm audit:
`@electron/asar`, `@electron/universal`, `app-builder-lib`, `dir-compare`, `dmg-builder`, `ejs`, `electron-builder`, `electron-builder-squirrel-windows`, `electron-winstaller`, `filelist`, `glob`, `jake`, `minimatch`, `rimraf`, `temp`.

در خروجی audit، بسته‌های فوق همگی `dev: true` هستند. علت اصلی اثرگذاری، ارتباط زنجیره‌ای آن‌ها با `minimatch` و بسته‌های واسطی مانند `glob`, `rimraf`, `temp` و `app-builder-lib` است.

بنابراین فعلاً شواهد نشان می‌دهد این موارد مربوط به محیط توسعه/ساخت نصب‌کننده‌اند، نه وابستگی‌های runtime برنامه نهایی. این موضوع ریسک را کاهش می‌دهد، اما خطر محیط build و CI را صفر نمی‌کند.

## 5) بررسی نسخه electron-builder 26.18.1

نسخه patch جدیدتر 26.18.1 بررسی شد:
- یادداشت انتشار رسمی: https://github.com/electron-userland/electron-builder/releases
- commit انتشار: `f979f0e`
- در manifest رسمی `app-builder-lib@26.18.1`، وابستگی‌ها همچنان شامل `@electron/asar@3.4.1`، `@electron/universal@2.0.3` و `minimatch@^10.2.5` هستند.
- بنابراین ارتقای ساده electron-builder از 26.18.0 به 26.18.1 به‌تنهایی راه‌حل اثبات‌شده GHSA فعلی نیست؛ محدوده `^10.2.5` همچنان نسخه 10.2.6 را می‌پذیرد.

منبع manifest نسخه 26.18.1:
https://github.com/electron-userland/electron-builder/blob/f979f0e/packages/app-builder-lib/package.json

## 6) تصمیم فنی این مرحله

1. از downgrade به electron-builder 20.23.1 که پیشنهاد خودکار audit است خودداری شد؛ این نسخه بسیار قدیمی‌تر از نسخه فعلی است و با هدف ارتقای امنیت و سازگاری تناقض دارد.
2. از اجرای `npm audit fix` خودکار خودداری شد.
3. از override سراسری minimatch به نسخه 11.0.1 خودداری شد؛ چون چند وابستگی قدیمی‌تر در این درخت، بازه‌های اصلی 3.x، 5.x و 9.x را درخواست می‌کنند. تحمیل نسخه major 11 بدون آزمون سازگاری می‌تواند ابزار ساخت را خراب کند.
4. ارتقای 26.18.1 نیز به‌عنوان رفع این advisory ثبت نشد؛ manifest آن همچنان minimatch 10.x را مجاز می‌داند.
5. تا دریافت نسخه سازگار از upstream یا روشن‌شدن دامنه advisory، dependencyها بدون تغییر باقی می‌مانند.

## 7) آزمون‌ها و محدودیت‌ها

- بررسی ایستای npm audit JSON و package-lock موقت انجام شد.
- manifest رسمی electron-builder 26.18.1 و app-builder-lib بررسی شد.
- در این مرحله نصب تازه، اجرای build، آزمون runtime یا اسکن بدافزار انجام نشده است.
- هیچ ادعایی مبنی بر رفع 15 هشدار یا پاک‌بودن فایل نصب‌کننده مطرح نمی‌شود.
- lockfile موقت مرحله پنجم در artifact GitHub تولید شده بود و به‌عنوان lockfile رسمی پروژه commit نشده است.
- SHA-256 گزارش JSON موقت: `7559fd88849a1caef8949cda4cd4c9a817498911be00a77fc50a4eca25c4eea5`
- SHA-256 lockfile موقت: `281b7a11a4f0e17fd04795e8469b5e225d9887283711637dd44edd4f29cccc58`

## 8) حفاظت از پروژه

- شاخه `main` تغییر نکرد.
- شاخه `stage-05-security-remediation` تغییر نکرد.
- در شاخه مرحله ششم نیز فایل‌های اجرایی برنامه، `package.json`، `main.js`، workflowها و محاسبه‌گر تغییر نکردند.
- snapshot قبل از بررسی در `backups/stage-06-security-investigation-before/` نگهداری شده است.

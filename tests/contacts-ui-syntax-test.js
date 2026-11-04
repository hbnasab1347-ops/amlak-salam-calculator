const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'app', 'contacts.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('اسکریپت صفحه مدیریت ارباب‌رجوع پیدا نشد.');
scripts.forEach((match, index) => new vm.Script(match[1], { filename: 'contacts-inline-' + index + '.js' }));
console.log('Stage 12 contacts UI syntax: PASS');

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const { autoUpdater } = require('electron-updater');
const database = require('./app/database');

let mainWindow;
const allowedLocalPages = new Set(['launcher.html', 'desktop-home.html', 'index.html', 'record-entry.html']);

function attachSafeLocalWindowHandler(window) {
  window.webContents.on('did-create-window', childWindow => {
    attachSafeLocalWindowHandler(childWindow);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      const page = path.basename(decodeURIComponent(target.pathname));
      if (target.protocol !== 'file:' || !allowedLocalPages.has(page)) {
        return { action: 'deny' };
      }
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1180,
          height: 820,
          minWidth: 900,
          minHeight: 650,
          autoHideMenuBar: true,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        }
      };
    } catch (error) {
      console.error('Blocked invalid child window URL:', error.message);
      return { action: 'deny' };
    }
  });
}

function trustedRenderer(event, allowedPages = ['desktop-home.html', 'record-entry.html']) {
  try {
    const url = event.senderFrame && event.senderFrame.url;
    if (!url || !url.startsWith('file:')) return false;
    const page = path.basename(fileURLToPath(url));
    return allowedPages.includes(page);
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    title: 'املاک سلام آزمایشی',
    icon: path.join(__dirname, 'build-icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  attachSafeLocalWindowHandler(mainWindow);
  mainWindow.loadFile(path.join(__dirname, 'launcher.html'));
}

function createRecordWindow(type) {
  const window = new BrowserWindow({
    width: 1240,
    height: 900,
    minWidth: 980,
    minHeight: 720,
    title: type === 'property' ? 'ثبت ملک | املاک سلام' : type === 'demand' ? 'ثبت تقاضا | املاک سلام' : 'پیش‌نویس‌ها | املاک سلام',
    icon: path.join(__dirname, 'build-icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  attachSafeLocalWindowHandler(window);
  window.loadFile(path.join(__dirname, 'app', 'record-entry.html'), { query: { type } });
  return window;
}

function createCalculatorWindow() {
  const window = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 850,
    minHeight: 650,
    title: 'محاسبه‌گر مستقل املاک سلام',
    icon: path.join(__dirname, 'build-icon.ico'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  window.loadFile(path.join(__dirname, 'index.html'));
  return window;
}

function registerIpcHandlers() {
  ipcMain.handle('open-calculator', event => {
    if (!trustedRenderer(event, ['desktop-home.html', 'launcher.html'])) throw new Error('درخواست از صفحه مجاز ارسال نشده است.');
    createCalculatorWindow();
    return { opened: true };
  });

  ipcMain.handle('open-record-entry', (event, type) => {
    if (!trustedRenderer(event, ['desktop-home.html'])) throw new Error('درخواست از صفحه مجاز ارسال نشده است.');
    if (!['property', 'demand', 'drafts'].includes(type)) throw new Error('بخش درخواستی معتبر نیست.');
    createRecordWindow(type);
    return { opened: true };
  });

  ipcMain.handle('records:save-draft', (event, input) => {
    if (!trustedRenderer(event, ['record-entry.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.saveDraft(input);
  });
  ipcMain.handle('records:list-drafts', event => {
    if (!trustedRenderer(event, ['record-entry.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.listDrafts();
  });
  ipcMain.handle('records:get-draft', (event, id) => {
    if (!trustedRenderer(event, ['record-entry.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.getDraft(id);
  });
  ipcMain.handle('records:delete-draft', (event, id) => {
    if (!trustedRenderer(event, ['record-entry.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.deleteDraft(id);
  });
  ipcMain.handle('records:submit', (event, input) => {
    if (!trustedRenderer(event, ['record-entry.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.submitRecord(input);
  });
  ipcMain.handle('records:list', (event, type) => {
    if (!trustedRenderer(event, ['record-entry.html', 'desktop-home.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.listRecords(type);
  });
  ipcMain.handle('app:dashboard-stats', event => {
    if (!trustedRenderer(event, ['desktop-home.html'])) throw new Error('دسترسی غیرمجاز.');
    return database.dashboardStats();
  });
}

app.whenReady().then(async () => {
  try {
    await database.initialize(app.getPath('userData'));
    registerIpcHandlers();
    createWindow();

    // نسخه آزمایشی نباید به‌روزرسانی نسخه اصلی را دریافت کند.
    if (app.isPackaged && app.getName() === 'املاک سلام') {
      autoUpdater.checkForUpdatesAndNotify().catch(err =>
        console.log('Update check:', err.message)
      );
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error('Application initialization failed:', error);
    dialog.showErrorBox('خطا در راه‌اندازی املاک سلام', 'پایگاه داده محلی آماده نشد. اطلاعات موجود حذف نشده‌اند.\n\n' + error.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

autoUpdater.on('update-downloaded', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['راه‌اندازی مجدد و نصب', 'بعداً'],
    defaultId: 0,
    title: 'به‌روزرسانی املاک سلام',
    message: 'نسخه جدید آماده نصب است. اکنون نصب شود؟'
  });
  if (result.response === 0) autoUpdater.quitAndInstall();
});

autoUpdater.on('error', err => console.log('Updater error:', err.message));

const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180, height: 820, minWidth: 900, minHeight: 650,
    title: 'محاسبه‌گر املاک سلام',
    icon: path.join(__dirname, 'build-icon.ico'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
}
app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => console.log('Update check:', err.message));
  }
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
autoUpdater.on('update-downloaded', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info', buttons: ['راه‌اندازی مجدد و نصب', 'بعداً'], defaultId: 0,
    title: 'به‌روزرسانی املاک سلام', message: 'نسخهٔ جدید آمادهٔ نصب است. اکنون نصب شود؟'
  });
  if (result.response === 0) autoUpdater.quitAndInstall();
});
autoUpdater.on('error', err => console.log('Updater error:', err.message));

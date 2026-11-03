const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let calculatorWindow;

function secureWindowOptions(width, height, minWidth, minHeight) {
  return {
    width,
    height,
    minWidth,
    minHeight,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  };
}

function createCalculatorWindow() {
  if (calculatorWindow && !calculatorWindow.isDestroyed()) {
    calculatorWindow.focus();
    return calculatorWindow;
  }

  calculatorWindow = new BrowserWindow({
    ...secureWindowOptions(1100, 850, 900, 650),
    title: 'محاسبه‌گر مستقل املاک سلام',
    icon: path.join(__dirname, 'build-icon.ico')
  });

  calculatorWindow.loadFile(path.join(__dirname, 'index.html'));
  calculatorWindow.on('closed', () => { calculatorWindow = null; });
  return calculatorWindow;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    ...secureWindowOptions(1280, 850, 1000, 680),
    title: 'سامانه جامع املاک سلام',
    icon: path.join(__dirname, 'build-icon.ico')
  });

  mainWindow.loadFile(path.join(__dirname, 'desktop-home.html'));
}

ipcMain.handle('open-calculator', () => {
  createCalculatorWindow();
  return true;
});

app.whenReady().then(() => {
  createMainWindow();

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err =>
      console.log('Update check:', err.message)
    );
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

autoUpdater.on('update-downloaded', async () => {
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

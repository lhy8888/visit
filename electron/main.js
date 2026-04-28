const fs = require('fs');
const path = require('path');
const { app: electronApp, BrowserWindow, dialog } = require('electron');

let serverInstance = null;
let mainWindow = null;

function ensureDirectoryExists(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function configurePackagedRuntime() {
  const userDataRoot = path.join(electronApp.getPath('userData'), 'visitor-access');
  const dataDir = path.join(userDataRoot, 'data');
  const logsDir = path.join(userDataRoot, 'logs');
  const imagesDir = path.join(userDataRoot, 'images');

  ensureDirectoryExists(dataDir);
  ensureDirectoryExists(logsDir);
  ensureDirectoryExists(imagesDir);

  process.env.NODE_ENV = 'production';
  process.env.DATA_DIR = dataDir;
  process.env.DB_FILE = path.join(dataDir, 'visitor.db');
  process.env.UPLOAD_DIR = imagesDir;
  process.env.LOG_FILE = path.join(logsDir, 'app.log');
  process.env.PORT = '0';

  return { dataDir, logsDir, imagesDir };
}

function createWindow(port) {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fb',
    title: 'Visit Access',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.maximize();
  window.once('ready-to-show', () => {
    window.show();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  window.loadURL(baseUrl).catch((error) => {
    dialog.showErrorBox('Visit Access', `Unable to load the app window.\n\n${error.message}`);
  });

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  return window;
}

async function startDesktopApp() {
  configurePackagedRuntime();

  const expressApp = require('../server');

  const port = await new Promise((resolve, reject) => {
    const server = expressApp.listen(0, '127.0.0.1', () => {
      serverInstance = server;
      resolve(server.address().port);
    });

    server.on('error', reject);
  });

  mainWindow = createWindow(port);
}

const gotSingleInstanceLock = electronApp.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  electronApp.quit();
} else {
  electronApp.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });

  electronApp.whenReady().then(startDesktopApp).catch((error) => {
    dialog.showErrorBox('Visit Access', `Failed to start the desktop app.\n\n${error.message}`);
    electronApp.quit();
  });

  electronApp.on('before-quit', () => {
    if (serverInstance) {
      try {
        serverInstance.close();
      } catch (error) {
        // Ignore shutdown errors.
      }
    }
  });

  electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      electronApp.quit();
    }
  });
}

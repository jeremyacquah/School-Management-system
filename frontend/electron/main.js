const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');

// Ensure Chromium Network Service runs in-process to avoid Windows network service sandbox crashes
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess');

let mainWindow;

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Greenwood Academy - School Management System',
    icon: path.join(__dirname, '../public/logo.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // F12 shortcut to toggle DevTools anytime
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // If backend server is active on port 5000, load it directly; otherwise load local dist bundle
    checkServer('http://localhost:5000/api/health').then((isRunning) => {
      if (isRunning) {
        mainWindow.loadURL('http://localhost:5000');
      } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    });
  }

  // Gracefully handle load failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Electron] Failed to load ${validatedURL}: ${errorDescription} (code: ${errorCode})`);
    // Fallback to local dist index if remote failed
    if (validatedURL.includes('localhost')) {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  });

  // Create native menu
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Sync Now', click: () => mainWindow.webContents.send('trigger-sync') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Greenwood SMS',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              title: 'About Greenwood SMS',
              message: 'Greenwood School Management System\nVersion 2.0.0\nOffline-ready Desktop & Mobile App for Windows, macOS, Android, and iOS.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

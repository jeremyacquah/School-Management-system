const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

// Ensure Chromium Network Service runs in-process to avoid Windows network service sandbox crashes
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess');

let mainWindow;
let backendProcess = null;

function checkServer(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function ensureBackendRunning() {
  return new Promise((resolve) => {
    checkServer('http://localhost:5000/api/health').then((isRunning) => {
      if (isRunning) {
        console.log('[Electron] Backend is already running on port 5000.');
        return resolve(true);
      }

      console.log('[Electron] Spawning local backend server for offline operation...');
      const backendScript = path.resolve(__dirname, '../../backend/server.js');
      const backendCwd = path.resolve(__dirname, '../../backend');

      try {
        backendProcess = spawn('node', [backendScript], {
          cwd: backendCwd,
          env: { ...process.env, PORT: '5000' },
          stdio: 'pipe',
          windowsHide: true
        });

        backendProcess.stdout.on('data', (d) => {
          const msg = d.toString().trim();
          if (msg) console.log(`[Backend] ${msg}`);
        });

        backendProcess.stderr.on('data', (d) => {
          const msg = d.toString().trim();
          if (msg) console.error(`[Backend Err] ${msg}`);
        });

        backendProcess.on('error', (err) => {
          console.error('[Electron] Failed to start backend process:', err);
          resolve(false);
        });

        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          const ready = await checkServer('http://localhost:5000/api/health');
          if (ready) {
            clearInterval(interval);
            console.log('[Electron] Local backend server is ready!');
            resolve(true);
          } else if (attempts >= 25) {
            clearInterval(interval);
            console.warn('[Electron] Backend server startup timed out, falling back to local files.');
            resolve(false);
          }
        }, 200);
      } catch (err) {
        console.error('[Electron] Could not launch backend server:', err);
        resolve(false);
      }
    });
  });
}

function killBackend() {
  if (backendProcess && !backendProcess.killed) {
    try {
      console.log('[Electron] Shutting down local backend server...');
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`);
      } else {
        backendProcess.kill();
      }
      backendProcess = null;
    } catch (e) {
      // Process might already be closed
    }
  }
}

async function createWindow() {
  // Purge any stale service workers and cache storage to completely eliminate white screens
  if (session && session.defaultSession) {
    try {
      await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
      await session.defaultSession.clearCache();
    } catch (e) { }
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Greenwood Academy - School Management System (Offline Ready)',
    icon: path.join(__dirname, '../public/logo.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Forward renderer console messages to terminal for instant visibility
  mainWindow.webContents.on('console-message', (_event, _level, message, _line, _sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  // F12 shortcut to toggle DevTools when needed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Note: We do NOT auto-open DevTools here to avoid the upstream Chromium DevTools bug:
  // "ReferenceError: dragEvent is not defined". DevTools can be opened anytime via F12 or View menu.

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else if (process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // Ensure local backend is active so offline desktop app runs fully locally
    const isRunning = await ensureBackendRunning();
    if (isRunning) {
      console.log('[Electron] Connected to backend on http://localhost:5000/');
      mainWindow.loadURL('http://localhost:5000/');
    } else {
      console.log('[Electron] Backend unreachable, loading local bundle from dist');
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  // Gracefully handle load failures
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn(`[Electron] Failed to load ${validatedURL}: ${errorDescription} (code: ${errorCode})`);
    if (validatedURL.includes('localhost')) {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  });

  // Native application menu
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
  killBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', killBackend);
app.on('will-quit', killBackend);

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

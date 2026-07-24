const { app, BrowserWindow, screen, ipcMain, globalShortcut, session, clipboard } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let controlWindow = null;
let projectionWindow = null;
let serverProcess = null;
let lastSlideData = null;
let isSimulatedDisplayActive = !app.isPackaged;

const logPath = path.join(app.getPath('userData'), 'logosbridge-startup.log');
function logDebug(message) {
  try {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch (e) {
    // Ignore logging errors
  }
}

// Start the Express server directly inside the main process when packaged
if (app.isPackaged) {
  logDebug('Starting production server in packaged mode...');
  try {
    process.env.NODE_ENV = 'production';
    require('./dist/server.cjs');
    logDebug('Successfully loaded production server.');
    console.log('[Main Process] Successfully loaded production server.');
  } catch (err) {
    logDebug(`Failed to start production server: ${err.message}\nStack: ${err.stack}`);
    console.error('[Main Process] Failed to start production server:', err);
  }
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#020617', // Match the dark splash screen background
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const startUrl = 'http://localhost:3000/app';
  controlWindow.loadURL(startUrl);

  controlWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith(startUrl)) {
      console.log(`[Main Process] Control Window failed to load, retrying in 500ms... (Error: ${errorDescription})`);
      setTimeout(() => {
        if (controlWindow && !controlWindow.isDestroyed()) {
          controlWindow.loadURL(startUrl);
        }
      }, 500);
    }
  });

  controlWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Control Window Console] ${message} (at ${sourceId}:${line})`);
  });

  // Open the DevTools inside control window for debugging convenience in development
  if (!app.isPackaged) {
    controlWindow.webContents.openDevTools();
  }

  controlWindow.on('closed', () => {
    controlWindow = null;
    if (projectionWindow) {
      projectionWindow.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  });
}

function createProjectionWindow(display) {
  if (projectionWindow) {
    projectionWindow.close();
  }

  const { x, y, width, height } = display.bounds;
  const isSimulated = display.isSimulated;

  projectionWindow = new BrowserWindow({
    x: x,
    y: y,
    width: isSimulated ? 800 : width,
    height: isSimulated ? 600 : height,
    fullscreen: !isSimulated,
    frame: !isSimulated,
    alwaysOnTop: !isSimulated,
    autoHideMenuBar: true,
    backgroundColor: '#09090b', // Match the black projector background
    title: isSimulated ? '📺 Projection Window (SIMULATED)' : 'Scripture Projection',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const projectionUrl = 'http://localhost:3000/projection.html';
  projectionWindow.loadURL(projectionUrl);

  projectionWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith(projectionUrl)) {
      console.log(`[Main Process] Projection Window failed to load, retrying in 500ms... (Error: ${errorDescription})`);
      setTimeout(() => {
        if (projectionWindow && !projectionWindow.isDestroyed()) {
          projectionWindow.loadURL(projectionUrl);
        }
      }, 500);
    }
  });

  projectionWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Projection Window Console] ${message} (at ${sourceId}:${line})`);
  });

  if (!app.isPackaged) {
    projectionWindow.webContents.openDevTools();
  }

  projectionWindow.webContents.on('did-finish-load', () => {
    console.log('[Main Process] Projection window finished loading.');
    if (lastSlideData) {
      projectionWindow.webContents.send('slide-update-relay', lastSlideData);
    }
  });

  projectionWindow.on('closed', () => {
    projectionWindow = null;
  });
}

function updateDisplays() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Find a non-primary display (external target)
  let targetDisplay = displays.find(d => d.id !== primaryDisplay.id);

  if (!targetDisplay && isSimulatedDisplayActive) {
    // Mock a simulated external display layout on the primary screen for development/single-screen systems
    const { x, y, width, height } = primaryDisplay.bounds;
    targetDisplay = {
      id: 99999,
      bounds: {
        x: Math.round(x + width / 4), // offset slightly so it can be seen
        y: Math.round(y + height / 4),
        width: 800,
        height: 600
      },
      isSimulated: true
    };
    console.log('[Main Process Display Monitor] Simulating virtual display bounds:', targetDisplay.bounds);
  }

  if (targetDisplay) {
    console.log(`[Main Process Display Monitor] Target display selected: ID ${targetDisplay.id}, bounds:`, targetDisplay.bounds);
    if (!projectionWindow) {
      createProjectionWindow(targetDisplay);
    } else {
      // Reposition window to target bounds
      const { x, y, width, height } = targetDisplay.bounds;
      projectionWindow.setBounds({ x, y, width, height });
    }
  } else {
    console.log('[Main Process Display Monitor] Only one primary display detected. No external display targeted.');
    if (projectionWindow) {
      projectionWindow.close();
      projectionWindow = null;
    }
  }
}

app.whenReady().then(() => {
  logDebug('App is ready. Initializing windows...');

  // Auto-approve media (microphone) permission requests inside Electron
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media';
  });

  // Clear Service Workers and Cache asynchronously without blocking startup
  session.defaultSession.clearStorageData({
    storages: ['serviceworkers', 'cachestorage']
  }).then(() => {
    logDebug('Cleared service workers and cache storage successfully.');
    console.log('[Main Process] Cleared service workers and cache storage successfully.');
  }).catch((err) => {
    logDebug(`Failed to clear storage: ${err.message}`);
    console.warn('[Main Process] Failed to clear storage:', err);
  });

  createControlWindow();
  updateDisplays();

  // Connect screen display listeners
  screen.on('display-added', (event, newDisplay) => {
    console.log('[Main Process Display Monitor] Screen plugged in:', newDisplay.id);
    updateDisplays();
  });

  screen.on('display-removed', (event, oldDisplay) => {
    console.log('[Main Process Display Monitor] Screen unplugged:', oldDisplay.id);
    updateDisplays();
  });

  // Register shortcut to toggle virtual external display mode
  globalShortcut.register('CommandOrControl+Alt+S', () => {
    console.log('[Shortcut] CommandOrControl+Alt+S pressed. Toggling simulation mode.');
    isSimulatedDisplayActive = !isSimulatedDisplayActive;
    updateDisplays();
  });

  // Automatically capture verification screenshots after 25 seconds in development
  if (!app.isPackaged) {
    setTimeout(async () => {
      try {
        console.log('[Main Process] Auto-capturing verification screenshots...');
        const fs = require('fs');
        if (controlWindow) {
          const image = await controlWindow.webContents.capturePage();
          fs.writeFileSync(path.join(__dirname, 'control_window_verification.png'), image.toPNG());
          console.log('[Main Process] Saved control_window_verification.png');
        }
        if (projectionWindow) {
          const image = await projectionWindow.webContents.capturePage();
          fs.writeFileSync(path.join(__dirname, 'projection_window_verification.png'), image.toPNG());
          console.log('[Main Process] Saved projection_window_verification.png');
        }
      } catch (err) {
        console.error('[Main Process] Failed to capture verification screenshots:', err);
      }
    }, 25000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (serverProcess) {
    serverProcess.kill();
  }
});

// IPC communication channel relay
ipcMain.on('slide-update', (event, arg) => {
  lastSlideData = arg;
  if (projectionWindow) {
    projectionWindow.webContents.send('slide-update-relay', arg);
  }
});

ipcMain.on('write-clipboard', (event, text) => {
  try {
    clipboard.writeText(text);
    console.log('[Main Process] System clipboard updated via native API.');
  } catch (err) {
    console.error('[Main Process] Failed to write to system clipboard:', err);
  }
});

ipcMain.on('reopen-projector', () => {
  console.log('[Main Process] Reopening projector window by user request.');
  updateDisplays();
  
  if (projectionWindow && lastSlideData) {
    // Ensure the new window gets the current slide state once loaded
    // updateDisplays() is async/sync, but the window might take a moment to load
    // so we re-send it after a brief delay
    setTimeout(() => {
      if (projectionWindow) {
        projectionWindow.webContents.send('slide-update-relay', lastSlideData);
      }
    }, 1000);
  }
});

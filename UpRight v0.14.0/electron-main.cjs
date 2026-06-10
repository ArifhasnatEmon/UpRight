const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

// Dynamic import because electron-store is ESM-only in v9+
let Store;
let faceProfileStore;
async function getFaceProfileStore() {
  if (faceProfileStore) return faceProfileStore;
  if (!Store) {
    const mod = await import('electron-store');
    Store = mod.default;
  }
  faceProfileStore = new Store({
    name: 'face-profiles',
    // Stored at: AppData\Roaming\Upright\face-profiles.json
    // CRITICAL: Disable dot-notation so email keys like "user@gmail.com"
    // are stored as literal keys, not split into nested objects.
    accessPropertiesByDotNotation: false,
  });
  return faceProfileStore;
}

// Crucial flags to prevent Chromium from throttling background camera processing
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const isDev = !app.isPackaged;

// Clear corrupted Chromium cache on startup
const userDataPath = app.getPath('userData');
const cacheDirs = ['Cache', 'Code Cache', 'GPUCache'];
for (const dir of cacheDirs) {
  const cachePath = path.join(userDataPath, dir);
  if (fs.existsSync(cachePath)) {
    try { fs.rmSync(cachePath, { recursive: true, force: true }); } catch {}
  }
}

let mainWindow = null;
let overlayWindow = null;
let tray = null;
let isQuitting = false;
let runInBackground = true; // Default: hide to tray on close
let bubbleVisible = true; // Default: desktop bubble is visible
let monitoringPaused = false; // Track monitoring state for tray rebuild
let lastOverlayStateCached = null; // Cache last overlay state for keepalive
let savedBounds = null; // Saved window bounds for tray restore

function hideToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // 1. Save dimensions so we can restore properly
  savedBounds = mainWindow.getBounds();
  // 2. Remove from taskbar
  mainWindow.setSkipTaskbar(true);
  // 3. Move offscreen instead of calling .hide() to trick Chromium into keeping requestAnimationFrame running
  mainWindow.setBounds({ x: -20000, y: -20000, width: savedBounds.width, height: savedBounds.height });
  // Notify renderer that window is offscreen
  mainWindow.webContents.send('window:visibility-changed', true);
}

const WINDOW_CONFIG = { width: 1200, height: 800, minWidth: 1000, minHeight: 700 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    minWidth: WINDOW_CONFIG.minWidth,
    minHeight: WINDOW_CONFIG.minHeight,
    show: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Prevent timer throttling
      preload: path.join(__dirname, 'preload.cjs'),
    },
    ...(fs.existsSync(path.join(__dirname, 'public/icon.ico')) ? { icon: path.join(__dirname, 'public/icon.ico') } : {})
  });

  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });



  // Hide to tray on close (or quit if runInBackground is off)
  mainWindow.on('close', (event) => {
    if (!isQuitting && runInBackground) {
      event.preventDefault();
      hideToTray();
    }
    return false;
  });

  // Helper attached to mainWindow for tray to use when restoring
  mainWindow.restoreFromTray = () => {
    if (savedBounds) {
      mainWindow.setBounds(savedBounds);
    } else {
      mainWindow.center();
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('window:visibility-changed', false);
  };
}

function getPrimaryDisplayBounds() {
  const electronScreen = require('electron').screen;
  return electronScreen.getPrimaryDisplay().workAreaSize;
}

function createOverlayWindow() {
  const { width, height } = getPrimaryDisplayBounds();

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.cjs'),
    }
  });

  // Enable click-through so user can interact with their desktop
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  const url = isDev 
    ? 'http://localhost:3000/#/overlay' 
    : `file://${path.join(__dirname, 'dist/index.html')}#/overlay`;

  overlayWindow.loadURL(url);

  // Ensure overlay shows once content is loaded + resend cached state
  overlayWindow.once('ready-to-show', () => {
    if (overlayWindow) {
      overlayWindow.showInactive();
      // Re-send cached state so the bubble appears immediately after recreation
      if (lastOverlayStateCached) {
        overlayWindow.webContents.send('overlay:state-updated', lastOverlayStateCached);
      }
    }
  });

  // Auto-recover if overlay crashes
  overlayWindow.webContents.on('crashed', () => {
    console.error('Overlay window crashed, recreating...');
    if (overlayWindow) {
      overlayWindow.destroy();
      overlayWindow = null;
    }
    setTimeout(createOverlayWindow, 1000);
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // Phase 4C - Multi-monitor support
  const electronScreen = require('electron').screen;
  const handleDisplayChange = () => {
    if (overlayWindow) {
      const { width, height } = getPrimaryDisplayBounds();
      overlayWindow.setBounds({ x: 0, y: 0, width, height });
    }
  };
  electronScreen.on('display-added', handleDisplayChange);
  electronScreen.on('display-removed', handleDisplayChange);
  electronScreen.on('display-metrics-changed', handleDisplayChange);
}

function updateTrayMenu(isPaused) {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open UpRight', click: () => {
      if (mainWindow.restoreFromTray) mainWindow.restoreFromTray();
      else mainWindow.show();
    }},
    { 
      label: isPaused ? 'Resume Monitoring' : 'Pause Monitoring', 
      click: () => {
        mainWindow.webContents.send('tray:toggle-monitoring');
      }
    },
    {
      label: bubbleVisible ? 'Hide Bubble' : 'Show Bubble',
      click: () => {
        mainWindow.webContents.send('tray:toggle-bubble');
      }
    },
    { type: 'separator' },
    { label: 'Settings', click: () => {
      mainWindow.show();
      mainWindow.webContents.send('navigate', 'settings');
    }},
    { type: 'separator' },
    { label: 'Exit', click: () => {
      isQuitting = true;
      app.quit();
    }}
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  // Resolve icon path with fallback
  const iconPath = path.join(__dirname, 'public/icon.png');
  let icon;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 }));

  updateTrayMenu(false);
  tray.setToolTip('UpRight Posture Monitor');

  tray.on('double-click', () => {
    if (mainWindow.restoreFromTray) mainWindow.restoreFromTray();
    else mainWindow.show();
  });
}

app.on('ready', () => {
  createWindow();
  createTray();
  // Create overlay eagerly so the floating button is always available
  createOverlayWindow();

  const PAUSE_IDLE_SECS = 60;   // 1 minute  → pause timers
  const RESET_IDLE_SECS = 300;  // 5 minutes → reset timers

  let idleSent = 'active'; // track last sent state to avoid duplicates

  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const idleSecs = powerMonitor.getSystemIdleTime();

    if (idleSecs >= RESET_IDLE_SECS && idleSent !== 'reset') {
      idleSent = 'reset';
      mainWindow.webContents.send('idle:state', 'reset');
    } else if (idleSecs >= PAUSE_IDLE_SECS && idleSecs < RESET_IDLE_SECS && idleSent !== 'paused') {
      idleSent = 'paused';
      mainWindow.webContents.send('idle:state', 'paused');
    } else if (idleSecs < PAUSE_IDLE_SECS && idleSent !== 'active') {
      idleSent = 'active';
      mainWindow.webContents.send('idle:state', 'active');
    }
  }, 10_000); // check every 10 seconds
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Receive monitoring status from the renderer to update tray menu
ipcMain.on('monitoring:status', (event, isPaused) => {
  monitoringPaused = isPaused;
  if (tray) {
    updateTrayMenu(isPaused);
  }
});

// Handle window minimize request (minimize to taskbar)
ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

// Handle hide-to-tray request (offscreen + skip taskbar)
ipcMain.on('window:hide-to-tray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    hideToTray();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Handle run-in-background setting
ipcMain.on('settings:run-in-background', (event, enabled) => {
  runInBackground = enabled;
});

// Handle quit from renderer
ipcMain.on('app:quit', () => {
  isQuitting = true;
  app.quit();
});

// Handle saving physical face snapshots locally
ipcMain.handle('save-user-snapshot', async (event, email, base64Data) => {
  try {
    const userDataPath = app.getPath('userData');
    const safeEmail = email.replace(/[^a-zA-Z0-9@.-]/g, '_'); // Sanitize email for folder name
    const userDirPath = path.join(userDataPath, 'Users', safeEmail);
    
    // Ensure the folder exists
    if (!fs.existsSync(userDirPath)) {
      fs.mkdirSync(userDirPath, { recursive: true });
    }

    // Strip the data:image/jpeg;base64, prefix
    const base64Image = base64Data.split(';base64,').pop();
    const filePath = path.join(userDirPath, 'snapshot.jpg');
    
    fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Failed to save user snapshot:', err);
    return { success: false, error: err.message };
  }
});

// Handle bubble visibility status from renderer
ipcMain.on('bubble:status', (event, visible) => {
  bubbleVisible = visible;
  // Rebuild tray menu to reflect new label
  if (tray) {
    updateTrayMenu(monitoringPaused);
  }
});


ipcMain.on('overlay:update-state', (event, state) => {
  // Cache the state for keepalive / overlay recreation
  lastOverlayStateCached = state;

  // Ensure overlay window exists
  if (!overlayWindow) {
    createOverlayWindow();
  }

  if (overlayWindow) {
    overlayWindow.webContents.send('overlay:state-updated', state);
    
    // Ensure overlay stays visible
    if (!overlayWindow.isVisible()) {
      overlayWindow.showInactive();
    }

    // Safety: restore click-through when no alert is showing
    if (!state.showAlert && !state.reminderAlert && !state.toastMessage) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }
});

// Keepalive: periodically check overlay is alive and re-send state
setInterval(() => {
  if (isQuitting) return;
  if (!overlayWindow) {
    createOverlayWindow();
  } else if (lastOverlayStateCached) {
    // Re-send state in case overlay silently lost it
    try {
      if (overlayWindow.isDestroyed()) {
        overlayWindow = null;
        return;
      }
      overlayWindow.webContents.send('overlay:state-updated', lastOverlayStateCached);
      if (!overlayWindow.isVisible()) {
        overlayWindow.showInactive();
      }
    } catch (e) {
      // Overlay may have been destroyed — recreate
      overlayWindow = null;
      if (!isQuitting) createOverlayWindow();
    }
  }
}, 10000);

// Handle hover interactions to selectively enable/disable click-through
ipcMain.on('overlay:set-ignore-mouse-events', (event, ignore) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

// Relay actions (snooze, dismiss, menu clicks) back to main window
ipcMain.on('overlay:action', (event, action, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay:action-received', action, payload);
    
    // Automatically restore main window if dashboard/settings requested
    if (action === 'dashboard' || action === 'settings') {
      if (mainWindow.restoreFromTray) mainWindow.restoreFromTray();
      else mainWindow.show();
    }
    
    if (action === 'exit') {
      isQuitting = true;
      app.quit();
    }
  }
});

// Save or overwrite a face profile for a given email
// NOTE: We read/write the entire faceProfiles map instead of using dot-path
// notation because electron-store treats dots as path separators, which breaks
// email keys like "user@gmail.com" (splits on the dot before "com").
ipcMain.handle('face:save-profile', async (_event, email, name, embedding) => {
  const store = await getFaceProfileStore();
  const all = store.get('faceProfiles', {});
  all[email] = {
    name,
    embedding: Array.from(embedding), // Float32Array → plain array for JSON serialisation
    enrolledAt: new Date().toISOString(),
  };
  store.set('faceProfiles', all);
  return true;
});

// Load all enrolled face profiles
ipcMain.handle('face:load-profiles', async () => {
  const store = await getFaceProfileStore();
  return store.get('faceProfiles', {});
});

// Delete a single face profile by email
ipcMain.handle('face:delete-profile', async (_event, email) => {
  const store = await getFaceProfileStore();
  const all = store.get('faceProfiles', {});
  delete all[email];
  store.set('faceProfiles', all);
  return true;
});

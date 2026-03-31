const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'UpRight',
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    icon: path.join(__dirname, 'public/icon.ico')
  });

  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function updateTrayMenu(isPaused) {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Upright', click: () => mainWindow.show() },
    { 
      label: 'Pause Monitoring', 
      type: 'checkbox', 
      checked: isPaused,
      click: () => {
        mainWindow.webContents.send('tray:toggle-monitoring');
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
  const iconPath = path.join(__dirname, 'public/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  updateTrayMenu(false);

  tray.setToolTip('Upright Posture Monitor');

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.on('ready', () => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('monitoring:status', (event, isPaused) => {
  if (tray) {
    updateTrayMenu(isPaused);
  }
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

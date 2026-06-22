import { app, BrowserWindow, Menu, shell, globalShortcut } from 'electron';
import * as path from 'path';

// The cashier terminal simply loads the s3vyaPOS web app, pointed at the POS.
// Configure the target with S3VYA_APP_URL (defaults to local dev server).
const APP_URL = process.env.S3VYA_APP_URL || 'http://localhost:3300';
const START_PATH = process.env.S3VYA_START_PATH || '/pos';

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 's3vyaPOS',
    backgroundColor: '#0f766e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL + START_PATH);

  // External links open in the system browser, not inside the terminal.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    win = null;
  });
}

// Minimal menu: reload, fullscreen, devtools, quit — geared for a kiosk terminal.
function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 's3vyaPOS',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  globalShortcut.register('F11', () => win?.setFullScreen(!win.isFullScreen()));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => globalShortcut.unregisterAll());

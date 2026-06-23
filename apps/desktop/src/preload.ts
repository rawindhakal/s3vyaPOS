import { contextBridge, ipcRenderer } from 'electron';

// Safe bridge for the web app: detect the desktop shell + drive native printers.
contextBridge.exposeInMainWorld('s3vyaDesktop', {
  isDesktop: true,
  cashier: true,
  platform: process.platform,
  version: process.versions.electron,
  getPrinters: (): Promise<{ name: string; displayName?: string; isDefault?: boolean }[]> =>
    ipcRenderer.invoke('get-printers'),
  printHtml: (html: string, deviceName?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('print-html', { html, deviceName }),
});

import { contextBridge } from 'electron';

// Expose a tiny, safe surface to the web app so it can detect the desktop shell.
contextBridge.exposeInMainWorld('s3vyaDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});

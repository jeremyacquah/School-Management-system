const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onTriggerSync: (callback) => ipcRenderer.on('trigger-sync', callback),
  platform: process.platform,
  isElectron: true
});

const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('yinglu', {
  listSources: () => ipcRenderer.invoke('sources:list'),
  chooseSource: (id, audio) => ipcRenderer.invoke('sources:choose', { id, audio }),
  saveRecording: (name, buffer) => ipcRenderer.invoke('recording:save', { name, buffer }),
  saveScreenshot: (name, dataUrl) => ipcRenderer.invoke('screenshot:save', { name, dataUrl }),
  chooseOutput: () => ipcRenderer.invoke('settings:choose-output'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  openFolder: () => ipcRenderer.invoke('output:open'),
  minimize: () => ipcRenderer.send('window:min'),
  maximize: () => ipcRenderer.send('window:max'),
  close: () => ipcRenderer.send('window:close')
});
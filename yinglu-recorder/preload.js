const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yinglu', {
  info: () => ipcRenderer.invoke('app:info'),
  listSources: () => ipcRenderer.invoke('sources:list'),
  chooseSource: (id, audio) => ipcRenderer.invoke('sources:choose', { id, audio }),
  saveRecording: (name, buffer) => ipcRenderer.invoke('recording:save', { name, buffer }),
  saveScreenshot: (name, dataUrl) => ipcRenderer.invoke('screenshot:save', { name, dataUrl }),
  chooseOutput: () => ipcRenderer.invoke('settings:choose-output'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (next) => ipcRenderer.invoke('settings:save', next),
  storage: () => ipcRenderer.invoke('system:storage'),
  openFolder: () => ipcRenderer.invoke('output:open'),
  listOutput: () => ipcRenderer.invoke('output:list'),
  openFile: (p) => ipcRenderer.invoke('file:open', p),
  showFile: (p) => ipcRenderer.invoke('file:show', p),
  deleteFile: (p) => ipcRenderer.invoke('file:delete', p),
  pin: (enabled) => ipcRenderer.invoke('window:pin', enabled),
  minimize: () => ipcRenderer.send('window:min'),
  maximize: () => ipcRenderer.send('window:max'),
  close: () => ipcRenderer.send('window:close'),
  onHotkey: (fn) => ipcRenderer.on('hotkey', (_, event) => fn(event))
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AmlakDesktop', {
  openCalculator: () => ipcRenderer.invoke('open-calculator')
});

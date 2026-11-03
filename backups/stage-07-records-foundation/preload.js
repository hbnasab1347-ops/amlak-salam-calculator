const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('AmlakDesktop', {
  openCalculator: () => ipcRenderer.invoke('open-calculator'),
  openRecordEntry: type => ipcRenderer.invoke('open-record-entry', type),
  saveDraft: input => ipcRenderer.invoke('records:save-draft', input),
  listDrafts: () => ipcRenderer.invoke('records:list-drafts'),
  getDraft: id => ipcRenderer.invoke('records:get-draft', id),
  deleteDraft: id => ipcRenderer.invoke('records:delete-draft', id),
  submitRecord: input => ipcRenderer.invoke('records:submit', input),
  listRecords: type => ipcRenderer.invoke('records:list', type),
  getDashboardStats: () => ipcRenderer.invoke('app:dashboard-stats')
});

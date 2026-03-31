const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
onToggleMonitoring: (callback) => {
ipcRenderer.on('tray:toggle-monitoring', callback);
return () => ipcRenderer.removeListener('tray:toggle-monitoring', callback);
},
// Navigate event
onNavigate: (callback) => {
ipcRenderer.on('navigate', callback);
return () => ipcRenderer.removeListener('navigate', callback);
},
// Monitoring status
sendMonitoringStatus: (isPaused) => {
ipcRenderer.send('monitoring:status', isPaused);
},
// Window minimize 
minimizeWindow: () => {
ipcRenderer.send('window:minimize');
},
});

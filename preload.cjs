const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
// Tray থেকে monitoring toggle
onToggleMonitoring: (callback) => {
ipcRenderer.on('tray:toggle-monitoring', callback);
return () => ipcRenderer.removeListener('tray:toggle-monitoring', callback);
},
// Navigate event
onNavigate: (callback) => {
ipcRenderer.on('navigate', callback);
return () => ipcRenderer.removeListener('navigate', callback);
},
// Monitoring status পাঠানো
sendMonitoringStatus: (isPaused) => {
ipcRenderer.send('monitoring:status', isPaused);
},
// Window minimize (tray এ hide)
minimizeWindow: () => {
ipcRenderer.send('window:minimize');
},
});

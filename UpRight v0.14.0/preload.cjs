const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Listen for monitoring toggle events from the system tray */
  onToggleMonitoring: (callback) => {
    ipcRenderer.on('tray:toggle-monitoring', callback);
    return () => ipcRenderer.removeListener('tray:toggle-monitoring', callback);
  },
  /** Listen for navigation events from the system tray */
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', callback);
    return () => ipcRenderer.removeListener('navigate', callback);
  },
  /** Send monitoring status to the main process */
  sendMonitoringStatus: (isPaused) => {
    ipcRenderer.send('monitoring:status', isPaused);
  },
  /** Minimize window to taskbar */
  minimizeWindow: () => {
    ipcRenderer.send('window:minimize');
  },
  /** Hide window to system tray (offscreen) */
  hideToTray: () => {
    ipcRenderer.send('window:hide-to-tray');
  },
  /** Listen for window visibility changes (e.g. sent to tray) */
  onWindowVisibilityChanged: (callback) => {
    const handler = (_event, isOffscreen) => callback(isOffscreen);
    ipcRenderer.on('window:visibility-changed', handler);
    return () => ipcRenderer.removeListener('window:visibility-changed', handler);
  },
  
  
  /** Send current full state to the overlay window */
  updateOverlayState: (state) => {
    ipcRenderer.send('overlay:update-state', state);
  },
  
  /** Listen for state updates from the main window */
  onOverlayStateUpdated: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('overlay:state-updated', handler);
    return () => ipcRenderer.removeListener('overlay:state-updated', handler);
  },
  
  /** Toggle whether the overlay ignores mouse events (for click-through) */
  setIgnoreMouseEvents: (ignore) => {
    ipcRenderer.send('overlay:set-ignore-mouse-events', ignore);
  },
  
  /** Send an action from the overlay (e.g., snooze, menu click) back to main */
  sendOverlayAction: (action, payload) => {
    ipcRenderer.send('overlay:action', action, payload);
  },
  
  /** Main window listens for actions from the overlay */
  onOverlayActionReceived: (callback) => {
    const handler = (_event, action, payload) => callback(action, payload);
    ipcRenderer.on('overlay:action-received', handler);
    return () => ipcRenderer.removeListener('overlay:action-received', handler);
  },
  /** Send run-in-background preference to main process */
  sendRunInBackground: (enabled) => {
    ipcRenderer.send('settings:run-in-background', enabled);
  },
  /** Listen for bubble visibility toggle from system tray */
  onToggleBubble: (callback) => {
    ipcRenderer.on('tray:toggle-bubble', callback);
    return () => ipcRenderer.removeListener('tray:toggle-bubble', callback);
  },
  /** Send bubble visibility status to main process */
  sendBubbleStatus: (visible) => {
    ipcRenderer.send('bubble:status', visible);
  },
  /** Quit the application */
  quitApp: () => {
    ipcRenderer.send('app:quit');
  },
  /** Listen for system idle state changes from the main process */
  onIdleState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('idle:state', handler);
    return () => ipcRenderer.removeListener('idle:state', handler);
  },

  faceProfiles: {
    /** Save or overwrite a face embedding for the given email */
    save: (email, name, embedding) =>
      ipcRenderer.invoke('face:save-profile', email, name, embedding),
    /** Load all enrolled face profiles ({ [email]: { name, embedding, enrolledAt } }) */
    loadAll: () => ipcRenderer.invoke('face:load-profiles'),
    /** Delete a face profile by email */
    delete: (email) => ipcRenderer.invoke('face:delete-profile', email),
  },

  saveUserSnapshot: (email, base64Data) => 
    ipcRenderer.invoke('save-user-snapshot', email, base64Data),
});

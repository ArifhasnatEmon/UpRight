// API declarations
interface ElectronAPI {
  /** Listen for monitoring toggle events from the system tray */
  onToggleMonitoring: (callback: () => void) => () => void;
  /** Listen for navigation events from the system tray */
  onNavigate: (callback: (event: unknown, page: string) => void) => () => void;
  /** Send current monitoring status to the main process */
  sendMonitoringStatus: (isPaused: boolean) => void;
  /** Minimize window to taskbar */
  minimizeWindow: () => void;
  /** Hide window to system tray (offscreen) */
  hideToTray: () => void;
  /** Listen for window visibility changes (e.g. sent to tray) */
  onWindowVisibilityChanged?: (callback: (isOffscreen: boolean) => void) => () => void;
  // Overlay API
  /** Send current full state to the overlay window */
  updateOverlayState: (state: any) => void;
  /** Listen for state updates from the main window */
  onOverlayStateUpdated: (callback: (state: any) => void) => () => void;
  /** Toggle whether the overlay ignores mouse events (for click-through) */
  setIgnoreMouseEvents: (ignore: boolean) => void;
  /** Send an action from the overlay (e.g., snooze, menu click) back to main */
  sendOverlayAction: (action: string, payload?: any) => void;
  /** Main window listens for actions from the overlay */
  onOverlayActionReceived: (callback: (action: string, payload?: any) => void) => () => void;
  /** Send run-in-background preference to main process */
  sendRunInBackground: (enabled: boolean) => void;
  /** Listen for bubble visibility toggle from system tray */
  onToggleBubble?: (callback: () => void) => () => void;
  /** Send bubble visibility status to main process */
  sendBubbleStatus?: (visible: boolean) => void;
  /** Quit the application */
  quitApp: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

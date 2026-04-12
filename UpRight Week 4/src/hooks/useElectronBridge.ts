import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { AppSettings } from '../types';

interface ElectronBridgeOptions {
  isMonitoring: boolean;
  setIsMonitoring: Dispatch<SetStateAction<boolean>>;
  setActiveTab: (tab: string) => void;
  runInBackground: boolean;
  showBubble: boolean;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
}

// Electron bridge
export const useElectronBridge = ({ isMonitoring, setIsMonitoring, setActiveTab, runInBackground, showBubble, setSettings }: ElectronBridgeOptions) => {
  // Setup listeners
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const removeToggle = api.onToggleMonitoring(() => {
      setIsMonitoring(prev => !prev);
    });

    const removeNavigate = api.onNavigate((_event: unknown, page: string) => {
      if (page === 'settings') {
        setActiveTab('settings');
      }
    });

    const removeBubbleToggle = api.onToggleBubble?.(() => {
      setSettings(s => ({ ...s, showBubble: !s.showBubble }));
    });

    return () => {
      removeToggle?.();
      removeNavigate?.();
      removeBubbleToggle?.();
    };
  }, [setIsMonitoring, setActiveTab, setSettings]);

  // Sync monitoring status
  useEffect(() => {
    window.electronAPI?.sendMonitoringStatus(!isMonitoring);
  }, [isMonitoring]);

  // Sync run-in-background
  useEffect(() => {
    window.electronAPI?.sendRunInBackground(runInBackground);
  }, [runInBackground]);

  // Sync bubble visibility
  useEffect(() => {
    window.electronAPI?.sendBubbleStatus?.(showBubble);
  }, [showBubble]);
};

import { useEffect } from 'react';

export function useElectronIPC(
  setIsMonitoring: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveTab: (tab: 'dashboard' | 'analytics' | 'settings' | 'profile') => void,
  isMonitoring: boolean,
) {
  useEffect(() => {
    // @ts-ignore
    const api = window.electronAPI;
    if (!api) return;

    const removeToggle = api.onToggleMonitoring(() => {
      setIsMonitoring(prev => !prev);
    });

    const removeNavigate = api.onNavigate((_: any, page: string) => {
      if (page === 'settings') {
        setActiveTab('settings');
      }
    });

    return () => {
      removeToggle?.();
      removeNavigate?.();
    };
  }, []);

  useEffect(() => {
    // @ts-ignore
    window.electronAPI?.sendMonitoringStatus(!isMonitoring);
  }, [isMonitoring]);
}

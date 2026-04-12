import { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '../types';
import { storageKeys, getJSON, setJSON } from '../lib/storage';

const DEFAULT_SETTINGS: AppSettings = {
  runInBackground: true,
  enableFloatingAlerts: true,
  showBubble: true,
  alertPosition: 'top',
  postureSensitivity: 5,
  frameRate: 30,
  lowResourceMode: false,
  anonymousDataSharing: false,
  localStorageOnly: false,
  reminders: {
    posture: true,
    sitting: true,
    eyeStrain: true,
    water: true,
    sittingInterval: 60,
    eyeStrainInterval: 20,
    waterInterval: 90,
  },
  quietHours: {
    enabled: false,
    startHour: 22,
    endHour: 7,
  },
  theme: 'system',
  soundEnabled: true,
  soundVolume: 0.5,
  soundPreset: 'default',
};

// Settings hook
export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = getJSON<Partial<AppSettings>>(storageKeys.settings, {});
    return { ...DEFAULT_SETTINGS, ...saved };
  });

  const isInitialMount = useRef(true);

  // Auto save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setJSON(storageKeys.settings, settings);
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings]);

  const saveSettings = useCallback(() => {
    setJSON(storageKeys.settings, settings);
  }, [settings]);

  return { settings, setSettings, saveSettings };
};

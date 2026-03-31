import { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaults';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('upright_settings');
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  // Auto-save settings with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('upright_settings', JSON.stringify(settings));
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSaveSettings = () => {
    localStorage.setItem('upright_settings', JSON.stringify(settings));
    setToastMessage('✅ Settings saved successfully!');
  };

  return { settings, setSettings, toastMessage, setToastMessage, handleSaveSettings };
}

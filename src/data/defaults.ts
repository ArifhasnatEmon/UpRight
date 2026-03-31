import { AppSettings, UserProfile } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  runInBackground: true,
  enableFloatingAlerts: true,
  alertPosition: 'top',
  alertOpacity: 0.9,
  snoozeDuration: 10,
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
};

export const DEFAULT_USER: UserProfile = {
  name: 'Guest User',
  level: 1,
  xp: 0,
  achievements: [],
};

// Static mock timer values for demo
export const MOCK_TIMERS = {
  sittingTime: 34,
  waterTime: 56,
  eyeTime: 14,
} as const;

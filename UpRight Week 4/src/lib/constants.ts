import type { AlertPosition, Achievement } from '../types';
import {
  DEFAULT_TIMING,
  INTERNAL_TIMING,
  XP_LEVEL_THRESHOLDS,
  XP_PER_LEVEL_ABOVE_5,
} from './config';

// Level tracking
export const getLevelFromXp = (xp: number): number => {
  // Check thresholds
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 1; i--) {
    if (xp >= XP_LEVEL_THRESHOLDS[i]) {
      if (i < XP_LEVEL_THRESHOLDS.length - 1) return i;
      // Dynamic threshold
      return i + Math.floor((xp - XP_LEVEL_THRESHOLDS[i]) / XP_PER_LEVEL_ABOVE_5);
    }
  }
  return 1;
};

export const getThresholdForLevel = (level: number): number => {
  if (level < XP_LEVEL_THRESHOLDS.length) return XP_LEVEL_THRESHOLDS[level];
  return XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 1] + (level - (XP_LEVEL_THRESHOLDS.length - 1)) * XP_PER_LEVEL_ABOVE_5;
};

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_log', title: 'First Step', description: 'Save your first posture log', icon: '🎯' },
  { id: 'perfect_10', title: 'Perfect Ten', description: '10 consecutive good posture logs', icon: '💎' },
  { id: 'century', title: 'Century', description: 'Save 100 total logs', icon: '🏆' },
  { id: 'hydrated', title: 'Hydration Hero', description: 'Reset water timer 5 times', icon: '💧' },
  { id: 'early_bird', title: 'Early Bird', description: 'Use the app before 8 AM', icon: '🌅' },
  { id: 'night_owl', title: 'Night Owl', description: 'Use the app after 10 PM', icon: '🦉' },
  { id: 'break_champion', title: 'Break Champion', description: 'Take 10 health breaks', icon: '🧘' },
  { id: 'streak_3', title: 'On a Roll', description: 'Use the app 3 days in a row', icon: '🔥' },
  { id: 'posture_pro', title: 'Posture Pro', description: 'Maintain average score above 85', icon: '⭐' },
  { id: 'eyes_saver', title: 'Eyes Saver', description: 'Complete 5 eye strain breaks', icon: '👁️' },
];

// Timing config
export const TIMING = {
  LOG_THROTTLE: INTERNAL_TIMING.LOG_THROTTLE,
  COOLDOWN_PERIOD: DEFAULT_TIMING.COOLDOWN_PERIOD,
  PERSISTENCE_THRESHOLD: DEFAULT_TIMING.PERSISTENCE_THRESHOLD,
  WARNING_PERSISTENCE_THRESHOLD: DEFAULT_TIMING.WARNING_PERSISTENCE_THRESHOLD,
  GOOD_POSTURE_XP_INTERVAL: INTERNAL_TIMING.GOOD_POSTURE_XP_INTERVAL,
} as const;

// Position CSS
export const getAlertPositionClasses = (position: AlertPosition): string => {
  const base = 'fixed z-[9998] w-full max-w-sm';
  switch (position) {
    case 'top':          return `${base} top-8 left-1/2 -translate-x-1/2`;
    case 'bottom':       return `${base} bottom-8 left-1/2 -translate-x-1/2`;
    case 'top-right':    return `${base} top-8 right-8`;
    case 'top-left':     return `${base} top-8 left-8`;
    case 'bottom-right': return `${base} bottom-8 right-8`;
    case 'bottom-left':  return `${base} bottom-8 left-8`;
    default:             return `${base} bottom-8 left-1/2 -translate-x-1/2`;
  }
};

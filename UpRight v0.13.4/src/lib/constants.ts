import type { AlertPosition, Achievement } from '../types';
import {
  DEFAULT_TIMING,
  INTERNAL_TIMING,
  XP_LEVEL_THRESHOLDS,
  XP_PER_LEVEL_ABOVE_5,
} from './config';
import {
  EMOJI_TARGET, EMOJI_GEM, EMOJI_TROPHY, EMOJI_DROPLET, EMOJI_SUNRISE,
  EMOJI_OWL, EMOJI_MEDITATION, EMOJI_FIRE, EMOJI_STAR, EMOJI_EYE,
  EMOJI_RUNNER, EMOJI_LIGHTNING, EMOJI_CROWN, EMOJI_CHART, EMOJI_WAVE,
  EMOJI_SPARKLES, EMOJI_MOON, EMOJI_MUSCLE,
} from './emoji';

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
  { id: 'first_log', title: 'First Step', description: 'Save your first posture log', icon: EMOJI_TARGET },
  { id: 'perfect_10', title: 'Perfect Ten', description: '10 consecutive good posture logs', icon: EMOJI_GEM },
  { id: 'century', title: 'Century', description: 'Save 100 total logs', icon: EMOJI_TROPHY },
  { id: 'hydrated', title: 'Hydration Hero', description: 'Reset water timer 5 times', icon: EMOJI_DROPLET },
  { id: 'early_bird', title: 'Early Bird', description: 'Use the app before 8 AM', icon: EMOJI_SUNRISE },
  { id: 'night_owl', title: 'Night Owl', description: 'Use the app after 10 PM', icon: EMOJI_OWL },
  { id: 'break_champion', title: 'Break Champion', description: 'Take 10 health breaks', icon: EMOJI_MEDITATION },
  { id: 'streak_3', title: 'On a Roll', description: 'Use the app 3 days in a row', icon: EMOJI_FIRE },
  { id: 'posture_pro', title: 'Posture Pro', description: 'Maintain average score above 85', icon: EMOJI_STAR },
  { id: 'eyes_saver', title: 'Eyes Saver', description: 'Complete 5 eye strain breaks', icon: EMOJI_EYE },
  // Long-term engagement
  { id: 'marathon', title: 'Marathon Monitor', description: 'Monitor posture for 8+ hours total', icon: EMOJI_RUNNER },
  { id: 'streak_7', title: 'Week Warrior', description: 'Use the app 7 days in a row', icon: EMOJI_LIGHTNING },
  { id: 'streak_30', title: 'Monthly Master', description: 'Use the app 30 days in a row', icon: EMOJI_CROWN },
  { id: 'thousand', title: 'Data Driven', description: 'Save 1,000 total posture logs', icon: EMOJI_CHART },
  { id: 'hydration_pro', title: 'Hydration Pro', description: 'Complete 50 water breaks', icon: EMOJI_WAVE },
  { id: 'perfect_hour', title: 'Golden Hour', description: 'Maintain 90%+ score for 1 full hour', icon: EMOJI_SPARKLES },
  { id: 'night_shift', title: 'Night Shift', description: 'Monitor past midnight', icon: EMOJI_MOON },
  { id: 'comeback', title: 'Comeback King', description: 'Improve from critical to good in under 30 seconds', icon: EMOJI_MUSCLE },
];

// Timing config
export const TIMING = {
  LOG_THROTTLE: INTERNAL_TIMING.LOG_THROTTLE,
  COOLDOWN_PERIOD: DEFAULT_TIMING.COOLDOWN_PERIOD,
  PERSISTENCE_THRESHOLD: DEFAULT_TIMING.PERSISTENCE_THRESHOLD,
  WARNING_PERSISTENCE_THRESHOLD: DEFAULT_TIMING.WARNING_PERSISTENCE_THRESHOLD,
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

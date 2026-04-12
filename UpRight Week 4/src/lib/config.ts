// Global config
export const POSTURE_THRESHOLDS = {
  /** Eye distance above this → too close to screen */
  EYE_TOO_CLOSE: 0.30,
  /** Eye distance above this → warning close */
  EYE_WARNING_CLOSE: 0.20,
  /** Eye distance below this → too far away */
  EYE_TOO_FAR: 0.05,
  /** Pitch diff below this → looking up (neck extension) */
  NECK_LOOKING_UP: -0.25,
  /** Pitch diff above this → looking down (neck flexion) */
  NECK_LOOKING_DOWN: 0.35,
  /** Rotation diff above this → neck rotated left/right */
  NECK_ROTATED: 0.15,
} as const;

/**
 * Converts postureSensitivity (1–10 scale) → threshold multiplier.
 * Higher sensitivity = tighter (smaller) thresholds.
 * - 1–3 (Relaxed): multiply thresholds by 1.3 (looser)
 * - 4–6 (Normal): use defaults (1.0)
 * - 7–10 (Strict): multiply thresholds by 0.7 (tighter)
 */
export function getSensitivityMultiplier(sensitivity: number): number {
  if (sensitivity <= 3) return 1.3;
  if (sensitivity <= 6) return 1.0;
  return 0.7;
}

// Timing constants
// User timings
export const DEFAULT_TIMING = {
  /** Minimum time between posture alerts (ms) — maps to settings.alertCooldownMinutes */
  COOLDOWN_PERIOD: 2 * 60 * 1000,
  /** Bad posture must persist for this long before triggering critical alert (ms) */
  PERSISTENCE_THRESHOLD: 2.5 * 1000,
  /** Bad posture must persist for this long before triggering warning alert (ms) */
  WARNING_PERSISTENCE_THRESHOLD: 5 * 1000,
} as const;

// Internal timings
export const INTERNAL_TIMING = {
  /** Max one posture log per this interval (ms) */
  LOG_THROTTLE: 30 * 1000,
  /** XP reward interval for good posture (ms) */
  GOOD_POSTURE_XP_INTERVAL: 2 * 60 * 1000,
} as const;

// MediaPipe config
export const MEDIAPIPE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/';

// Gemini model
export const GEMINI_MODEL_ID = 'gemini-2.0-flash';


// Level thresholds
/** XP required to reach each level (index = level number) */
export const XP_LEVEL_THRESHOLDS = [0, 0, 100, 250, 500, 1000] as const;
/** XP increment per level above level 5 */
export const XP_PER_LEVEL_ABOVE_5 = 750;

import { NormalizedLandmark } from '@mediapipe/pose';
import { POSTURE_THRESHOLDS } from '../config';

/**
 * Zone-based neck pitch classification.
 * 
 * Based on ergonomic research mapping head angle zones:
 *   92°–110° (neutral)     → Safe zone, no penalty
 *   80°–91°  (micro-adjust) → Small deviation, minor penalty
 *   <80°     (slouching)    → Forward slouch / tech neck, heavy penalty
 *   >110°    (hyperextension) → Leaning back too far, heavy penalty
 * 
 * Since a front-facing camera can't measure true degrees, we use
 * pitchDiff (nose.y - earMidY) as a proxy, with calibration baseline
 * representing the "neutral 90°" reference point.
 */
export type PitchZone = 'safe' | 'micro_forward' | 'slouching' | 'micro_backward' | 'hyperextension';

export interface PitchZoneResult {
  pitchDiff: number;
  zone: PitchZone;
  penalty: number;
}

// Zone margins (applied relative to calibrated baseline pitchDiff)
const PITCH_ZONES = {
  /** Safe zone: baseline ± this margin (normal micro-movements like typing) */
  SAFE_MARGIN: 0.08,
  /** Micro-adjusting: between safe margin and this value */
  MODERATE_MARGIN: 0.16,
  // Beyond MODERATE_MARGIN = slouching (forward) or hyperextension (backward)
} as const;

// Penalties per zone
const ZONE_PENALTIES = {
  safe: 0,
  micro_forward: -10,
  slouching: -50,
  micro_backward: -10,
  hyperextension: -50,
} as const;

/**
 * Classify head pitch into ergonomic zones.
 * Uses calibrated baseline as the "neutral" reference.
 * Falls back to default baseline when no calibration exists.
 */
export function classifyNeckPitch(
  nose: NormalizedLandmark,
  leftEar: NormalizedLandmark,
  rightEar: NormalizedLandmark,
  sensitivityMultiplier: number = 1.0,
  baselinePitchDiff: number = 0.05 // Default neutral pitchDiff when uncalibrated
): PitchZoneResult {
  const earMidY = (leftEar.y + rightEar.y) / 2;
  const pitchDiff = nose.y - earMidY;

  // How far has the pitch deviated from the calibrated neutral?
  const deviation = pitchDiff - baselinePitchDiff;

  // Apply sensitivity: stricter = smaller margins, more sensitive to deviation
  const safeMargin = PITCH_ZONES.SAFE_MARGIN * sensitivityMultiplier;
  const moderateMargin = PITCH_ZONES.MODERATE_MARGIN * sensitivityMultiplier;

  let zone: PitchZone;
  if (deviation >= 0) {
    // Forward tilt (nose dropping below ears relative to baseline)
    if (deviation <= safeMargin) {
      zone = 'safe';
    } else if (deviation <= moderateMargin) {
      zone = 'micro_forward';
    } else {
      zone = 'slouching';
    }
  } else {
    // Backward tilt (nose rising above ears relative to baseline)
    const absDeviation = Math.abs(deviation);
    if (absDeviation <= safeMargin) {
      zone = 'safe';
    } else if (absDeviation <= moderateMargin) {
      zone = 'micro_backward';
    } else {
      zone = 'hyperextension';
    }
  }

  return {
    pitchDiff,
    zone,
    penalty: ZONE_PENALTIES[zone],
  };
}

// ── Neck rotation (unchanged) ──

interface NeckThresholds {
  lookingUp: number;
  lookingDown: number;
  rotated: number;
}

const DEFAULT_NECK_THRESHOLDS: NeckThresholds = {
  lookingUp: POSTURE_THRESHOLDS.NECK_LOOKING_UP,
  lookingDown: POSTURE_THRESHOLDS.NECK_LOOKING_DOWN,
  rotated: POSTURE_THRESHOLDS.NECK_ROTATED,
};

export const checkNeckRotation = (
  nose: NormalizedLandmark,
  leftEar: NormalizedLandmark,
  rightEar: NormalizedLandmark,
  sensitivityMultiplier: number = 1.0,
  thresholds: NeckThresholds = DEFAULT_NECK_THRESHOLDS
) => {
  const earMidX = (leftEar.x + rightEar.x) / 2;
  const rotationDiff = Math.abs(nose.x - earMidX);

  // Apply sensitivity
  const adjustedRotated = thresholds.rotated * sensitivityMultiplier;

  return {
    rotationDiff,
    isRotated: rotationDiff > adjustedRotated,
  };
};

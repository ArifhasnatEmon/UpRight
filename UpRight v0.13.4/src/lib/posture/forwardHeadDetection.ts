/**
 * Forward Head Detection Module
 * 
 * Detects forward head posture ("tech neck") using 4 independent face-geometry
 * metrics that work WITHOUT shoulder landmarks. Each metric analyzes a different
 * aspect of how the face geometry changes when the head moves forward.
 * 
 * MediaPipe Pose landmarks used:
 *  0: nose        2: left eye     5: right eye
 *  7: left ear    8: right ear    9: mouth left   10: mouth right
 *  Each has: x, y (normalized 0–1), z (depth relative to hips), visibility (0–1)
 */

import { NormalizedLandmark } from '@mediapipe/pose';
import { CalibrationData } from '../../types';

export interface ForwardHeadResult {
  /** Total penalty from all forward head metrics (0 to -100) */
  penalty: number;
  /** Per-metric details for debugging */
  metrics: {
    faceScale: { ratio: number; penalty: number };
    earEyeRatio: { ratio: number; penalty: number };
    zDepth: { shift: number; penalty: number };
    faceGeometry: { ratio: number; penalty: number };
  };
}

/**
 * Compute the ear horizontal span / eye horizontal span ratio.
 * When head tilts forward, ears rotate behind the face plane → ratio decreases.
 */
function computeEarEyeSpanRatio(
  leftEye: NormalizedLandmark,
  rightEye: NormalizedLandmark,
  leftEar: NormalizedLandmark,
  rightEar: NormalizedLandmark
): number {
  const eyeSpan = Math.abs(leftEye.x - rightEye.x);
  const earSpan = Math.abs(leftEar.x - rightEar.x);
  if (eyeSpan < 0.001) return 0; // Avoid division by zero
  return earSpan / eyeSpan;
}

/**
 * Compute the nose-to-ear z-depth difference.
 * When head juts forward, nose z becomes more negative (closer to camera)
 * relative to ears.
 */
function computeNoseEarZDiff(
  nose: NormalizedLandmark,
  leftEar: NormalizedLandmark,
  rightEar: NormalizedLandmark
): number {
  const earMidZ = (leftEar.z + rightEar.z) / 2;
  return nose.z - earMidZ;
}

/**
 * Compute face vertical ratio: (mouthMidY - eyeMidY) / eyeDistance.
 * When head tilts forward, perspective distortion changes this ratio.
 */
function computeFaceVerticalRatio(
  leftEye: NormalizedLandmark,
  rightEye: NormalizedLandmark,
  mouthLeft: NormalizedLandmark,
  mouthRight: NormalizedLandmark
): number {
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const mouthMidY = (mouthLeft.y + mouthRight.y) / 2;
  const eyeDistance = Math.sqrt(
    Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
  );
  if (eyeDistance < 0.001) return 0;
  return (mouthMidY - eyeMidY) / eyeDistance;
}

/**
 * Compute current eye distance (face scale indicator).
 */
function computeEyeDistance(
  leftEye: NormalizedLandmark,
  rightEye: NormalizedLandmark
): number {
  return Math.sqrt(
    Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
  );
}

/**
 * Calculate penalty for a ratio that deviates from baseline.
 * direction: 'increase' means values above baseline are bad,
 *            'decrease' means values below baseline are bad.
 */
function ratioDeviation(
  current: number,
  baseline: number,
  warningPct: number,
  criticalPct: number,
  maxPenalty: number,
  direction: 'increase' | 'decrease'
): number {
  if (baseline === 0) return 0;
  const ratio = current / baseline;

  let deviation: number;
  if (direction === 'increase') {
    // Bad when current > baseline (ratio > 1)
    deviation = ratio - 1.0;
  } else {
    // Bad when current < baseline (ratio < 1)
    deviation = 1.0 - ratio;
  }

  if (deviation <= 0) return 0; // No penalty — within or better than baseline

  if (deviation >= criticalPct) return -maxPenalty;
  if (deviation >= warningPct) {
    // Linear interpolation between warning and critical
    const progress = (deviation - warningPct) / (criticalPct - warningPct);
    const warningPenalty = maxPenalty * 0.5;
    return -(warningPenalty + progress * (maxPenalty - warningPenalty));
  }
  return 0;
}

/**
 * Calculate penalty for an absolute shift from baseline.
 */
function absoluteDeviation(
  current: number,
  baseline: number,
  warningThreshold: number,
  criticalThreshold: number,
  maxPenalty: number
): number {
  const shift = Math.abs(current - baseline);
  if (shift >= criticalThreshold) return -maxPenalty;
  if (shift >= warningThreshold) {
    const progress = (shift - warningThreshold) / (criticalThreshold - warningThreshold);
    const warningPenalty = maxPenalty * 0.5;
    return -(warningPenalty + progress * (maxPenalty - warningPenalty));
  }
  return 0;
}

/**
 * Main forward head detection function.
 * Analyzes 4 face-geometry metrics to detect forward head posture.
 * Works entirely with face landmarks (0-10) — no shoulders needed.
 */
export function checkForwardHead(
  landmarks: NormalizedLandmark[],
  calibration: CalibrationData,
  sensitivityMultiplier: number = 1.0
): ForwardHeadResult {
  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const mouthLeft = landmarks[9];
  const mouthRight = landmarks[10];

  const { baseline } = calibration;

  // Skip forward head detection if baselines are not properly calibrated
  // (old calibration data migrated with zeros)
  const NO_PENALTY: ForwardHeadResult = {
    penalty: 0,
    metrics: {
      faceScale: { ratio: 1, penalty: 0 },
      earEyeRatio: { ratio: 0, penalty: 0 },
      zDepth: { shift: 0, penalty: 0 },
      faceGeometry: { ratio: 0, penalty: 0 },
    },
  };

  if (
    baseline.earEyeSpanRatio === 0 ||
    baseline.faceVerticalRatio === 0 ||
    baseline.eyeDistance === 0
  ) {
    return NO_PENALTY;
  }

  // When head moves forward → face gets larger → eye distance increases
  const currentEyeDistance = computeEyeDistance(leftEye, rightEye);
  const faceScaleRatio = baseline.eyeDistance > 0 ? currentEyeDistance / baseline.eyeDistance : 1.0;
  // Warning at 12% increase, critical at 22% increase
  // Apply inverse sensitivity: stricter sensitivity = smaller thresholds
  const faceScalePenalty = ratioDeviation(
    currentEyeDistance, baseline.eyeDistance,
    0.12 * sensitivityMultiplier, 0.22 * sensitivityMultiplier,
    30, 'increase'
  );

  // When head tilts forward → ears rotate behind face → earSpan/eyeSpan decreases
  const currentEarEyeRatio = computeEarEyeSpanRatio(leftEye, rightEye, leftEar, rightEar);
  // Warning at 15% decrease, critical at 30% decrease from baseline
  const earEyePenalty = ratioDeviation(
    currentEarEyeRatio, baseline.earEyeSpanRatio,
    0.15 * sensitivityMultiplier, 0.30 * sensitivityMultiplier,
    35, 'decrease'
  );

  // When head juts forward → nose z becomes more negative relative to ears
  const currentNoseEarZ = computeNoseEarZDiff(nose, leftEar, rightEar);
  // Z is noisy from monocular camera, so use lower weight
  // Warning at 0.12 shift, critical at 0.22 shift
  const zDepthPenalty = absoluteDeviation(
    currentNoseEarZ, baseline.noseEarZDiff,
    0.12 * sensitivityMultiplier, 0.22 * sensitivityMultiplier,
    15
  );

  // When head tilts forward → perspective changes face proportions
  const currentFaceVertical = computeFaceVerticalRatio(leftEye, rightEye, mouthLeft, mouthRight);
  // Warning at 15% increase, critical at 30% increase
  const faceGeometryPenalty = ratioDeviation(
    currentFaceVertical, baseline.faceVerticalRatio,
    0.15 * sensitivityMultiplier, 0.30 * sensitivityMultiplier,
    20, 'increase'
  );

  const totalPenalty = faceScalePenalty + earEyePenalty + zDepthPenalty + faceGeometryPenalty;

  return {
    penalty: Math.max(-100, totalPenalty),
    metrics: {
      faceScale: { ratio: faceScaleRatio, penalty: faceScalePenalty },
      earEyeRatio: { ratio: currentEarEyeRatio, penalty: earEyePenalty },
      zDepth: { shift: currentNoseEarZ, penalty: zDepthPenalty },
      faceGeometry: { ratio: currentFaceVertical, penalty: faceGeometryPenalty },
    },
  };
}

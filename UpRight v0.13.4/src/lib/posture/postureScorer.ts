// Posture scorer
import { NormalizedLandmark } from '@mediapipe/pose';
import { PostureState } from '../../types';
import { checkEyeDistance } from './eyeTracking';
import { checkNeckPitch, checkNeckRotation } from './neckTracking';
import { checkForwardHead } from './forwardHeadDetection';
import { getSensitivityMultiplier } from '../config';
import { getPersonalThresholds } from './calibration';
import { CalibrationData } from '../../types';

export interface PostureResult {
  state: PostureState;
  score: number;
}

/**
 * Minimum visibility + position checks for shoulder landmarks.
 * Shoulders must be:
 *  - visibility > 0.7 (high confidence, not just edge-of-frame guesses)
 *  - y < 0.92 (not pushed to the very bottom of frame — common with laptop cameras)
 * This prevents unreliable neckLength calculations when the camera doesn't
 * capture the full upper body (laptop cams, tilted angles, etc.)
 */
function areShouldersReliable(left: NormalizedLandmark, right: NormalizedLandmark): boolean {
  if (!left.visibility || !right.visibility) return false;
  if (left.visibility < 0.7 || right.visibility < 0.7) return false;
  // Shoulders at the very bottom of the frame produce unreliable coordinates
  if (left.y > 0.92 || right.y > 0.92) return false;
  return true;
}

// Calculate posture
export function scorePosture(
  landmarks: NormalizedLandmark[],
  postureSensitivity: number,
  calibration?: CalibrationData | null
): PostureResult {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];

  const sensitivityMultiplier = getSensitivityMultiplier(postureSensitivity);

  let score = 100;
  let state: PostureState = 'good';

  const faceVisible = nose.visibility && leftEye.visibility && rightEye.visibility &&
                      nose.visibility > 0.5 && leftEye.visibility > 0.5 && rightEye.visibility > 0.5;

  if (!faceVisible) {
    score -= 60;
  } else {
    // Eye distance
    const eyeThresholds = calibration ? getPersonalThresholds(calibration).eye : undefined;
    const eyeTracking = checkEyeDistance(leftEye, rightEye, sensitivityMultiplier, eyeThresholds);
    
    if (eyeTracking.isTooFar) {
      state = 'disabled';
    } else if (eyeTracking.isTooClose) {
      score -= 60;
      state = 'too_close';
    } else if (eyeTracking.isWarningClose) {
      score -= 30;
    }
  }

  // Validate check
  if (state !== 'disabled' && faceVisible) {
    const personalThresholds = calibration ? getPersonalThresholds(calibration) : null;
    
    // Head pitch
    const neckPitch = checkNeckPitch(nose, leftEar, rightEar, sensitivityMultiplier, personalThresholds?.neck);
    if (neckPitch.isLookingUp) {
      score -= 40; // Neck extension
    } else if (neckPitch.isLookingDown) {
      score -= 40; // Neck flexion
    }

    // Head rotation
    const neckRotation = checkNeckRotation(nose, leftEar, rightEar, sensitivityMultiplier, personalThresholds?.neck);
    if (neckRotation.isRotated) {
      score -= 40; // Neck rotation
    }

    // Head tilt
    const headTilt = Math.abs(leftEye.y - rightEye.y);
    const tiltWarning = personalThresholds?.headTilt?.warning || 0.06;
    const tiltCritical = personalThresholds?.headTilt?.critical || 0.12;
    
    if (headTilt > tiltCritical) score -= 60;
    else if (headTilt > tiltWarning) score -= 30;

    // Uses 4 face-geometry metrics: face scale, ear/eye ratio, z-depth, face geometry
    // This is the primary detection for "tech neck" / forward head posture
    if (calibration && state !== 'too_close') {
      const forwardHead = checkForwardHead(landmarks, calibration, sensitivityMultiplier);
      score += forwardHead.penalty; // penalty is negative
    }

    // Shoulder checks — only when shoulders are reliably in-frame
    // This is the universal fix: on laptops where the camera can't see shoulders
    // (or they're at the very bottom edge), we skip unreliable shoulder data
    // and rely purely on face-based posture analysis (eyes, nose, ears)
    const shouldersVisible = areShouldersReliable(leftShoulder, rightShoulder);

    if (shouldersVisible) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderDiff > 0.18) score -= 30;

      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      const neckLength = shoulderMidY - nose.y;
      
      const tlCritical = personalThresholds?.neckLength?.tooLongCritical || 0.50;
      const tsWarning = personalThresholds?.neckLength?.tooShortWarning || 0.10;
      const tsCritical = personalThresholds?.neckLength?.tooShortCritical || 0.05;
      
      if (neckLength < tsCritical) score -= 60;
      else if (neckLength < tsWarning) score -= 30;
      
      if (neckLength > tlCritical) score -= 40;
    }
  }

  if (state !== 'too_close' && state !== 'disabled') {
    const criticalThreshold = Math.round(30 + (postureSensitivity - 1) * (40 / 9));
    const warningThreshold = Math.round(60 + (postureSensitivity - 1) * (30 / 9));

    if (score < criticalThreshold) state = 'critical';
    else if (score < warningThreshold) state = 'warning';
  }

  return {
    state,
    score: Math.round(Math.max(0, Math.min(100, score))),
  };
}

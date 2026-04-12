// Posture scorer
import { NormalizedLandmark } from '@mediapipe/pose';
import { PostureState } from '../../types';
import { checkEyeDistance } from './eyeTracking';
import { checkNeckPitch, checkNeckRotation } from './neckTracking';
import { getSensitivityMultiplier } from '../config';
import { getPersonalThresholds } from './calibration';
import { CalibrationData } from '../../types';

export interface PostureResult {
  state: PostureState;
  score: number;
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

    // Shoulder checks
    const shouldersVisible = leftShoulder.visibility && rightShoulder.visibility && 
                             leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5;

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
    score: Math.max(0, Math.min(100, score)),
  };
}

import { NormalizedLandmark } from '@mediapipe/pose';
import { POSTURE_THRESHOLDS } from '../config';

interface EyeThresholds {
  tooClose: number;
  warningClose: number;
  tooFar: number;
}

export const checkEyeDistance = (
  leftEye: NormalizedLandmark,
  rightEye: NormalizedLandmark,
  sensitivityMultiplier: number = 1.0,
  thresholds: EyeThresholds = {
    tooClose: POSTURE_THRESHOLDS.EYE_TOO_CLOSE,
    warningClose: POSTURE_THRESHOLDS.EYE_WARNING_CLOSE,
    tooFar: POSTURE_THRESHOLDS.EYE_TOO_FAR,
  }
) => {
  const eyeDistance = Math.sqrt(
    Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
  );

  // Apply sensitivity
  const adjustedTooClose = thresholds.tooClose * sensitivityMultiplier;
  const adjustedWarningClose = thresholds.warningClose * sensitivityMultiplier;
  const adjustedTooFar = thresholds.tooFar / sensitivityMultiplier;

  return {
    distance: eyeDistance,
    isTooClose: eyeDistance > adjustedTooClose,
    isWarningClose: eyeDistance > adjustedWarningClose,
    isTooFar: eyeDistance < adjustedTooFar,
  };
};

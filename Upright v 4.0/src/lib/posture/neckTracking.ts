import { NormalizedLandmark } from '@mediapipe/pose';
import { POSTURE_THRESHOLDS } from '../config';

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

export const checkNeckPitch = (
  nose: NormalizedLandmark,
  leftEar: NormalizedLandmark,
  rightEar: NormalizedLandmark,
  sensitivityMultiplier: number = 1.0,
  thresholds: NeckThresholds = DEFAULT_NECK_THRESHOLDS
) => {
  const earMidY = (leftEar.y + rightEar.y) / 2;

  // Pitch diff
  const pitchDiff = nose.y - earMidY;

  // Apply sensitivity
  const adjustedLookingUp = thresholds.lookingUp * sensitivityMultiplier;
  const adjustedLookingDown = thresholds.lookingDown * sensitivityMultiplier;

  return {
    pitchDiff,
    isLookingUp: pitchDiff < adjustedLookingUp,
    isLookingDown: pitchDiff > adjustedLookingDown,
  };
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

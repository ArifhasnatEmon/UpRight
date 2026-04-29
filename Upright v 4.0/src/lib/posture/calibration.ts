import { NormalizedLandmark } from '@mediapipe/pose';
import { CalibrationData } from '../../types';

export function collectCalibrationSample(landmarks: NormalizedLandmark[]) {
  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const eyeDistance = Math.sqrt(
    Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
  );
  
  const earMidY = (leftEar.y + rightEar.y) / 2;
  const pitchDiff = nose.y - earMidY;
  
  const earMidX = (leftEar.x + rightEar.x) / 2;
  const rotationDiff = Math.abs(nose.x - earMidX);
  
  const headTilt = Math.abs(leftEye.y - rightEye.y);
  
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const neckLength = shoulderMidY - nose.y;

  return { eyeDistance, pitchDiff, rotationDiff, headTilt, neckLength };
}

export function computeCalibration(samples: ReturnType<typeof collectCalibrationSample>[]): CalibrationData {
  const sum = samples.reduce((acc, curr) => ({
    eyeDistance: acc.eyeDistance + curr.eyeDistance,
    pitchDiff: acc.pitchDiff + curr.pitchDiff,
    rotationDiff: acc.rotationDiff + curr.rotationDiff,
    headTilt: acc.headTilt + curr.headTilt,
    neckLength: acc.neckLength + curr.neckLength,
  }), { eyeDistance: 0, pitchDiff: 0, rotationDiff: 0, headTilt: 0, neckLength: 0 });

  const count = samples.length;
  
  return {
    timestamp: new Date().toISOString(),
    baseline: {
      eyeDistance: sum.eyeDistance / count,
      pitchDiff: sum.pitchDiff / count,
      rotationDiff: sum.rotationDiff / count,
      headTilt: sum.headTilt / count,
      neckLength: sum.neckLength / count,
    }
  };
}

export function validateCalibrationQuality(samples: ReturnType<typeof collectCalibrationSample>[]): boolean {
  if (samples.length === 0) return false;
  
  const mean = computeCalibration(samples).baseline;
  
  let valid = true;
  samples.forEach(sample => {
    // High variance
    if (Math.abs(sample.eyeDistance - mean.eyeDistance) > 0.04) valid = false;
    if (Math.abs(sample.pitchDiff - mean.pitchDiff) > 0.1) valid = false;
    if (Math.abs(sample.rotationDiff - mean.rotationDiff) > 0.1) valid = false;
    if (Math.abs(sample.headTilt - mean.headTilt) > 0.05) valid = false;
  });
  
  return valid;
}

export function getPersonalThresholds(calibration: CalibrationData) {
  const { baseline } = calibration;
  
  return {
    eye: {
      tooClose: baseline.eyeDistance * 1.5,
      warningClose: baseline.eyeDistance * 1.3,
      tooFar: baseline.eyeDistance * 0.4,
    },
    neck: {
      lookingUp: baseline.pitchDiff - 0.2, // Negative pitch
      lookingDown: baseline.pitchDiff + 0.2, // Positive pitch
      rotated: baseline.rotationDiff + 0.15,
    },
    headTilt: {
      warning: baseline.headTilt + 0.06,
      critical: baseline.headTilt + 0.12,
    },
    neckLength: {
      tooShortWarning: baseline.neckLength * 0.7,
      tooShortCritical: baseline.neckLength * 0.5,
      tooLongCritical: baseline.neckLength * 1.5,
    }
  };
}

export function saveCalibration(data: CalibrationData) {
  localStorage.setItem('upright_calibration', JSON.stringify(data));
}

export function loadCalibration(): CalibrationData | null {
  const stored = localStorage.getItem('upright_calibration');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearCalibration() {
  localStorage.removeItem('upright_calibration');
}

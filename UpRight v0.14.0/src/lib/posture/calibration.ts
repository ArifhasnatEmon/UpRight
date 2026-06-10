import { NormalizedLandmark } from '@mediapipe/pose';
import { CalibrationData } from '../../types';

export function collectCalibrationSample(landmarks: NormalizedLandmark[]) {
  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const mouthLeft = landmarks[9];
  const mouthRight = landmarks[10];
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
  
  // Only compute neckLength if shoulders are reliably visible and not at frame edge
  const shouldersReliable =
    leftShoulder.visibility != null && rightShoulder.visibility != null &&
    leftShoulder.visibility > 0.7 && rightShoulder.visibility > 0.7 &&
    leftShoulder.y < 0.92 && rightShoulder.y < 0.92;

  let neckLength = 0;
  if (shouldersReliable) {
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    neckLength = shoulderMidY - nose.y;
  }


  // Ear-to-Eye horizontal span ratio
  const eyeSpan = Math.abs(leftEye.x - rightEye.x);
  const earSpan = Math.abs(leftEar.x - rightEar.x);
  const earEyeSpanRatio = eyeSpan > 0.001 ? earSpan / eyeSpan : 0;

  // Nose-to-ear z-depth difference
  const earMidZ = (leftEar.z + rightEar.z) / 2;
  const noseEarZDiff = nose.z - earMidZ;

  // Face vertical ratio: (mouthMidY - eyeMidY) / eyeDistance
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const mouthMidY = (mouthLeft.y + mouthRight.y) / 2;
  const faceVerticalRatio = eyeDistance > 0.001 ? (mouthMidY - eyeMidY) / eyeDistance : 0;

  return {
    eyeDistance, pitchDiff, rotationDiff, headTilt, neckLength, shouldersReliable,
    earEyeSpanRatio, noseEarZDiff, faceVerticalRatio,
    noseY: nose.y,
  };
}

export function computeCalibration(samples: ReturnType<typeof collectCalibrationSample>[]): CalibrationData {
  const count = samples.length;
  if (count === 0) {
    return {
      timestamp: new Date().toISOString(),
      baseline: {
        eyeDistance: 0.12, pitchDiff: 0.05, rotationDiff: 0.02,
        headTilt: 0.01, neckLength: 0.25,
        earEyeSpanRatio: 2.0, noseEarZDiff: -0.05, faceVerticalRatio: 1.2,
        noseY: 0.35,
      },
    };
  }

  const sum = samples.reduce((acc, curr) => ({
    eyeDistance: acc.eyeDistance + curr.eyeDistance,
    pitchDiff: acc.pitchDiff + curr.pitchDiff,
    rotationDiff: acc.rotationDiff + curr.rotationDiff,
    headTilt: acc.headTilt + curr.headTilt,
    earEyeSpanRatio: acc.earEyeSpanRatio + curr.earEyeSpanRatio,
    noseEarZDiff: acc.noseEarZDiff + curr.noseEarZDiff,
    faceVerticalRatio: acc.faceVerticalRatio + curr.faceVerticalRatio,
    noseY: acc.noseY + curr.noseY,
  }), {
    eyeDistance: 0, pitchDiff: 0, rotationDiff: 0, headTilt: 0,
    earEyeSpanRatio: 0, noseEarZDiff: 0, faceVerticalRatio: 0,
    noseY: 0,
  });

  // Only average neckLength from samples where shoulders were reliably detected
  const shoulderSamples = samples.filter(s => s.shouldersReliable);
  const neckLengthSum = shoulderSamples.reduce((acc, s) => acc + s.neckLength, 0);
  const neckLengthAvg = shoulderSamples.length > 0
    ? neckLengthSum / shoulderSamples.length
    : 0; // Zero when shoulders were never visible — signals "not calibrated with shoulders"

  return {
    timestamp: new Date().toISOString(),
    baseline: {
      eyeDistance: sum.eyeDistance / count,
      pitchDiff: sum.pitchDiff / count,
      rotationDiff: sum.rotationDiff / count,
      headTilt: sum.headTilt / count,
      neckLength: neckLengthAvg,
      earEyeSpanRatio: sum.earEyeSpanRatio / count,
      noseEarZDiff: sum.noseEarZDiff / count,
      faceVerticalRatio: sum.faceVerticalRatio / count,
      noseY: sum.noseY / count,
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
    const data = JSON.parse(stored) as CalibrationData;
    // Migration: old calibration without forward head fields → set to 0 (uncalibrated)
    // Forward head detection will skip when these are 0
    if (data.baseline.earEyeSpanRatio === undefined) {
      data.baseline.earEyeSpanRatio = 0;
    }
    if (data.baseline.noseEarZDiff === undefined) {
      data.baseline.noseEarZDiff = 0;
    }
    if (data.baseline.faceVerticalRatio === undefined) {
      data.baseline.faceVerticalRatio = 0;
    }
    if (data.baseline.noseY === undefined) {
      data.baseline.noseY = 0;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearCalibration() {
  localStorage.removeItem('upright_calibration');
}

// Pose engine
import { Pose, Results } from '@mediapipe/pose';
import { MEDIAPIPE_CDN_URL } from '../config';

export interface PoseEngineOptions {
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

// Init pose
export function createPoseInstance(
  options: PoseEngineOptions,
  onResults: (results: Results) => void
): Pose {
  const pose = new Pose({
    locateFile: (file) => {
      // Path fallback
      return `${MEDIAPIPE_CDN_URL}${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: options.modelComplexity,
    smoothLandmarks: options.smoothLandmarks,
    minDetectionConfidence: options.minDetectionConfidence,
    minTrackingConfidence: options.minTrackingConfidence,
  });

  pose.onResults(onResults);
  return pose;
}

// Destroy pose
export function destroyPoseInstance(pose: Pose | null): null {
  if (pose) {
    pose.close();
  }
  return null;
}

// Build options
export function buildPoseOptions(lowResourceMode: boolean, modelComplexity?: 0 | 1 | 2): PoseEngineOptions {
  const complexity = modelComplexity ?? (lowResourceMode ? 0 : 1);
  return {
    modelComplexity: complexity,
    smoothLandmarks: true,
    minDetectionConfidence: lowResourceMode ? 0.5 : 0.7,
    minTrackingConfidence: lowResourceMode ? 0.5 : 0.7,
  };
}

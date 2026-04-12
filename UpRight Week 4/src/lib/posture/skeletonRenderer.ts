// Skeleton renderer
import { NormalizedLandmark, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { PostureState } from '../../types';

// Upper body
const UPPER_BODY_CONNECTIONS: [number, number][] = (() => {
  const upper = POSE_CONNECTIONS.filter(
    ([start, end]) => start <= 12 && end <= 12
  );
  return [
    ...upper,
    [7, 11],  // Left connection
    [8, 12],  // Right connection
  ];
})();

// Render skeleton
export function renderSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  state: PostureState
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Scale canvas
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.offsetWidth;
  const displayHeight = canvas.offsetHeight;

  if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state === 'disabled') {
    ctx.restore();
    return;
  }

  const color =
    state === 'good' ? '#10b981' :
    state === 'warning' ? '#f59e0b' :
    state === 'too_close' ? '#6366f1' : '#ef4444';

  drawConnectors(ctx, landmarks, UPPER_BODY_CONNECTIONS, {
    color: color,
    lineWidth: 4,
  });

  const upperBodyLandmarks = landmarks.slice(0, 13);
  drawLandmarks(ctx, upperBodyLandmarks, {
    color: '#ffffff',
    lineWidth: 2,
    radius: 3,
  });

  ctx.restore();
}

// Clear canvas
export function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

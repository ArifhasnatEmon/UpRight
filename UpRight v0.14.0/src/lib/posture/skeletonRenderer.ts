// Skeleton renderer
import { NormalizedLandmark, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { PostureState } from '../../types';

// Minimum visibility to consider a landmark reliable for rendering
const MIN_RENDER_VISIBILITY = 0.65;

// Face-only connections (indices 0–10, no shoulders)
const FACE_CONNECTIONS: [number, number][] = POSE_CONNECTIONS.filter(
  ([start, end]) => start <= 10 && end <= 10
);

// Shoulder connections that require shoulder visibility
const SHOULDER_CONNECTIONS: [number, number][] = [
  [11, 12], // Shoulder to shoulder
  [7, 11],  // Left ear to left shoulder
  [8, 12],  // Right ear to right shoulder
];

// Connections involving shoulders from POSE_CONNECTIONS
const POSE_SHOULDER_CONNECTIONS: [number, number][] = POSE_CONNECTIONS.filter(
  ([start, end]) => (start <= 12 && end <= 12) && (start === 11 || start === 12 || end === 11 || end === 12)
);

// Cache canvas dimensions to avoid layout thrashing (reading offsetWidth/Height every frame)
let cachedCanvasWidth = 0;
let cachedCanvasHeight = 0;
let lastCanvasElement: HTMLCanvasElement | null = null;

// Render skeleton
export function renderSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  state: PostureState
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Only recalculate canvas size when the canvas element changes or on first call
  // This avoids reading offsetWidth/offsetHeight every frame which causes layout thrashing
  if (canvas !== lastCanvasElement || cachedCanvasWidth === 0) {
    lastCanvasElement = canvas;
    cachedCanvasWidth = canvas.offsetWidth;
    cachedCanvasHeight = canvas.offsetHeight;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== cachedCanvasWidth * dpr || canvas.height !== cachedCanvasHeight * dpr) {
      canvas.width = cachedCanvasWidth * dpr;
      canvas.height = cachedCanvasHeight * dpr;
      ctx.scale(dpr, dpr);
    }
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

  // Check if shoulders are reliably visible and within frame (not at extreme edges)
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const shouldersReliable =
    leftShoulder?.visibility != null && rightShoulder?.visibility != null &&
    leftShoulder.visibility > MIN_RENDER_VISIBILITY &&
    rightShoulder.visibility > MIN_RENDER_VISIBILITY &&
    leftShoulder.y < 0.95 && rightShoulder.y < 0.95; // Not at the very bottom edge

  // Always draw face connections
  drawConnectors(ctx, landmarks, FACE_CONNECTIONS, {
    color: color,
    lineWidth: 4,
  });

  // Only draw shoulder connections when shoulders are reliably detected
  if (shouldersReliable) {
    drawConnectors(ctx, landmarks, [...POSE_SHOULDER_CONNECTIONS, ...SHOULDER_CONNECTIONS], {
      color: color,
      lineWidth: 4,
    });
  }

  // Draw face landmarks (0–10), always visible
  const faceLandmarks = landmarks.slice(0, 11);
  drawLandmarks(ctx, faceLandmarks, {
    color: '#ffffff',
    lineWidth: 2,
    radius: 3,
  });

  // Draw shoulder landmarks only when reliable
  if (shouldersReliable) {
    drawLandmarks(ctx, [landmarks[11], landmarks[12]], {
      color: '#ffffff',
      lineWidth: 2,
      radius: 3,
    });
  }

  ctx.restore();
}

// Clear canvas
export function clearCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Reset cached dimensions (call on resize)
export function resetCanvasCache(): void {
  cachedCanvasWidth = 0;
  cachedCanvasHeight = 0;
  lastCanvasElement = null;
}

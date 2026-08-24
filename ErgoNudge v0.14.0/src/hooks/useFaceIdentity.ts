// src/hooks/useFaceIdentity.ts
// Face recognition hook — runs 100% locally using bundled face-api.js models.
// Detects when a DIFFERENT face has been present for 60s and fires onFaceChanged.
// No data is ever sent to any server. Embeddings live in electron-store only.

import React, { useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODELS_PATH = '/models';                // public/models/ served by Vite
const DETECTION_INTERVAL_MS = 10_000;        // check every 10 seconds
const SUSTAINED_CHANGE_MS = 60_000;          // 60s before firing onFaceChanged
const MATCH_THRESHOLD = 0.5;                 // Euclidean distance ≤ 0.5 = same person
const ENROLL_FRAMES = 5;                     // frames to average for enrollment

interface FaceProfileStored {
  name: string;
  embedding: number[];
  enrolledAt: string;
}

interface UseFaceIdentityOptions {
  /** The video element to run detection on (from AdvancedHealthMonitor) */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Email of the currently logged-in user */
  currentEmail: string | null;
  /** Called after 60s sustained different face. null = unknown person */
  onFaceChanged?: (matchedEmail: string | null) => void;
  /** Whether face recognition is enabled (opt-in) */
  enabled: boolean;
}

let modelsLoaded = false;
let modelsLoading = false;

async function ensureModelsLoaded(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelsLoading) {
    // Wait for the in-progress load
    while (modelsLoading) await new Promise(r => setTimeout(r, 200));
    return modelsLoaded;
  }

  modelsLoading = true;
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
    ]);
    modelsLoaded = true;
    console.info('[FaceIdentity] Models loaded from', MODELS_PATH);
  } catch (err) {
    console.warn('[FaceIdentity] Failed to load models:', err);
    modelsLoaded = false;
  } finally {
    modelsLoading = false;
  }
  return modelsLoaded;
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export function useFaceIdentity({
  videoRef,
  currentEmail,
  onFaceChanged,
  enabled,
}: UseFaceIdentityOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sustainedSinceRef = useRef<number | null>(null);
  const lastDetectedEmailRef = useRef<string | null | undefined>(undefined);
  // undefined = no detection yet; null = unknown; string = matched email
  const onFaceChangedRef = useRef(onFaceChanged);
  const currentEmailRef = useRef(currentEmail);
  const firedRef = useRef(false); // prevent repeated fires for same event

  useEffect(() => { onFaceChangedRef.current = onFaceChanged; }, [onFaceChanged]);
  useEffect(() => {
    currentEmailRef.current = currentEmail;
    // Reset detection state when user changes
    sustainedSinceRef.current = null;
    lastDetectedEmailRef.current = undefined;
    firedRef.current = false;
  }, [currentEmail]);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    if (!window.electronAPI?.faceProfiles) return;

    const loaded = await ensureModelsLoaded();
    if (!loaded) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        // No face — reset sustained timer
        sustainedSinceRef.current = null;
        lastDetectedEmailRef.current = undefined;
        firedRef.current = false;
        return;
      }

      const currentDescriptor = Array.from(detection.descriptor);

      // Load enrolled profiles
      const profiles: Record<string, FaceProfileStored> =
        await window.electronAPI.faceProfiles.loadAll();

      // Find best match
      let bestEmail: string | null = null;
      let bestDist = Infinity;
      for (const [email, profile] of Object.entries(profiles)) {
        if (!profile || !profile.embedding) continue;
        const dist = euclidean(currentDescriptor, profile.embedding);
        if (dist < bestDist) {
          bestDist = dist;
          bestEmail = email;
        }
      }

      // Apply threshold — if no match within threshold, treat as unknown
      const matchedEmail = bestDist <= MATCH_THRESHOLD ? bestEmail : null;

      if (matchedEmail === currentEmailRef.current) {
        sustainedSinceRef.current = null;
        lastDetectedEmailRef.current = matchedEmail;
        firedRef.current = false;
        return;
      }

      if (lastDetectedEmailRef.current !== matchedEmail) {
        sustainedSinceRef.current = Date.now();
        lastDetectedEmailRef.current = matchedEmail;
        firedRef.current = false;
        return;
      }

      // Same different face — check if sustained long enough
      if (
        sustainedSinceRef.current !== null &&
        !firedRef.current &&
        Date.now() - sustainedSinceRef.current >= SUSTAINED_CHANGE_MS
      ) {
        firedRef.current = true;
        onFaceChangedRef.current?.(matchedEmail);
      }
    } catch (err) {
      // Silent — detection errors should never crash the app
      console.warn('[FaceIdentity] Detection error:', err);
    }
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    // Start detection loop
    ensureModelsLoaded(); // kick off load without blocking
    intervalRef.current = setInterval(detect, DETECTION_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [enabled, detect]);

  const enrollCurrentUser = useCallback(async (
    email: string,
    name: string,
    videoEl?: HTMLVideoElement | null,
  ): Promise<{ success: boolean; error?: string }> => {
    const video = videoEl ?? videoRef.current;
    if (!video) return { success: false, error: 'No video element' };
    if (!window.electronAPI?.faceProfiles) return { success: false, error: 'Electron IPC not available' };

    const loaded = await ensureModelsLoaded();
    if (!loaded) return { success: false, error: 'Face models failed to load' };

    const embeddings: number[][] = [];

    let firstFrameBase64: string | null = null;

    for (let i = 0; i < ENROLL_FRAMES; i++) {
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Capture the first successful frame as an image
        if (!firstFrameBase64) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            firstFrameBase64 = canvas.toDataURL('image/jpeg', 0.85);
          }
        }

        embeddings.push(Array.from(detection.descriptor));
        await new Promise(r => setTimeout(r, 300));
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (embeddings.length === 0) {
      return { success: false, error: 'No face detected — ensure your face is visible and well-lit' };
    }

    // Save the snapshot physically to disk (Steam save file logic)
    if (firstFrameBase64 && (window as any).electronAPI?.saveUserSnapshot) {
      try {
        await (window as any).electronAPI.saveUserSnapshot(email, firstFrameBase64);
        console.info(`[FaceIdentity] Physical snapshot saved for ${email}`);
      } catch (err) {
        console.warn('[FaceIdentity] Failed to save physical snapshot:', err);
      }
    }

    // Average the embeddings for a more stable representation
    const averaged = embeddings[0].map(
      (_, dim) => embeddings.reduce((sum, e) => sum + e[dim], 0) / embeddings.length
    );

    try {
      await window.electronAPI.faceProfiles.save(email, name, averaged);
      console.info(`[FaceIdentity] Enrolled ${name} (${email}) with ${embeddings.length} frames`);
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, [videoRef]);

  return { enrollCurrentUser };
}

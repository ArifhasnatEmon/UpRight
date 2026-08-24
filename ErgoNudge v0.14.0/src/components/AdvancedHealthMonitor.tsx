import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { PostureState } from '../types';
import { createPoseInstance, destroyPoseInstance, buildPoseOptions } from '../lib/posture/poseEngine';
import { renderSkeleton, clearCanvas } from '../lib/posture/skeletonRenderer';
import { scorePosture } from '../lib/posture/postureScorer';
import { useFaceIdentity } from '../hooks/useFaceIdentity';
import { cn } from '../utils';

interface AdvancedHealthMonitorProps {
  onStateChange: (state: PostureState, score: number) => void;
  isActive: boolean;
  frameRate: number;
  postureSensitivity: number;
  lowResourceMode?: boolean;
  showSkeleton?: boolean;
  calibration?: any | null;
  /** Called when no face is detected for 60 seconds — parent should turn camera off */
  onFaceAbsent?: () => void;
  /** Called after 60s sustained different face. null = unknown person */
  onFaceChanged?: (matchedEmail: string | null) => void;
  /** Email of currently logged-in user — used for face identity comparison */
  currentEmail?: string | null;
  /** Ref forwarded to expose enrollCurrentUser for Onboarding/Profile */
  enrollRef?: React.RefObject<((email: string, name: string) => Promise<{ success: boolean; error?: string }>) | null>;
  /** Whether the user manually paused monitoring via the toggle button */
  isManuallyPaused?: boolean;
}

export const AdvancedHealthMonitor: React.FC<AdvancedHealthMonitorProps> = ({
  onStateChange, isActive, frameRate, postureSensitivity,
  lowResourceMode = false, showSkeleton = true, calibration = null,
  onFaceAbsent, onFaceChanged, currentEmail = null, enrollRef,
  isManuallyPaused = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<ReturnType<typeof createPoseInstance> | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const onStateChangeRef = useRef(onStateChange);
  const onFaceAbsentRef = useRef(onFaceAbsent);
  const lastFrameTimeRef = useRef<number>(0);
  const frameRateRef = useRef(frameRate);
  const sensitivityRef = useRef(postureSensitivity);
  const calibrationRef = useRef(calibration);

  // Face-absent timer: tracks when the face first disappeared
  const faceAbsentSinceRef = useRef<number | null>(null);
  const FACE_ABSENT_TIMEOUT_MS = 60_000; // 1 minute

  // Adaptive framerate
  const adaptiveRateRef = useRef(frameRate);
  const lastInteractionRef = useRef(Date.now());
  const isOffscreenRef = useRef(false);

  // Auto-recovery: track consecutive pose.send() errors
  const consecutiveErrorCount = useRef(0);
  const lowResourceModeRef = useRef(lowResourceMode);
  useEffect(() => { lowResourceModeRef.current = lowResourceMode; }, [lowResourceMode]);

  // Perf: prevent overlapping pose.send() calls — skip frames instead of queuing stale ones
  const isProcessingRef = useRef(false);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onFaceAbsentRef.current = onFaceAbsent;
  }, [onFaceAbsent]);

  useEffect(() => {
    frameRateRef.current = frameRate;
    adaptiveRateRef.current = frameRate;
  }, [frameRate]);

  useEffect(() => {
    sensitivityRef.current = postureSensitivity;
  }, [postureSensitivity]);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  const { enrollCurrentUser } = useFaceIdentity({
    videoRef,
    currentEmail,
    onFaceChanged,
    enabled: !!onFaceChanged && isActive,
  });

  // Expose enrollCurrentUser via ref so parent can trigger enrollment
  useEffect(() => {
    if (enrollRef) {
      (enrollRef as React.MutableRefObject<typeof enrollCurrentUser | null>).current = enrollCurrentUser;
    }
  }, [enrollRef, enrollCurrentUser]);

  // Interaction tracking
  useEffect(() => {
    const updateInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    document.addEventListener('mousemove', updateInteraction, { passive: true });
    document.addEventListener('keydown', updateInteraction, { passive: true });
    return () => {
      document.removeEventListener('mousemove', updateInteraction);
      document.removeEventListener('keydown', updateInteraction);
    };
  }, []);

  // Visibility listener
  useEffect(() => {
    const handleVisibility = () => {
      isOffscreenRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // IPC detection
    const cleanup = window.electronAPI?.onWindowVisibilityChanged?.((isOffscreen: boolean) => {
      isOffscreenRef.current = isOffscreen;
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      cleanup?.();
    };
  }, []);

  // Adaptive interval
  useEffect(() => {
    const interval = setInterval(() => {
      const idleTime = Date.now() - lastInteractionRef.current;
      if (lowResourceMode) {
        adaptiveRateRef.current = 5;
      } else if (isOffscreenRef.current) {
        adaptiveRateRef.current = 15;
      } else if (idleTime > 2 * 60 * 1000) {
        adaptiveRateRef.current = 10;
      } else {
        adaptiveRateRef.current = frameRateRef.current;
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [lowResourceMode]);

  // Pose handler
  const handlePoseResults = useCallback((results: Results) => {
    if (!results.poseLandmarks) {
      clearCanvas(canvasRef.current);
      onStateChangeRef.current('disabled', 0);

      // Start or check face-absent timer
      if (faceAbsentSinceRef.current === null) {
        faceAbsentSinceRef.current = Date.now();
      } else if (Date.now() - faceAbsentSinceRef.current >= FACE_ABSENT_TIMEOUT_MS) {
        // Face gone for 1 minute — notify parent to shut camera
        faceAbsentSinceRef.current = null; // reset so we don't fire repeatedly
        onFaceAbsentRef.current?.();
      }
      return;
    }

    // Face is present — reset absent timer and error counter
    faceAbsentSinceRef.current = null;
    consecutiveErrorCount.current = 0;

    const { state, score } = scorePosture(results.poseLandmarks, sensitivityRef.current, calibrationRef.current);
    onStateChangeRef.current(state, score);

    if (canvasRef.current && showSkeleton) {
      renderSkeleton(canvasRef.current, results.poseLandmarks, state);
    }
  }, [showSkeleton]);

  // Pose lifecycle
  // Mount init
  useEffect(() => {
    const options = buildPoseOptions(lowResourceMode);
    poseRef.current = createPoseInstance(options, handlePoseResults);

    return () => {
      poseRef.current = destroyPoseInstance(poseRef.current);
    };
  }, [lowResourceMode, handlePoseResults]);

  // Camera lifecycle
  useEffect(() => {
    if (!isActive) {
      console.info('[Monitor] isActive=false — releasing camera resources');
      // Release MediaPipe Camera instance
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      // Release tracks from the video element
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.info(`[Monitor] Stopped track: ${track.label} (${track.readyState})`);
        });
        videoRef.current.srcObject = null;
      }
      // Also stop any tracks the video element may have acquired via captureStream
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load(); // forces browser to release camera hardware
      }
      setIsCameraReady(false);
      clearCanvas(canvasRef.current);
      return;
    }

    let isMounted = true;
    setCameraError(null);
    setIsCameraReady(false);

    // Camera fallback
    const startCameraWithFallback = async () => {
      if (!videoRef.current || !poseRef.current) return;

      // Cached device
      const cachedDeviceId = localStorage.getItem('ergonudge_camera_device_id') || localStorage.getItem('upright_camera_device_id');

      const tryDevice = (deviceId?: string) => {
        if (!videoRef.current || !poseRef.current) return;

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            // Skip this frame if the previous pose.send() hasn't finished yet
            // — prevents queuing stale frames which causes skeleton lag
            if (isProcessingRef.current) return;

            const now = performance.now();
            const effectiveFrameRate = adaptiveRateRef.current;
            const interval = 1000 / effectiveFrameRate;

            if (now - lastFrameTimeRef.current >= interval) {
              if (poseRef.current && isMounted && videoRef.current && videoRef.current.videoWidth > 0) {
                try {
                  lastFrameTimeRef.current = now;
                  isProcessingRef.current = true;
                  await poseRef.current.send({ image: videoRef.current });
                } catch (err) {
                  consecutiveErrorCount.current += 1;
                  if (consecutiveErrorCount.current >= 5) {
                    console.warn('[Monitor] Too many consecutive pose errors, reinitializing MediaPipe...');
                    poseRef.current = destroyPoseInstance(poseRef.current);
                    const options = buildPoseOptions(lowResourceModeRef.current);
                    poseRef.current = createPoseInstance(options, handlePoseResults);
                    consecutiveErrorCount.current = 0;
                  }
                } finally {
                  isProcessingRef.current = false;
                }
              }
            }
          },
          facingMode: undefined,
          // Lower resolution = faster MediaPipe processing per frame = less skeleton latency
          width: 480,
          height: 360,
        });

        return camera;
      };

      try {
        // Test cached
        if (cachedDeviceId) {
          const camera = tryDevice(cachedDeviceId);
          if (camera) {
            cameraRef.current = camera;
            await camera.start();
            if (isMounted) {
              setIsCameraReady(true);
              setCameraError(null);
            }
            return;
          }
        }

        // Test default
        const camera = tryDevice();
        if (camera) {
          cameraRef.current = camera;
          await camera.start();
          if (isMounted) {
            setIsCameraReady(true);
            setCameraError(null);
            // Cache working
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const videoDevices = devices.filter(d => d.kind === 'videoinput');
              if (videoDevices.length > 0 && videoDevices[0].deviceId) {
                localStorage.setItem('ergonudge_camera_device_id', videoDevices[0].deviceId);
              }
            } catch { /* ignore enumeration errors */ }
          }
          return;
        }
      } catch (err) {
        // Default failed
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.deviceId !== cachedDeviceId);

          for (const device of videoDevices) {
            try {
              const camera = tryDevice(device.deviceId);
              if (camera) {
                cameraRef.current = camera;
                await camera.start();
                if (isMounted) {
                  setIsCameraReady(true);
                  setCameraError(null);
                  localStorage.setItem('ergonudge_camera_device_id', device.deviceId);
                }
                return;
              }
            } catch { /* try next device */ }
          }
        } catch { /* enumeration failed */ }

        // Devices failed
        if (isMounted) {
          const errMsg = (err instanceof Error) ? err.message : "Camera not found or permission denied.";
          setCameraError(errMsg);
          setIsCameraReady(false);
        }
      }
    };

    startCameraWithFallback();

    return () => {
      isMounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      clearCanvas(canvasRef.current);
    };
  }, [isActive, retryCount]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
      <video ref={videoRef} className={cn("absolute inset-0 w-full h-full object-cover opacity-40 grayscale", !isActive && "hidden")} playsInline muted />
      <canvas ref={canvasRef} width={480} height={360} className={cn("absolute inset-0 w-full h-full pointer-events-none", !isActive && "hidden")} />

      {isActive && !isCameraReady && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm font-mono">
          INITIALIZING AI ENGINE...
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-white font-bold mb-2">Camera Error</p>
          <p className="text-neutral-400 text-xs max-w-[200px] mb-4">
            {cameraError.includes("Requested device not found")
              ? "No camera detected. Please connect a webcam to use posture monitoring."
              : cameraError.includes("Permission denied") || cameraError.includes("NotAllowedError")
                ? "Camera permission denied. Please allow camera access in your browser settings to use posture monitoring."
                : cameraError}
          </p>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="px-4 py-2 bg-white text-neutral-900 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-950/80">
          <div className="w-14 h-14 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center">
            {/* moon / sleep icon */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
          <p className="text-white/40 text-xs font-mono tracking-widest uppercase">
            {isManuallyPaused ? 'Monitoring Paused' : 'Camera Off'}
          </p>
          {!isManuallyPaused && (
            <p className="text-white/25 text-[10px] font-mono">Move mouse to wake</p>
          )}
        </div>
      )}
    </div>
  );
};

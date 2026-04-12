import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { PostureState } from '../types';
import { createPoseInstance, destroyPoseInstance, buildPoseOptions } from '../lib/posture/poseEngine';
import { renderSkeleton, clearCanvas } from '../lib/posture/skeletonRenderer';
import { scorePosture } from '../lib/posture/postureScorer';
import { cn } from '../utils';

interface AdvancedHealthMonitorProps {
  onStateChange: (state: PostureState, score: number) => void;
  isActive: boolean;
  frameRate: number;
  postureSensitivity: number;
  lowResourceMode?: boolean;
  showSkeleton?: boolean;
  calibration?: any | null; // Calibration data
}

export const AdvancedHealthMonitor: React.FC<AdvancedHealthMonitorProps> = ({
  onStateChange, isActive, frameRate, postureSensitivity,
  lowResourceMode = false, showSkeleton = true, calibration = null
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<ReturnType<typeof createPoseInstance> | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const onStateChangeRef = useRef(onStateChange);
  const lastFrameTimeRef = useRef<number>(0);
  const frameRateRef = useRef(frameRate);
  const sensitivityRef = useRef(postureSensitivity);
  const calibrationRef = useRef(calibration);

  // Adaptive framerate
  const adaptiveRateRef = useRef(frameRate);
  const lastInteractionRef = useRef(Date.now());
  const isOffscreenRef = useRef(false);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

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
      // Handle disabled
      onStateChangeRef.current('disabled', 0);
      return;
    }

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
      // Release resources
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      // Release tracks
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
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
      const cachedDeviceId = localStorage.getItem('upright_camera_device_id');

      const tryDevice = (deviceId?: string) => {
        if (!videoRef.current || !poseRef.current) return;
        
        const constraints: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId }, width: 640, height: 480 }
          : { width: 640, height: 480 };

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            const now = performance.now();
            const effectiveFrameRate = adaptiveRateRef.current;
            const interval = 1000 / effectiveFrameRate;

            if (now - lastFrameTimeRef.current >= interval) {
              if (poseRef.current && isMounted && videoRef.current && videoRef.current.videoWidth > 0) {
                try {
                  lastFrameTimeRef.current = now;
                  await poseRef.current.send({ image: videoRef.current });
                } catch (err) {
                  // Error continue
                }
              }
            }
          },
          facingMode: undefined,
          width: 640,
          height: 480,
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
                localStorage.setItem('upright_camera_device_id', videoDevices[0].deviceId);
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
                  localStorage.setItem('upright_camera_device_id', device.deviceId);
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
      <canvas ref={canvasRef} width={640} height={480} className={cn("absolute inset-0 w-full h-full pointer-events-none", !isActive && "hidden")} />
      
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
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm font-mono">
          MONITORING PAUSED
        </div>
      )}
    </div>
  );
};

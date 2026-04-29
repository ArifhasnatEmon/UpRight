import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Results } from '@mediapipe/pose';
import { Target, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { createPoseInstance, buildPoseOptions, destroyPoseInstance } from '../lib/posture/poseEngine';
import { collectCalibrationSample, computeCalibration, validateCalibrationQuality, saveCalibration } from '../lib/posture/calibration';
import { CalibrationData } from '../types';
import { cn } from '../utils';

interface CalibrationWizardProps {
  onClose: () => void;
  onComplete: (data: CalibrationData) => void;
  lowResourceMode?: boolean;
}

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ onClose, onComplete, lowResourceMode = false }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'success' | 'fail' | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const poseRef = useRef<ReturnType<typeof createPoseInstance> | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const samplesRef = useRef<ReturnType<typeof collectCalibrationSample>[]>([]);
  const isCapturingRef = useRef(false);
  const doneRef = useRef(false);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (poseRef.current) {
        poseRef.current = destroyPoseInstance(poseRef.current);
      }
    };
  }, [stopCamera]);

  const finishCalibration = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopCamera();
    if (poseRef.current) {
      poseRef.current = destroyPoseInstance(poseRef.current);
    }
    
    const isValid = validateCalibrationQuality(samplesRef.current);
    setResult(isValid ? 'success' : 'fail');
    setStep(3);
  }, [stopCamera]);

  // Start camera
  // Ensure mounted
  const shouldStartCamera = useRef(false);

  useEffect(() => {
    if (step !== 2 || !shouldStartCamera.current) return;
    shouldStartCamera.current = false;

    const initCamera = async () => {
      if (!videoRef.current) return;

      setError(null);
      samplesRef.current = [];
      setProgress(0);
      setResult(null);
      isCapturingRef.current = false;
      doneRef.current = false;

      // Cleanup instance
      if (poseRef.current) {
        poseRef.current = destroyPoseInstance(poseRef.current);
      }
      stopCamera();

      // Create pose
      const pose = createPoseInstance(
        buildPoseOptions(lowResourceMode, 1),
        (results: Results) => {
          if (!isCapturingRef.current || doneRef.current || !results.poseLandmarks) return;
          
          const nose = results.poseLandmarks[0];
          if (nose.visibility && nose.visibility > 0.5) {
            const sample = collectCalibrationSample(results.poseLandmarks);
            samplesRef.current.push(sample);
            
            const newProgress = Math.min((samplesRef.current.length / 25) * 100, 100);
            setProgress(newProgress);
            
            if (samplesRef.current.length >= 25) {
              isCapturingRef.current = false;
              finishCalibration();
            }
          }
        }
      );
      poseRef.current = pose;

      try {
        const cachedDeviceId = localStorage.getItem('upright_camera_device_id');

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
              try {
                await poseRef.current.send({ image: videoRef.current });
              } catch {
                // Ignore errors
              }
            }
          },
          facingMode: undefined,
          width: 640,
          height: 480,
        });

        // Apply constraints
        if (cachedDeviceId) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: cachedDeviceId }, width: 640, height: 480 }
            });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch {
            // Fallback camera
          }
        }

        cameraRef.current = camera;
        await camera.start();

        // Warmup model
        setTimeout(() => {
          if (!doneRef.current) {
            isCapturingRef.current = true;
          }
        }, 2000);
      } catch (err) {
        setError("Failed to start camera. Please check permissions.");
      }
    };

    initCamera();
  }, [step, lowResourceMode, stopCamera, finishCalibration]);

  const startCalibration = useCallback(() => {
    shouldStartCamera.current = true;
    setStep(2);
  }, []);

  const handleSave = () => {
    if (result === 'success') {
      const data = computeCalibration(samplesRef.current);
      saveCalibration(data);
      onComplete(data);
    }
  };

  const currentStepData = {
    1: {
      title: "Calibrate Posture",
      desc: "Sit perfectly in your natural, healthy posture. The AI will learn your baseline to improve alert accuracy.",
      icon: Target,
      color: "text-brand-500",
      bg: "bg-brand-500/10"
    },
    2: {
      title: "Analyzing...",
      desc: "Please sit still and look forward while we capture your baseline.",
      icon: RefreshCw,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    3: {
      title: result === 'success' ? "Calibration Complete!" : "Calibration Failed",
      desc: result === 'success' 
        ? "Your personalized posture baseline has been created. Alerts will now be more accurate for you." 
        : "We detected too much movement. Please try again and remain as still as possible.",
      icon: result === 'success' ? CheckCircle2 : AlertCircle,
      color: result === 'success' ? "text-emerald-500" : "text-red-500",
      bg: result === 'success' ? "bg-emerald-500/10" : "bg-red-500/10"
    }
  }[step];

  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-edge rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="calibration-title">
        
        {/* Header */}
        <div className="p-6 border-b border-edge flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", currentStepData.bg)}>
              <Icon className={cn("w-5 h-5", currentStepData.color)} />
            </div>
            <div>
              <h2 id="calibration-title" className="font-bold text-fg">{currentStepData.title}</h2>
              <p className="text-xs text-fg-muted max-w-xs">{currentStepData.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-inset rounded-lg text-fg-muted transition-colors" aria-label="Close calibration wizard">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {error ? (
            <div className="text-center space-y-4 py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <p className="text-sm font-bold text-red-500">{error}</p>
              <button 
                onClick={startCalibration}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-all"
                aria-label="Retry calibration"
              >
                Retry
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6 w-full">
              <div className="flex justify-center">
                <div className="relative w-48 h-48 rounded-2xl bg-inset border border-edge flex items-center justify-center">
                  <Target className="w-16 h-16 text-brand-500/20" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-brand-600 dark:text-brand-400">
                     <span className="text-sm font-bold">1. Sit straight</span>
                     <span className="text-sm font-bold">2. Look at screen</span>
                     <span className="text-sm font-bold">3. Stay still</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={startCalibration}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-md shadow-brand-500/20"
                aria-label="Start posture calibration"
              >
                Start Calibration
              </button>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6 w-full">
               <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-edge">
                 <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" playsInline muted autoPlay />
                 <div className="absolute inset-0 border-2 border-brand-500/50 m-8 rounded-lg pointer-events-none" />
                 {progress === 0 && (
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2">
                       <p className="text-white text-xs font-bold animate-pulse">Loading AI model...</p>
                     </div>
                   </div>
                 )}
               </div>
               
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-bold text-fg-muted">
                   <span>{progress === 0 ? 'Warming up...' : 'Capturing baseline...'}</span>
                   <span>{Math.round(progress)}%</span>
                 </div>
                 <div className="h-2 bg-inset rounded-full overflow-hidden border border-edge-subtle">
                   <div 
                     className="h-full bg-blue-500 transition-all duration-200 ease-out rounded-full"
                     style={{ width: `${progress}%` }}
                     role="progressbar"
                     aria-valuenow={Math.round(progress)}
                     aria-valuemin={0}
                     aria-valuemax={100}
                     aria-label="Calibration progress"
                   />
                 </div>
               </div>
            </div>
          ) : (
            <div className="space-y-6 w-full py-4">
              <div className="flex justify-center">
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center", currentStepData.bg)}>
                  <Icon className={cn("w-12 h-12", currentStepData.color)} />
                </div>
              </div>
              
              {result === 'success' ? (
                <button 
                  onClick={handleSave}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold transition-all shadow-md shadow-brand-500/20"
                  aria-label="Save calibration baseline"
                >
                  Save Personal Baseline
                </button>
              ) : (
                <button 
                  onClick={startCalibration}
                  className="w-full py-3 bg-neutral-800 dark:bg-neutral-200 hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl font-bold transition-all"
                  aria-label="Retry calibration"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

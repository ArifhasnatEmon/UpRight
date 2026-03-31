import { useState, useEffect, useRef } from 'react';

interface HealthTimerCallbacks {
  onWaterAlert?: () => void;
  onEyeAlert?: () => void;
  onSittingAlert?: (sittingMinutes: number) => void;
}

export const useHealthTimers = (
  isMonitoring: boolean,
  waterLimit: number,
  eyeLimit: number,
  sittingLimit: number,
  callbacks?: HealthTimerCallbacks
) => {
  const [sittingTime, setSittingTime] = useState(0);
  const [waterTime, setWaterTime] = useState(waterLimit);
  const [eyeTime, setEyeTime] = useState(eyeLimit);

  // Use a ref for callbacks to avoid stale closures
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Reset timers when limits change
  useEffect(() => {
    setWaterTime(waterLimit);
  }, [waterLimit]);

  useEffect(() => {
    setEyeTime(eyeLimit);
  }, [eyeLimit]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isMonitoring) {
        setSittingTime(s => {
          const newSitting = s + 1;
          // Trigger alert when sitting limit is reached and every interval thereafter
          if (newSitting > 0 && newSitting % sittingLimit === 0) {
            callbacksRef.current?.onSittingAlert?.(newSitting);
          }
          return newSitting;
        });
        setWaterTime(w => {
          const newW = Math.max(0, w - 1);
          // Trigger alert exactly when time reaches zero
          if (newW === 0 && w === 1) {
            callbacksRef.current?.onWaterAlert?.();
          }
          return newW;
        });
        setEyeTime(e => {
          const newE = Math.max(0, e - 1);
          // Trigger alert exactly when time reaches zero
          if (newE === 0 && e === 1) {
            callbacksRef.current?.onEyeAlert?.();
          }
          return newE;
        });
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [isMonitoring, sittingLimit]);

  const resetWaterTimer = () => setWaterTime(waterLimit);
  const resetEyeTimer = () => setEyeTime(eyeLimit);
  const resetSittingTimer = () => setSittingTime(0);

  return { 
    sittingTime, 
    waterTime, 
    eyeTime, 
    resetWaterTimer,
    resetEyeTimer,
    resetSittingTimer,
    setSittingTime
  };
};

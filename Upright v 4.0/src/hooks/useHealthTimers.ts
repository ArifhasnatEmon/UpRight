import { useState, useEffect, useRef } from 'react';

interface HealthTimerCallbacks {
  onWaterAlert?: () => void;
  onEyeAlert?: () => void;
  onSittingAlert?: (sittingMinutes: number) => void;
}

// Health timers
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

  // Setup refs
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Timestamp tick
  const lastTickTime = useRef<number>(Date.now());

  // Reset limits
  useEffect(() => {
    setWaterTime(waterLimit);
  }, [waterLimit]);

  useEffect(() => {
    setEyeTime(eyeLimit);
  }, [eyeLimit]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isMonitoring) return;

      const now = Date.now();
      const elapsed = now - lastTickTime.current;
      lastTickTime.current = now;

      // Calculate drift
      const minutesElapsed = Math.max(1, Math.round(elapsed / 60000));

      setSittingTime(s => {
        const newSitting = s + minutesElapsed;
        // Trigger limit
        if (newSitting > 0 && Math.floor(newSitting / sittingLimit) > Math.floor(s / sittingLimit)) {
          callbacksRef.current?.onSittingAlert?.(newSitting);
        }
        return newSitting;
      });

      setWaterTime(w => {
        const newW = Math.max(0, w - minutesElapsed);
        // Trigger alert
        if (newW === 0 && w > 0) {
          callbacksRef.current?.onWaterAlert?.();
        }
        return newW;
      });

      setEyeTime(e => {
        const newE = Math.max(0, e - minutesElapsed);
        // Trigger alert
        if (newE === 0 && e > 0) {
          callbacksRef.current?.onEyeAlert?.();
        }
        return newE;
      });
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

import { useState, useEffect, useRef } from 'react';

export type IdleState = 'active' | 'paused' | 'reset';

interface HealthTimerCallbacks {
  onWaterAlert?: () => void;
  onEyeAlert?: () => void;
  onSittingAlert?: (sittingMinutes: number) => void;
  onIdlePause?: () => void;
  onIdleReset?: () => void;
  onIdleResume?: () => void;
}

// Health timers — idle state is driven externally via setIdleState()
export const useHealthTimers = (
  isMonitoring: boolean,
  waterLimit: number,
  eyeLimit: number,
  sittingLimit: number,
  callbacks?: HealthTimerCallbacks
) => {
  const [sittingTime, setSittingTime] = useState(0);
  const [waterTime, setWaterTime]     = useState(waterLimit);
  const [eyeTime, setEyeTime]         = useState(eyeLimit);
  const [idleState, setIdleStateRaw]  = useState<IdleState>('active');

  // Always-up-to-date refs
  const callbacksRef  = useRef(callbacks);
  const idleStateRef  = useRef<IdleState>('active');
  const lastTickTime  = useRef<number>(Date.now());
  const waterLimitRef = useRef(waterLimit);
  const eyeLimitRef   = useRef(eyeLimit);

  useEffect(() => { callbacksRef.current  = callbacks;   }, [callbacks]);
  useEffect(() => { waterLimitRef.current = waterLimit;  }, [waterLimit]);
  useEffect(() => { eyeLimitRef.current   = eyeLimit;    }, [eyeLimit]);

  // Public: called by App.tsx when Electron (or browser) detects idle change
  const setIdleState = (next: IdleState) => {
    const prev = idleStateRef.current;
    if (prev === next) return;

    idleStateRef.current = next;
    setIdleStateRaw(next);

    if (next === 'paused' && prev === 'active') {
      callbacksRef.current?.onIdlePause?.();
    }

    if (next === 'reset') {
      setSittingTime(0);
      setWaterTime(waterLimitRef.current);
      setEyeTime(eyeLimitRef.current);
      callbacksRef.current?.onIdleReset?.();
    }

    if (next === 'active' && prev !== 'active') {
      // Re-sync tick timestamp so no burst of elapsed time is counted
      lastTickTime.current = Date.now();
      callbacksRef.current?.onIdleResume?.();
    }
  };

  // Reset display values when settings change
  useEffect(() => { setWaterTime(waterLimit); }, [waterLimit]);
  useEffect(() => { setEyeTime(eyeLimit); },   [eyeLimit]);

  // Main 60-second tick — skips when paused or reset
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isMonitoring || idleStateRef.current !== 'active') {
        lastTickTime.current = Date.now(); // keep fresh so no drift on resume
        return;
      }

      const now     = Date.now();
      const elapsed = now - lastTickTime.current;
      lastTickTime.current = now;

      const minutesElapsed = Math.max(1, Math.round(elapsed / 60000));

      setSittingTime(s => {
        const newSitting = s + minutesElapsed;
        if (newSitting > 0 && Math.floor(newSitting / sittingLimit) > Math.floor(s / sittingLimit)) {
          callbacksRef.current?.onSittingAlert?.(newSitting);
        }
        return newSitting;
      });

      setWaterTime(w => {
        const newW = Math.max(0, w - minutesElapsed);
        if (newW === 0 && w > 0) callbacksRef.current?.onWaterAlert?.();
        return newW;
      });

      setEyeTime(e => {
        const newE = Math.max(0, e - minutesElapsed);
        if (newE === 0 && e > 0) callbacksRef.current?.onEyeAlert?.();
        return newE;
      });
    }, 60_000);

    return () => clearInterval(timer);
  }, [isMonitoring, sittingLimit]);

  const resetWaterTimer   = () => setWaterTime(waterLimit);
  const resetEyeTimer     = () => setEyeTime(eyeLimit);
  const resetSittingTimer = () => setSittingTime(0);

  return {
    sittingTime,
    waterTime,
    eyeTime,
    idleState,
    setIdleState,
    resetWaterTimer,
    resetEyeTimer,
    resetSittingTimer,
    setSittingTime,
  };
};

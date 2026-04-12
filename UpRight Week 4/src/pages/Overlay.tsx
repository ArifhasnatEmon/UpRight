import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingAlert } from '../components/FloatingAlert';
import { SystemTray } from '../components/SystemTray';
import { PostureState, AlertPosition } from '../types';

export interface OverlayState {
  postureState: PostureState;
  isMonitoring: boolean;
  showAlert: boolean;
  alertPosition: AlertPosition;
  reminderAlert: { type: 'water' | 'eye' | 'sitting'; message: string } | null;
  toastMessage: string | null;
  snoozeRemainingMinutes: number | null;
  showBubble: boolean;
  theme?: 'light' | 'dark';
  soundEnabled?: boolean;
  soundVolume?: number;
  soundPreset?: 'default' | 'gentle' | 'chime' | 'silent';
}

const REMINDER_AUTO_DISMISS_MS = 15000;
const TOAST_DISPLAY_MS = 5000;

const REMINDER_CONFIG = {
  water: {
    emoji: '💧',
    title: 'Hydration Reminder',
    border: 'border-blue-200 dark:border-blue-500/30',
    indicator: 'bg-blue-500',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
    btnSecondary: 'bg-tint-blue hover:bg-tint-blue-strong text-blue-900 dark:text-blue-300',
  },
  eye: {
    emoji: '👁️',
    title: 'Eye Strain Break',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    indicator: 'bg-indigo-500',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    btnSecondary: 'bg-tint-indigo hover:bg-tint-indigo-strong text-indigo-900 dark:text-indigo-300',
  },
  sitting: {
    emoji: '🧘',
    title: 'Sitting Break',
    border: 'border-amber-200 dark:border-amber-500/30',
    indicator: 'bg-amber-500',
    btnPrimary: 'bg-amber-500 hover:bg-amber-600 text-white',
    btnSecondary: 'bg-tint-amber hover:bg-tint-amber-strong text-amber-900 dark:text-amber-300',
  },
};

export const Overlay: React.FC = () => {
  const [state, setState] = useState<OverlayState | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const trayOpenRef = useRef(false);
  const alertVisibleRef = useRef(false);
  const reminderVisibleRef = useRef(false);
  const lastToastRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef<number>(0);

  useEffect(() => { trayOpenRef.current = trayOpen; }, [trayOpen]);
  useEffect(() => { alertVisibleRef.current = state?.showAlert ?? false; }, [state?.showAlert]);
  useEffect(() => { reminderVisibleRef.current = !!state?.reminderAlert; }, [state?.reminderAlert]);

  // Sync theme
  useEffect(() => {
    if (state?.theme) {
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    }
  }, [state?.theme]);

  useEffect(() => {
    const now = Date.now();
    if (state?.toastMessage && (state.toastMessage !== lastToastRef.current || now - lastToastTimeRef.current > 3000)) {
      lastToastRef.current = state.toastMessage;
      lastToastTimeRef.current = now;
      setToastText(state.toastMessage);
      setShowToast(true);
      const timer = setTimeout(() => { setShowToast(false); }, TOAST_DISPLAY_MS);
      return () => clearTimeout(timer);
    } else if (!state?.toastMessage) {
      lastToastRef.current = null;
    }
  }, [state?.toastMessage]);

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';
    if (window.electronAPI?.onOverlayStateUpdated) {
      const cleanup = window.electronAPI.onOverlayStateUpdated((newState) => { setState(newState); });
      return cleanup;
    }
  }, []);

  useEffect(() => {
    const safetyInterval = setInterval(() => {
      if (!trayOpenRef.current && !alertVisibleRef.current && !reminderVisibleRef.current) {
        window.electronAPI?.setIgnoreMouseEvents?.(true);
      }
    }, 3000);
    return () => clearInterval(safetyInterval);
  }, []);

  const handleMouseEnter = useCallback(() => { window.electronAPI?.setIgnoreMouseEvents?.(false); }, []);
  const handleMouseLeave = useCallback(() => { if (!trayOpenRef.current) { window.electronAPI?.setIgnoreMouseEvents?.(true); } }, []);

  useEffect(() => {
    if (trayOpen) { window.electronAPI?.setIgnoreMouseEvents?.(false); }
    else { const timer = setTimeout(() => { window.electronAPI?.setIgnoreMouseEvents?.(true); }, 100); return () => clearTimeout(timer); }
  }, [trayOpen]);

  useEffect(() => {
    if (state?.reminderAlert) { window.electronAPI?.setIgnoreMouseEvents?.(false); }
    else if (!trayOpenRef.current && !alertVisibleRef.current) {
      const timer = setTimeout(() => { window.electronAPI?.setIgnoreMouseEvents?.(true); }, 100);
      return () => clearTimeout(timer);
    }
  }, [state?.reminderAlert]);

  useEffect(() => {
    if (state?.reminderAlert) {
      const timer = setTimeout(() => { window.electronAPI?.sendOverlayAction?.('reminder-snooze'); }, REMINDER_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [state?.reminderAlert]);

  if (!state) return null;

  const reminderConfig = state.reminderAlert ? REMINDER_CONFIG[state.reminderAlert.type] : null;
  const isAchievement = toastText?.startsWith('🏆') || toastText?.includes('Achievement');
  const isLevelUp = toastText?.includes('Level Up') || toastText?.startsWith('⬆️');

  const getReminderPosition = (pos: AlertPosition) => {
    switch (pos) {
      case 'top': return 'top-32 left-1/2 -translate-x-1/2';
      case 'bottom': return 'bottom-32 left-1/2 -translate-x-1/2';
      case 'top-right': return 'top-32 right-8';
      case 'top-left': return 'top-32 left-8';
      case 'bottom-right': return 'bottom-32 right-8';
      case 'bottom-left': return 'bottom-32 left-8';
      default: return 'bottom-24 right-6';
    }
  };

  const getToastPosition = (pos: AlertPosition) => {
    switch (pos) {
      case 'top': return 'top-6 left-1/2 -translate-x-1/2';
      case 'bottom': return 'bottom-6 left-1/2 -translate-x-1/2';
      case 'top-right': return 'top-6 right-8';
      case 'top-left': return 'top-6 left-8';
      case 'bottom-right': return 'bottom-6 right-8';
      case 'bottom-left': return 'bottom-6 left-8';
      default: return 'top-6 left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div className="w-full h-full overflow-hidden absolute inset-0 pointer-events-none z-[99999]">
      {/* Posture Alert */}
      <FloatingAlert
        state={state.postureState}
        isVisible={state.showAlert}
        onDismiss={() => window.electronAPI?.sendOverlayAction?.('dismiss')}
        onSnooze={(duration) => window.electronAPI?.sendOverlayAction?.('snooze', duration)}
        position={state.alertPosition}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="pointer-events-auto"
        soundSettings={{
          soundEnabled: state.soundEnabled ?? true,
          soundVolume: state.soundVolume ?? 0.5,
          soundPreset: state.soundPreset ?? 'default',
        }}
      />

      {/* Health Reminder Alert */}
      <AnimatePresence>
        {state.reminderAlert && reminderConfig && (
          <motion.div
            key={`reminder-${state.reminderAlert.type}`}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
            className={`pointer-events-auto fixed z-[99999] w-[370px] ${getReminderPosition(state.alertPosition)}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`relative overflow-hidden rounded-2xl shadow-xl bg-card border ${reminderConfig.border}`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-inset overflow-hidden">
                <motion.div className={`h-full ${reminderConfig.indicator}`} initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: REMINDER_AUTO_DISMISS_MS / 1000, ease: 'linear' }} />
              </div>
              <div className="relative z-10 p-5 mt-1">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-inset flex items-center justify-center text-2xl shrink-0 border border-edge-subtle">
                    {reminderConfig.emoji}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="font-display font-bold text-[14px] text-fg tracking-tight leading-tight">{reminderConfig.title}</p>
                    <p className="text-[12px] text-fg-muted mt-1 leading-snug">{state.reminderAlert.message}</p>
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => window.electronAPI?.sendOverlayAction?.('reminder-snooze')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors border border-edge ${reminderConfig.btnSecondary}`}>
                        Snooze 15m
                      </button>
                      <button onClick={() => window.electronAPI?.sendOverlayAction?.('reminder-done')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm ${reminderConfig.btnPrimary}`}>
                        Done ✓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && toastText && (
          <motion.div
            key={toastText}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`pointer-events-auto fixed z-[99999] cursor-pointer ${getToastPosition(state.alertPosition)}`}
            onClick={() => setShowToast(false)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="relative overflow-hidden rounded-2xl shadow-xl bg-card border border-edge px-6 py-3">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-inset overflow-hidden">
                <motion.div
                  className={`h-full ${isLevelUp ? 'bg-violet-500' : isAchievement ? 'bg-amber-500' : 'bg-brand-500'}`}
                  initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: TOAST_DISPLAY_MS / 1000, ease: 'linear' }}
                />
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex items-center justify-center text-xl shrink-0">
                  {isAchievement ? '🏆' : isLevelUp ? '⬆️' : '✨'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-fg tracking-tight">
                    {toastText.replace(/^🏆\s*/, '').replace(/^⬆️\s*/, '')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Tray Bubble */}
      {state.showBubble && (
        <SystemTray
          isOpen={trayOpen}
          onToggle={() => setTrayOpen(!trayOpen)}
          onClose={() => setTrayOpen(false)}
          onAction={(action) => { window.electronAPI?.sendOverlayAction?.(action); setTrayOpen(false); }}
          postureState={state.postureState}
          isMonitoring={state.isMonitoring}
          snoozeRemainingMinutes={state.snoozeRemainingMinutes}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="pointer-events-auto"
        />
      )}
    </div>
  );
};

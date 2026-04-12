import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, AlertTriangle, X, Bell } from 'lucide-react';
import { PostureState, AlertPosition, AppSettings } from '../types';
import { cn } from '../utils';
import { playSound } from '../lib/audio';

interface FloatingAlertProps {
  state: PostureState;
  isVisible: boolean;
  onDismiss: () => void;
  onSnooze: (duration: number) => void;
  position: AlertPosition;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  soundSettings?: Pick<AppSettings, 'soundEnabled' | 'soundVolume' | 'soundPreset'>;
}

const AUTO_DISMISS_MS = 8000;

const ALERT_CONFIG = {
  good: {
    icon: <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
    title: 'Great Posture!',
    message: 'Keep it up, your back will thank you.',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    indicator: 'bg-emerald-500'
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    title: 'Posture Warning',
    message: 'You are starting to slouch. Sit up straight.',
    border: 'border-amber-200 dark:border-amber-500/30',
    indicator: 'bg-amber-500'
  },
  critical: {
    icon: <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />,
    title: 'Critical Posture',
    message: 'Heavy slouching detected! Take a break or adjust your seat.',
    border: 'border-red-200 dark:border-red-500/30',
    indicator: 'bg-red-500'
  },
  too_close: {
    icon: <AlertCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
    title: 'Too Close to Screen',
    message: 'Please move back to protect your eyes.',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    indicator: 'bg-indigo-500'
  },
  disabled: {
    icon: <X className="w-6 h-6 text-fg-muted" />,
    title: 'Monitoring Disabled',
    message: 'You are too far away for posture monitoring.',
    border: 'border-edge',
    indicator: 'bg-fg-faint'
  }
};

export const FloatingAlert: React.FC<FloatingAlertProps> = ({ state, isVisible, onDismiss, onSnooze, position, onMouseEnter, onMouseLeave, className, soundSettings }) => {
  const [clicked, setClicked] = useState(false);

  const config = ALERT_CONFIG[state] || ALERT_CONFIG.good;

  React.useEffect(() => {
    if (isVisible) {
      setClicked(false);
      playSound('alert', soundSettings);
      const timer = setTimeout(() => { onDismiss(); }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  const positionClasses = {
    'top': 'top-8 left-1/2 -translate-x-1/2',
    'bottom': 'bottom-8 left-1/2 -translate-x-1/2',
    'top-right': 'top-8 right-8',
    'top-left': 'top-8 left-8',
    'bottom-right': 'bottom-8 right-8',
    'bottom-left': 'bottom-8 left-8',
  }[position];

  const handleSnooze = (duration: number) => {
    if (clicked) return;
    setClicked(true);
    playSound('snooze', soundSettings);
    onSnooze(duration);
  };

  const handleDismiss = () => {
    if (clicked) return;
    setClicked(true);
    playSound('dismiss', soundSettings);
    onDismiss();
  };

  const entryDirection = position.startsWith('top') ? -20 : 20;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: entryDirection, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          className={cn("fixed z-[9999] w-[380px]", positionClasses, className)}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className={cn("relative overflow-hidden rounded-2xl shadow-xl border glass", config.border)}
            role="alertdialog"
            aria-labelledby="alert-title"
            aria-describedby="alert-desc"
          >
            {/* Auto-dismiss progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-inset overflow-hidden">
              <motion.div 
                className={cn("h-full", config.indicator)}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
              />
            </div>

            <div className="p-4 flex items-start gap-4 mt-1">
              <div className="p-2 rounded-full bg-inset shadow-sm border border-edge-subtle shrink-0" aria-hidden="true">
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 id="alert-title" className="font-display font-bold text-fg tracking-tight">{config.title}</h3>
                <p id="alert-desc" className="text-sm text-fg-muted mt-0.5 leading-snug">{config.message}</p>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleSnooze(15)}
                    disabled={clicked}
                    className="px-3 py-1.5 text-xs font-bold bg-inset border border-edge rounded-lg hover:bg-edge transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm text-fg-secondary"
                    aria-label="Snooze alerts for 15 minutes"
                  >
                    <Bell className="w-3.5 h-3.5" /> 15m
                  </button>
                  <button
                    onClick={() => handleSnooze(30)}
                    disabled={clicked}
                    className="px-3 py-1.5 text-xs font-bold bg-inset border border-edge rounded-lg hover:bg-edge transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm text-fg-secondary"
                    aria-label="Snooze alerts for 30 minutes"
                  >
                    <Bell className="w-3.5 h-3.5" /> 30m
                  </button>
                  <button
                    onClick={handleDismiss}
                    disabled={clicked}
                    className="px-4 py-1.5 text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button onClick={handleDismiss} disabled={clicked} className="text-fg-faint hover:text-fg-secondary disabled:opacity-50 p-1 rounded-md hover:bg-inset transition-colors shrink-0" aria-label="Dismiss alert">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

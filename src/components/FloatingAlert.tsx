import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, AlertTriangle, X, Bell } from 'lucide-react';
import { PostureState, AlertPosition } from '../types';
import { cn } from '../utils';
import { playSound } from '../lib/audio';

interface FloatingAlertProps {
  state: PostureState;
  isVisible: boolean;
  onDismiss: () => void;
  onSnooze: (duration: number) => void;
  position: AlertPosition;
}

// FloatingAlert component displays posture-related alerts to the user
export const FloatingAlert: React.FC<FloatingAlertProps> = ({ state, isVisible, onDismiss, onSnooze, position }) => {
  // Configuration for different posture states
  const config = {
    good: {
      icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
      title: 'Great Posture!',
      message: 'Keep it up, your back will thank you.',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200'
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      title: 'Posture Warning',
      message: 'You are starting to slouch. Sit up straight.',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    critical: {
      icon: <AlertCircle className="w-6 h-6 text-red-500" />,
      title: 'Critical Posture',
      message: 'Heavy slouching detected! Take a break or adjust your seat.',
      bg: 'bg-red-50',
      border: 'border-red-200'
    },
    too_close: {
      icon: <AlertCircle className="w-6 h-6 text-indigo-500" />,
      title: 'Too Close to Screen',
      message: 'Please move back to protect your eyes.',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200'
    },
    disabled: {
      icon: <X className="w-6 h-6 text-neutral-500" />,
      title: 'Monitoring Disabled',
      message: 'You are too far away for posture monitoring.',
      bg: 'bg-neutral-50',
      border: 'border-neutral-200'
    }
  }[state] || {
    icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
    title: 'Great Posture!',
    message: 'Keep it up, your back will thank you.',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  };

  const [progress, setProgress] = React.useState(100);

  // Timer to automatically dismiss the alert
  React.useEffect(() => {
    if (isVisible) {
      playSound('alert');
      setProgress(100);
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            setTimeout(onDismiss, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 50); // 5 seconds total (50ms * 100)
      return () => clearInterval(timer);
    }
  }, [isVisible, onDismiss]);

  // Map position prop to CSS classes
  const positionClasses = {
    'top': 'top-8 left-1/2 -translate-x-1/2',
    'bottom': 'bottom-8 left-1/2 -translate-x-1/2',
    'top-right': 'top-8 right-8',
    'top-left': 'top-8 left-8',
    'bottom-right': 'bottom-8 right-8',
    'bottom-left': 'bottom-8 left-8',
  }[position];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
          className={cn(
            "fixed z-[9999] w-full max-w-md p-4 rounded-2xl shadow-2xl border glass",
            positionClasses,
            config.bg,
            config.border
          )}
        >
          <div className="absolute bottom-0 left-0 h-1 bg-neutral-200 w-full rounded-b-2xl overflow-hidden">
            <motion.div 
              className="h-full bg-neutral-900"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-white shadow-sm">
              {config.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-neutral-900">{config.title}</h3>
              <p className="text-sm text-neutral-600 mt-1">{config.message}</p>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { playSound('snooze'); setTimeout(() => onSnooze(15), 0); }}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
                >
                  <Bell className="w-3 h-3" /> 15m
                </button>
                <button
                  onClick={() => { playSound('snooze'); setTimeout(() => onSnooze(30), 0); }}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
                >
                  <Bell className="w-3 h-3" /> 30m
                </button>
                <button
                  onClick={() => { playSound('dismiss'); setTimeout(onDismiss, 0); }}
                  className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button onClick={() => { playSound('dismiss'); setTimeout(onDismiss, 0); }} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

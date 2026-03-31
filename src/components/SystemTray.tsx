import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, BarChart3, Settings, Power, Minimize2, Maximize2, LogOut } from 'lucide-react';
import { cn } from '../utils';

import { PostureState } from '../types';

interface SystemTrayProps {
  isOpen: boolean;
  onToggle: () => void;
  onAction: (action: string) => void;
  postureState: PostureState;
  isMonitoring: boolean;
}

// SystemTray component provides quick access to app controls from the system tray
export const SystemTray: React.FC<SystemTrayProps> = ({ isOpen, onToggle, onAction, postureState, isMonitoring }) => {
  // Map posture state to status indicator color
  const statusColor = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    too_close: 'bg-indigo-500',
    disabled: 'bg-neutral-300'
  }[postureState] || 'bg-emerald-500';

  return (
    <div className="fixed bottom-4 right-4 z-[10000]">
      {/* Tray menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute bottom-full right-0 mb-4 w-64 glass rounded-2xl overflow-hidden"
        >
          <div className="p-4 border-bottom border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full animate-pulse", statusColor)} />
              <span className="text-sm font-display font-bold">Upright Background</span>
            </div>
          </div>

          {/* Menu actions */}
          <div className="p-2">
            <button
              onClick={() => onAction('dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Open Dashboard
            </button>
            <button
              onClick={() => onAction('pause')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Power className="w-4 h-4" /> {isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring'}
            </button>
            <button
              onClick={() => onAction('settings')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <div className="h-px bg-neutral-100 my-1" />
            <button
              onClick={() => onAction('exit')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> Exit Upright
            </button>
          </div>
        </motion.div>
      )}

      {/* Tray trigger button */}
      <button
        onClick={onToggle}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95",
          statusColor
        )}
      >
        <img src="/favicon.ico" className="w-6 h-6 invert brightness-0" alt="Upright" onError={(e) => e.currentTarget.style.display = 'none'} />
        {!isOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-neutral-900 flex items-center justify-center">
          <div className={cn("w-2 h-2 rounded-full", statusColor)} />
        </div>}
      </button>
    </div>
  );
};

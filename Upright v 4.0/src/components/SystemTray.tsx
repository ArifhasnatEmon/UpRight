import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Settings, Power, LogOut, EyeOff } from 'lucide-react';
import { cn } from '../utils';

import { PostureState } from '../types';

const TRAY_POSITION_KEY = 'upright_tray_position';

interface SystemTrayProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  onAction: (action: string) => void;
  postureState: PostureState;
  isMonitoring: boolean;
  snoozeRemainingMinutes?: number | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export const SystemTray: React.FC<SystemTrayProps> = ({ isOpen, onToggle, onClose, onAction, postureState, isMonitoring, snoozeRemainingMinutes, onMouseEnter, onMouseLeave, className }) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(TRAY_POSITION_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { x: window.innerWidth - 64, y: window.innerHeight - 64 };
  });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const statusColor = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    too_close: 'bg-indigo-500',
    disabled: 'bg-neutral-300 dark:bg-neutral-600'
  }[postureState] || 'bg-emerald-500';

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
    const newX = Math.max(8, Math.min(window.innerWidth - 56, dragStart.current.posX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - 56, dragStart.current.posY + dy));
    setPosition({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      try { localStorage.setItem(TRAY_POSITION_KEY, JSON.stringify(position)); } catch { /* ignore */ }
      if (!hasMoved.current) { onToggle(); }
    }
  }, [position, onToggle]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { onClose?.(); }
    };
    const timer = setTimeout(() => { document.addEventListener('mousedown', handleClickOutside); }, 50);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
  }, [isOpen, onClose]);

  return (
    <div 
      ref={containerRef}
      className={cn("fixed z-[10000]", className)}
      style={{ left: position.x, top: position.y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Tray menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute bottom-full right-0 mb-4 w-64 glass rounded-2xl overflow-hidden shadow-2xl"
          style={{ 
            ...(position.x > window.innerWidth - 280 ? { right: 0 } : { left: 0 }),
          }}
        >
          <div className="p-4 border-b border-edge-subtle bg-inset/50">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full animate-pulse", statusColor)} />
              <span className="text-sm font-display font-bold text-fg">UpRight Background</span>
            </div>
          </div>
          
          <div className="p-2">
            <button
              onClick={() => onAction('dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg-secondary hover:bg-inset rounded-lg transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Open Dashboard
            </button>
            <button
              onClick={() => onAction('pause')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg-secondary hover:bg-inset rounded-lg transition-colors"
            >
              <Power className="w-4 h-4" /> {isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring'}
            </button>
            <button
              onClick={() => onAction('settings')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg-secondary hover:bg-inset rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button
              onClick={() => onAction('hide-bubble')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-fg-secondary hover:bg-inset rounded-lg transition-colors"
            >
              <EyeOff className="w-4 h-4" /> Hide Bubble
            </button>
            <div className="h-px bg-edge-subtle my-1" />
            {snoozeRemainingMinutes && snoozeRemainingMinutes > 0 && (
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 bg-tint-amber rounded-lg mx-0">
                <span className="text-base">⏸</span>
                <span className="font-medium">Snoozed · {snoozeRemainingMinutes}m left</span>
              </div>
            )}
            <button
              onClick={() => onAction('exit')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-tint-red rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> Exit UpRight
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Tray trigger button */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing transition-shadow hover:shadow-xl select-none",
          statusColor
        )}
        title="Drag to move • Click to open menu"
      >
        <img src="/favicon.ico" className="w-6 h-6 invert brightness-0 pointer-events-none" alt="UpRight" onError={(e) => e.currentTarget.style.display = 'none'} />
        {!isOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-card rounded-full border-2 border-neutral-900 dark:border-white flex items-center justify-center pointer-events-none">
            <div className={cn("w-2 h-2 rounded-full", statusColor)} />
        </div>}
      </div>
    </div>
  );
};

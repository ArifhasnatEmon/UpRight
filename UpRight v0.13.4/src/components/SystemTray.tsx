import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Settings, Power, LogOut, EyeOff, Activity } from 'lucide-react';
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

// State-driven glow & color config
const STATE_CONFIG = {
  good: {
    label: 'Good',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    glowShadow: '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1)',
    ringGradient: 'conic-gradient(from 0deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981)',
    iconColor: '#34d399',
    iconGlow: 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.5))',
    pillBg: 'rgba(16, 185, 129, 0.15)',
    pillColor: '#34d399',
    dotBg: '#10b981',
    brandIconBg: 'rgba(16, 185, 129, 0.15)',
    scoreFill: 'linear-gradient(90deg, #10b981, #34d399)',
    breatheDuration: '3s',
  },
  warning: {
    label: 'Warning',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    glowShadow: '0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.1)',
    ringGradient: 'conic-gradient(from 0deg, #f59e0b, #fbbf24, #fde68a, #fbbf24, #f59e0b)',
    iconColor: '#fbbf24',
    iconGlow: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))',
    pillBg: 'rgba(245, 158, 11, 0.15)',
    pillColor: '#fbbf24',
    dotBg: '#f59e0b',
    brandIconBg: 'rgba(245, 158, 11, 0.15)',
    scoreFill: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    breatheDuration: '2s',
  },
  critical: {
    label: 'Critical',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    glowShadow: '0 0 25px rgba(239, 68, 68, 0.4), 0 0 50px rgba(239, 68, 68, 0.15)',
    ringGradient: 'conic-gradient(from 0deg, #ef4444, #f87171, #fca5a5, #f87171, #ef4444)',
    iconColor: '#f87171',
    iconGlow: 'drop-shadow(0 0 6px rgba(248, 113, 113, 0.5))',
    pillBg: 'rgba(239, 68, 68, 0.15)',
    pillColor: '#f87171',
    dotBg: '#ef4444',
    brandIconBg: 'rgba(239, 68, 68, 0.15)',
    scoreFill: 'linear-gradient(90deg, #ef4444, #f87171)',
    breatheDuration: '1.2s',
  },
  too_close: {
    label: 'Too Close',
    glowColor: 'rgba(99, 102, 241, 0.35)',
    glowShadow: '0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(99, 102, 241, 0.1)',
    ringGradient: 'conic-gradient(from 0deg, #6366f1, #818cf8, #a5b4fc, #818cf8, #6366f1)',
    iconColor: '#818cf8',
    iconGlow: 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.5))',
    pillBg: 'rgba(99, 102, 241, 0.15)',
    pillColor: '#818cf8',
    dotBg: '#6366f1',
    brandIconBg: 'rgba(99, 102, 241, 0.15)',
    scoreFill: 'linear-gradient(90deg, #6366f1, #818cf8)',
    breatheDuration: '2s',
  },
  disabled: {
    label: 'Disabled',
    glowColor: 'rgba(150, 150, 160, 0.15)',
    glowShadow: '0 0 10px rgba(150, 150, 160, 0.1)',
    ringGradient: 'conic-gradient(from 0deg, #6b7280, #9ca3af, #d1d5db, #9ca3af, #6b7280)',
    iconColor: '#9ca3af',
    iconGlow: 'none',
    pillBg: 'rgba(150, 150, 160, 0.15)',
    pillColor: '#9ca3af',
    dotBg: '#6b7280',
    brandIconBg: 'rgba(150, 150, 160, 0.15)',
    scoreFill: 'linear-gradient(90deg, #6b7280, #9ca3af)',
    breatheDuration: '4s',
  },
};

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

  const config = STATE_CONFIG[postureState] || STATE_CONFIG.good;

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

  const handlePointerUp = useCallback(() => {
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
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute bottom-full mb-4 w-[272px] rounded-[20px] overflow-hidden"
            style={{
              ...(position.x > window.innerWidth - 280 ? { right: -8 } : { left: -8 }),
              background: 'rgba(20, 20, 30, 0.85)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Menu header */}
            <div className="px-5 pt-[18px] pb-[14px]" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: config.brandIconBg }}>
                    <Activity className="w-4 h-4" style={{ color: config.iconColor }} />
                  </div>
                  <span className="text-[13px] font-bold text-white" style={{ letterSpacing: '-0.02em' }}>UpRight</span>
                </div>
                <div className="flex items-center gap-[5px] px-2.5 py-[3px] rounded-full" style={{ background: config.pillBg }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: config.dotBg }} />
                  <span className="text-[10px] font-bold uppercase" style={{ color: config.pillColor, letterSpacing: '0.06em' }}>{config.label}</span>
                </div>
              </div>
            </div>

            {/* Menu actions */}
            <div className="p-[6px_8px]">
              {[
                { icon: LayoutDashboard, label: 'Open Dashboard', action: 'dashboard' },
                { icon: Power, label: isMonitoring ? 'Pause Monitoring' : 'Resume Monitoring', action: 'pause' },
                { icon: Settings, label: 'Settings', action: 'settings' },
              ].map(item => (
                <button
                  key={item.action}
                  onClick={() => onAction(item.action)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.06]"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 600, letterSpacing: '-0.01em' }}
                >
                  <item.icon className="w-[17px] h-[17px] opacity-50" />
                  {item.label}
                </button>
              ))}

              <div className="h-px mx-3 my-[2px]" style={{ background: 'rgba(255,255,255,0.06)' }} />

              {snoozeRemainingMinutes && snoozeRemainingMinutes > 0 && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mx-0" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', fontSize: '13px', fontWeight: 600 }}>
                  <span className="text-base">⏸</span>
                  <span>Snoozed · {snoozeRemainingMinutes}m left</span>
                </div>
              )}

              <button
                onClick={() => onAction('hide-bubble')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-white/[0.06]"
                style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 600 }}
              >
                <EyeOff className="w-[17px] h-[17px] opacity-50" />
                Hide Bubble
              </button>

              <button
                onClick={() => onAction('exit')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-red-500/10"
                style={{ color: 'rgba(248, 113, 113, 0.7)', fontSize: '13px', fontWeight: 600 }}
              >
                <LogOut className="w-[17px] h-[17px] opacity-50" />
                Exit UpRight
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none relative transition-transform duration-300 hover:scale-110 active:scale-95"
        title="Drag to move · Click to open menu"
        style={{ willChange: 'transform' }}
      >
        {/* Glow layer */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '-4px',
            background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
            boxShadow: config.glowShadow,
            animation: `breathe ${config.breatheDuration} ease-in-out infinite`,
          }}
        />

        {/* Gradient ring */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '-1.5px',
            padding: '1.5px',
            background: config.ringGradient,
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'rgba(10, 10, 15, 0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          />
        </div>

        {/* Glass layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
          }}
        />

        {/* Icon */}
        <Activity
          className="relative z-10 w-[22px] h-[22px] pointer-events-none"
          style={{
            color: config.iconColor,
            filter: config.iconGlow,
            transition: 'color 0.3s, filter 0.3s',
          }}
        />
      </div>

      {/* Breathe keyframe (injected once) */}
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
};

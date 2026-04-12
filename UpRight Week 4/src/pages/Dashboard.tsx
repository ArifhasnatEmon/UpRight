import React from 'react';
import { getThresholdForLevel } from '../lib/constants';
import { motion } from 'motion/react';
import { Camera, Shield, CheckCircle2, Zap, Timer, Droplets, Eye, Activity, BellOff } from 'lucide-react';
import { AdvancedHealthMonitor } from '../components/AdvancedHealthMonitor';
import { AppSettings, UserProfile, PostureState, CalibrationData } from '../types';
import { cn } from '../utils';

interface DashboardProps {
  isMonitoring: boolean;
  setIsMonitoring: (val: boolean) => void;
  settings: AppSettings;
  user: UserProfile;
  postureScore: number;
  postureState: PostureState;
  sittingTime: number;
  waterTime: number;
  eyeTime: number;
  snoozeMinutesLeft: number | null;
  resetWaterTimer: () => void;
  resetEyeTimer: () => void;
  resetSittingTimer: () => void;
  onStateChange: (state: PostureState, score: number) => void;
  calibration: CalibrationData | null;
  onCalibrationUpdate: (data: CalibrationData | null) => void;
}

// Dashboard component
export const Dashboard: React.FC<DashboardProps> = ({
  isMonitoring,
  setIsMonitoring,
  settings,
  user,
  postureScore,
  postureState,
  sittingTime,
  waterTime,
  eyeTime,
  snoozeMinutesLeft,
  resetWaterTimer,
  resetEyeTimer,
  resetSittingTimer,
  onStateChange,
  calibration,
  onCalibrationUpdate
}) => {
  return (
    <div className="space-y-4" role="region" aria-label="Dashboard">
      <div className="grid grid-cols-3 gap-4">
        {/* Live monitor */}
        <div className="col-span-2 glass rounded-[2rem] p-6 space-y-4 relative overflow-hidden" role="region" aria-label="Live posture detection">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold flex items-center gap-2 text-fg">
                <Camera className="w-5 h-5 text-brand-600 dark:text-brand-400" /> Live Detection
              </h2>
              <p className="text-xs text-fg-muted">Face, Eye & Neck Tracking Active</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tint-brand text-brand-700 dark:text-brand-400 text-[10px] font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" /> Local Processing
            </div>
          </div>
          
          {/* Health monitor */}
          <AdvancedHealthMonitor 
            isActive={isMonitoring} 
            onStateChange={onStateChange} 
            frameRate={settings.frameRate} 
            postureSensitivity={settings.postureSensitivity}
            lowResourceMode={settings.lowResourceMode}
            showSkeleton={true}
            calibration={calibration}
          />

          {/* Toggle monitoring */}
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
              isMonitoring
                ? "bg-inset border-edge text-fg-secondary hover:bg-tint-red hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/30"
                : "bg-tint-brand border-brand-200 dark:border-brand-500/30 text-brand-700 dark:text-brand-400"
            )}
            aria-label={isMonitoring ? "Pause posture monitoring" : "Resume posture monitoring"}
          >
            {isMonitoring ? (
              <>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-3 bg-current rounded-sm" />
                  <span className="w-1.5 h-3 bg-current rounded-sm" />
                </span>
                Pause Monitoring
              </>
            ) : (
              <>
                <span className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-current" />
                Resume Monitoring
              </>
            )}
          </button>

          {/* Privacy mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-inset border border-edge-subtle relative z-10">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-medium text-fg-secondary">Privacy Mode: No video stored or transmitted</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Verified</span>
            </div>
          </div>
        </div>

        {/* Health timers */}
        <div className="space-y-4">
          {/* Health score */}
          <div className="glass rounded-[2rem] p-6 overflow-hidden relative group" role="region" aria-label="Health score">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-fg-faint text-[10px] font-bold uppercase tracking-widest">Health Score</p>
                <div className="w-8 h-8 rounded-lg bg-tint-brand flex items-center justify-center" aria-hidden="true">
                  <Zap className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
              <div className="flex items-end gap-1" aria-live="polite" aria-atomic="true">
                <h3 className="text-5xl font-display font-bold leading-none text-fg">{typeof postureScore === 'number' && !isNaN(postureScore) ? postureScore : 0}</h3>
                <span className="text-brand-600 dark:text-brand-400 font-bold mb-1 text-lg">%</span>
              </div>
              <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-brand-500 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${postureScore ?? 0}%` }}
                />
              </div>
              {/* XP progress */}
              {(() => {
                const xpRemaining = Math.max(0, getThresholdForLevel(user.level + 1) - user.xp);
                return (
                  <p className="text-[10px] text-fg-faint font-bold uppercase tracking-wider">
                    Level {user.level} • {xpRemaining} XP to Level {user.level + 1}
                  </p>
                );
              })()}
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Activity className="w-32 h-32 text-brand-500" />
            </div>
          </div>

          {/* Timer card */}
          <div className="glass rounded-[2rem] p-6 space-y-4" role="region" aria-label="Health timers">
            <h3 className="font-display font-bold text-base text-fg">Health Timers</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Sitting timer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-inset border border-edge-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-tint-brand-strong flex items-center justify-center">
                    <Timer className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-fg-faint uppercase">Sitting</p>
                    <p className="text-sm font-bold text-fg">{Math.floor(sittingTime / 60)}h {sittingTime % 60}m</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-brand-600 dark:text-brand-400 uppercase">Limit: {settings.reminders.sittingInterval}m</p>
                </div>
              </div>

              {/* Water timer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-inset border border-edge-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-tint-blue-strong flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-fg-faint uppercase">Water</p>
                    <p className="text-sm font-bold text-fg">{waterTime}m left</p>
                  </div>
                </div>
                <button onClick={resetWaterTimer} className="p-1.5 hover:bg-tint-blue-strong rounded-lg transition-colors" aria-label="Mark water as consumed, reset timer">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
              </div>

              {/* Eye strain timer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-inset border border-edge-subtle">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-tint-indigo-strong flex items-center justify-center">
                    <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-fg-faint uppercase">Eye Strain</p>
                    <p className="text-sm font-bold text-fg">{eyeTime}m left</p>
                  </div>
                </div>
                <button onClick={resetEyeTimer} className="p-1.5 hover:bg-tint-indigo-strong rounded-lg transition-colors" aria-label="Mark eye break as taken, reset timer">
                   <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </button>
              </div>

              {/* Snooze indicator */}
              {snoozeMinutesLeft && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-tint-amber border border-amber-200 dark:border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-tint-amber-strong flex items-center justify-center">
                      <BellOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-amber-500 dark:text-amber-400 uppercase">Alerts Snoozed</p>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{snoozeMinutesLeft}m left</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-amber-500 dark:text-amber-400 uppercase">Paused</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { motion } from 'motion/react';
import { Camera, Shield, CheckCircle2, Zap, Timer, Droplets, Eye, Activity } from 'lucide-react';
import { AdvancedHealthMonitor } from '../components/AdvancedHealthMonitor';
import { AppSettings, UserProfile, PostureState } from '../types';
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
  resetWaterTimer: () => void;
  resetEyeTimer: () => void;
  onStateChange: (state: PostureState, score: number) => void;
}

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
  resetWaterTimer,
  resetEyeTimer,
  onStateChange
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Live posture monitoring section */}
        <div className="col-span-2 glass rounded-[2rem] p-6 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand-600" /> Live Detection
              </h2>
              <p className="text-xs text-neutral-500">Face, Eye & Neck Tracking Active</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" /> Local Processing
            </div>
          </div>

          {/* Posture monitoring — shows "No camera detected" in demo */}
          <AdvancedHealthMonitor
            isActive={isMonitoring}
            onStateChange={onStateChange}
            frameRate={settings.frameRate}
            postureSensitivity={settings.postureSensitivity}
            lowResourceMode={settings.lowResourceMode}
            showSkeleton={true}
          />

          {/* Monitoring toggle button */}
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={cn(
              "w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
              isMonitoring
                ? "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                : "bg-brand-50 border-brand-200 text-brand-700"
            )}
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

          {/* Privacy notice */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100 relative z-10">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-medium text-neutral-600">Privacy Mode: No video stored or transmitted</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Verified</span>
            </div>
          </div>
        </div>

        {/* Health metrics and timers section */}
        <div className="space-y-4">
          {/* Health score card */}
          <div className="glass rounded-[2rem] p-6 bg-neutral-900 text-white overflow-hidden relative group">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest">Health Score</p>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-brand-400" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <h3 className="text-5xl font-display font-bold leading-none">{postureScore}</h3>
                <span className="text-brand-400 font-bold mb-1 text-sm">/ 100</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-brand-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${postureScore}%` }}
                />
              </div>
              {/* XP progress display */}
              {(() => {
                const getThresholdForLevel = (level: number): number => {
                  const thresholds = [0, 0, 100, 250, 500, 1000];
                  if (level < thresholds.length) return thresholds[level];
                  return 1000 + (level - 5) * 750;
                };
                const xpRemaining = Math.max(0, getThresholdForLevel(user.level + 1) - user.xp);
                return (
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    Level {user.level} • {xpRemaining} XP to Level {user.level + 1}
                  </p>
                );
              })()}
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="w-32 h-32" />
            </div>
          </div>

          {/* Health timers card */}
          <div className="glass rounded-[2rem] p-6 space-y-4">
            <h3 className="font-display font-bold text-base">Health Timers</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Sitting timer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Timer className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase">Sitting</p>
                    <p className="text-sm font-bold">{Math.floor(sittingTime / 60)}h {sittingTime % 60}m</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-brand-600 uppercase">Limit: {settings.reminders.sittingInterval}m</p>
                </div>
              </div>

              {/* Water timer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase">Water</p>
                    <p className="text-sm font-bold">{waterTime}m left</p>
                  </div>
                </div>
                <button onClick={resetWaterTimer} className="p-1.5 hover:bg-blue-200 rounded-lg transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              {/* Eye strain timer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-neutral-400 uppercase">Eye Strain</p>
                    <p className="text-sm font-bold">{eyeTime}m left</p>
                  </div>
                </div>
                <button onClick={resetEyeTimer} className="p-1.5 hover:bg-indigo-200 rounded-lg transition-colors">
                  <Eye className="w-4 h-4 text-indigo-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

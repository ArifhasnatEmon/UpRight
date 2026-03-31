import React from 'react';
import { PostureState } from '../types';
import { cn } from '../utils';

interface AdvancedHealthMonitorProps {
  onStateChange: (state: PostureState, score: number) => void;
  isActive: boolean;
  frameRate: number;
  postureSensitivity: number;
  lowResourceMode?: boolean;
  showSkeleton?: boolean;
}

export const AdvancedHealthMonitor: React.FC<AdvancedHealthMonitorProps> = ({ isActive }) => {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
      {isActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-white font-bold mb-2">Camera Not Detected</p>
          <p className="text-neutral-400 text-xs max-w-[240px] mb-4">
            No camera detected. Please connect a webcam to use posture monitoring.
          </p>
          <button
            className="px-4 py-2 bg-white text-neutral-900 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm font-mono">
          MONITORING PAUSED
        </div>
      )}
    </div>
  );
};

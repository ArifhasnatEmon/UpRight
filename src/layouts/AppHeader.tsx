import React from 'react';
import { Activity, LogOut } from 'lucide-react';
import { PostureState } from '../types';
import { cn } from '../utils';

interface AppHeaderProps {
  postureState: PostureState;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ postureState, onLogout }) => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-neutral-200 flex items-center justify-between px-8 shrink-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-display font-bold text-xl tracking-tight">Upright</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-4 py-1.5 bg-neutral-100 rounded-full border border-neutral-100">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
            postureState === 'good' ? 'bg-emerald-500 shadow-emerald-500/50' :
              postureState === 'warning' ? 'bg-amber-500 shadow-amber-500/50' :
                'bg-red-500 shadow-red-500/50'
          )} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{postureState} Mode</span>
        </div>
        <div className="h-6 w-px bg-neutral-200" />
        <div className="flex items-center gap-2">
          {/* @ts-ignore */}
          {window.electronAPI && (
            <button
              onClick={() => (window as any).electronAPI?.minimizeWindow?.()}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-500"
              title="Minimize to tray"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button onClick={onLogout} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors text-neutral-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

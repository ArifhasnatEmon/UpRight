import React from 'react';
import { Smartphone, Cpu, Activity, Timer, Eye, Droplets } from 'lucide-react';
import { AppSettings } from '../types';
import { cn } from '../utils';

interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onSave }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-bold">Settings</h2>
        <p className="text-xs text-neutral-500">Customize your ergonomic experience</p>
      </div>
      
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Alert Customization</h3>
        <div className="glass rounded-[2rem] p-6">
          <p className="font-bold text-sm mb-3">Posture Sensitivity</p>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={settings.postureSensitivity} 
            onChange={(e) => setSettings(s => ({ ...s, postureSensitivity: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-2">
            <span>Relaxed</span>
            <span>Strict</span>
          </div>
        </div>
        
        <div className="glass rounded-[2rem] p-6">
          <p className="font-bold text-sm mb-3">Alert Position</p>
          <div className="grid grid-cols-3 gap-2">
            {(['top-left', 'top', 'top-right', 'bottom-left', 'bottom', 'bottom-right'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setSettings(s => ({ ...s, alertPosition: pos }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  settings.alertPosition === pos ? "bg-brand-500 text-white" : "bg-neutral-100 hover:bg-neutral-200"
                )}
              >
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Performance</h3>
        <div className="glass rounded-[2rem] divide-y divide-neutral-100 overflow-hidden">
          <div className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Run in background</p>
                <p className="text-[10px] text-neutral-500">Continue monitoring when closed.</p>
              </div>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, runInBackground: !s.runInBackground }))}
              className={cn("w-12 h-6 rounded-full transition-all relative", settings.runInBackground ? "bg-brand-500" : "bg-neutral-200")}
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.runInBackground ? "left-7" : "left-1")} />
            </button>
          </div>
          <div className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Low Resource Mode</p>
                <p className="text-[10px] text-neutral-500">Reduce AI precision.</p>
              </div>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, lowResourceMode: !s.lowResourceMode }))}
              className={cn("w-12 h-6 rounded-full transition-all relative", settings.lowResourceMode ? "bg-brand-500" : "bg-neutral-200")}
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.lowResourceMode ? "left-7" : "left-1")} />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Reminders</h3>
        
        {/* Posture toggle — interval নেই তাই আলাদা */}
        <div className="glass rounded-[1.5rem] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-50">
              <Activity className="w-4 h-4 text-brand-600" />
            </div>
            <span className="font-bold text-xs">Posture Alerts</span>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, reminders: { ...s.reminders, posture: !s.reminders.posture } }))}
            className={cn("w-8 h-4 rounded-full transition-all relative", settings.reminders.posture ? "bg-brand-500" : "bg-neutral-200")}
          >
            <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", settings.reminders.posture ? "right-0.5" : "left-0.5")} />
          </button>
        </div>

        {/* Interval controls */}
        <div className="space-y-3">
          {[
            { 
              id: 'sitting', 
              label: 'Sitting Break', 
              icon: Timer, 
              color: 'text-amber-600', 
              bg: 'bg-amber-50',
              intervalKey: 'sittingInterval' as const,
              min: 30, max: 120, step: 15,
              unit: 'min'
            },
            { 
              id: 'eyeStrain', 
              label: 'Eye Strain (20-20-20)', 
              icon: Eye, 
              color: 'text-indigo-600', 
              bg: 'bg-indigo-50',
              intervalKey: 'eyeStrainInterval' as const,
              min: 10, max: 60, step: 5,
              unit: 'min'
            },
            { 
              id: 'water', 
              label: 'Hydration Reminder', 
              icon: Droplets, 
              color: 'text-blue-600', 
              bg: 'bg-blue-50',
              intervalKey: 'waterInterval' as const,
              min: 30, max: 180, step: 15,
              unit: 'min'
            },
          ].map(item => (
            <div key={item.id} className="glass rounded-[1.5rem] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.bg)}>
                    <item.icon className={cn("w-4 h-4", item.color)} />
                  </div>
                  <span className="font-bold text-xs">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-brand-600">
                    {settings.reminders[item.intervalKey]} min
                  </span>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, reminders: { ...s.reminders, [item.id]: !s.reminders[item.id as keyof typeof s.reminders] } }))}
                    className={cn("w-8 h-4 rounded-full transition-all relative", settings.reminders[item.id as keyof typeof settings.reminders] ? "bg-brand-500" : "bg-neutral-200")}
                  >
                    <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", settings.reminders[item.id as keyof typeof settings.reminders] ? "right-0.5" : "left-0.5")} />
                  </button>
                </div>
              </div>
              {settings.reminders[item.id as keyof typeof settings.reminders] && (
                <div className="space-y-1">
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={settings.reminders[item.intervalKey]}
                    onChange={(e) => setSettings(s => ({
                      ...s,
                      reminders: { ...s.reminders, [item.intervalKey]: parseInt(e.target.value) }
                    }))}
                    className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-400">
                    <span>{item.min} min</span>
                    <span>{item.max} min</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <button 
        onClick={onSave}
        className="w-full py-4 bg-neutral-900 text-white rounded-[1.5rem] font-bold hover:bg-neutral-800 transition-all shadow-xl"
      >
        Save All Changes
      </button>
    </div>
  );
};

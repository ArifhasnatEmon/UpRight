import React from 'react';
import { Smartphone, Cpu, Activity, Timer, Eye, Droplets, Moon, Sun, Monitor, Target, RotateCcw, Volume2, VolumeX, Circle } from 'lucide-react';
import { AppSettings, HardwareProfile, CalibrationData } from '../types';
import { cn } from '../utils';
import { clearCalibration } from '../lib/posture/calibration';
import { CalibrationWizard } from '../components/CalibrationWizard';
import { getHardwareProfile } from '../lib/hardwareProfile';
import { playSound } from '../lib/audio';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`
}));


interface SettingsProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onSave: () => void;
  calibration: CalibrationData | null;
  onCalibrationUpdate: (data: CalibrationData | null) => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings, onSave, calibration, onCalibrationUpdate }) => {
  const [hardware, setHardware] = React.useState<HardwareProfile | null>(null);
  const [isCalibrating, setIsCalibrating] = React.useState(false);

  // Calibration staleness
  const isCalibrationStale = React.useMemo(() => {
    if (!calibration) return false;
    const daysOld = (Date.now() - new Date(calibration.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysOld > 30;
  }, [calibration]);

  React.useEffect(() => {
    getHardwareProfile().then(profile => setHardware(profile));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-bold text-fg">Settings</h2>
        <p className="text-xs text-fg-muted">Customize your ergonomic experience</p>
      </div>

      {/* Theme settings */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">Appearance</h3>
        <div className="glass rounded-[2rem] p-6">
          <p className="font-bold text-sm mb-4 text-fg">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'light' as const, icon: Sun, label: 'Light' },
              { id: 'dark' as const, icon: Moon, label: 'Dark' },
              { id: 'system' as const, icon: Monitor, label: 'System' },
            ]).map(item => (
              <button
                key={item.id}
                onClick={() => setSettings(s => ({ ...s, theme: item.id }))}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  settings.theme === item.id
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                    : "bg-inset text-fg-secondary hover:bg-edge-subtle hover:text-fg border border-edge-subtle"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Bubble Toggle */}
        <div className="glass rounded-[2rem] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tint-emerald flex items-center justify-center">
              <Circle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-fg">Show Desktop Bubble</p>
              <p className="text-[10px] text-fg-muted">Floating status indicator on your desktop.</p>
            </div>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, showBubble: !s.showBubble }))}
            className={cn("w-12 h-6 rounded-full transition-all relative", settings.showBubble ? "bg-brand-500" : "bg-edge")}
            role="switch" aria-checked={settings.showBubble} aria-label="Show desktop bubble"
          >
            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.showBubble ? "left-7" : "left-1")} />
          </button>
        </div>
      </section>
      
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">Alert Customization</h3>
        <div className="glass rounded-[2rem] p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-sm text-fg">Posture Sensitivity</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-display font-bold text-fg">{settings.postureSensitivity}</span>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                settings.postureSensitivity <= 3
                  ? "bg-tint-emerald text-emerald-600 dark:text-emerald-400"
                  : settings.postureSensitivity <= 6
                  ? "bg-tint-brand text-brand-600 dark:text-brand-400"
                  : "bg-tint-red text-red-600 dark:text-red-400"
              )}>
                {settings.postureSensitivity <= 3 ? 'Relaxed' : settings.postureSensitivity <= 6 ? 'Normal' : 'Strict'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-fg-muted mb-3">
            {settings.postureSensitivity <= 3
              ? 'Looser thresholds — fewer alerts, more forgiving of small movements.'
              : settings.postureSensitivity <= 6
              ? 'Balanced detection — standard sensitivity for most users.'
              : 'Tighter thresholds — more frequent alerts, stricter posture monitoring.'}
          </p>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={settings.postureSensitivity} 
            onChange={(e) => setSettings(s => ({ ...s, postureSensitivity: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-edge rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-fg-muted mt-2">
            <span>Relaxed</span>
            <span>Strict</span>
          </div>
        </div>

        {/* Calibration settings */}
        <div className="glass rounded-[2rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-sm text-fg">Posture Calibration</p>
              <p className="text-[10px] text-fg-muted">
                {calibration 
                  ? `Calibrated on ${new Date(calibration.timestamp).toLocaleDateString()}` 
                  : "Not calibrated (Using defaults)"}
              </p>
            </div>
            {calibration && (
              <button 
                onClick={() => {
                  clearCalibration();
                  onCalibrationUpdate(null);
                }}
                className="p-2 bg-inset hover:bg-edge rounded-lg text-fg-secondary transition-colors"
                title="Reset to Defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {isCalibrationStale && (
            <div className="mb-4 bg-tint-amber/50 border border-amber-500/20 px-3 py-2 rounded-lg flex items-start gap-2">
              <span className="text-amber-500 text-[10px] mt-0.5">⚠️</span>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                Calibration is 30+ days old — consider recalibrating for better accuracy.
              </p>
            </div>
          )}

          <button
            onClick={() => setIsCalibrating(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/20"
          >
            <Target className="w-4 h-4" />
            {calibration ? "Recalibrate Posture" : "Calibrate My Posture"}
          </button>
        </div>
        
        <div className="glass rounded-[2rem] p-6">
          <p className="font-bold text-sm mb-3 text-fg">Alert Position</p>
          <div className="grid grid-cols-3 gap-2">
            {(['top-left', 'top', 'top-right', 'bottom-left', 'bottom', 'bottom-right'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setSettings(s => ({ ...s, alertPosition: pos }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  settings.alertPosition === pos ? "bg-brand-500 text-white" : "bg-inset hover:bg-edge text-fg-secondary"
                )}
              >
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sound settings */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">Sound</h3>
        <div className="glass rounded-[2rem] p-6 space-y-5">
          {/* Volume control */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tint-brand flex items-center justify-center">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-fg-faint" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-fg">Alert Sounds</p>
                <p className="text-[10px] text-fg-muted">{settings.soundEnabled ? `Volume: ${Math.round(settings.soundVolume * 100)}%` : 'Muted'}</p>
              </div>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
              className={cn("w-12 h-6 rounded-full transition-all relative", settings.soundEnabled ? "bg-brand-500" : "bg-edge")}
              role="switch"
              aria-checked={settings.soundEnabled}
              aria-label="Toggle alert sounds"
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.soundEnabled ? "left-7" : "left-1")} />
            </button>
          </div>

          {settings.soundEnabled && (
            <>
              {/* Volume slider */}
              <div className="space-y-2">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={Math.round(settings.soundVolume * 100)} 
                  onChange={(e) => setSettings(s => ({ ...s, soundVolume: parseInt(e.target.value) / 100 }))}
                  className="w-full h-1.5 bg-edge rounded-lg appearance-none cursor-pointer accent-brand-500"
                  aria-label="Sound volume"
                />
                <div className="flex justify-between text-[10px] text-fg-muted">
                  <span>Quiet</span>
                  <span>Loud</span>
                </div>
              </div>

              {/* Sound preset */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-fg-secondary">Sound Preset</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { id: 'default' as const, label: 'Default', emoji: '🔔' },
                    { id: 'gentle' as const, label: 'Gentle', emoji: '🌙' },
                    { id: 'chime' as const, label: 'Chime', emoji: '🎵' },
                    { id: 'silent' as const, label: 'Silent', emoji: '🔇' },
                  ]).map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSettings(s => ({ ...s, soundPreset: preset.id }));
                        if (preset.id !== 'silent') {
                          playSound('alert', { soundEnabled: true, soundVolume: settings.soundVolume, soundPreset: preset.id });
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-xs font-bold transition-all",
                        settings.soundPreset === preset.id
                          ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                          : "bg-inset text-fg-secondary hover:bg-edge-subtle hover:text-fg border border-edge-subtle"
                      )}
                      aria-pressed={settings.soundPreset === preset.id}
                    >
                      <span className="text-base">{preset.emoji}</span>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test sound */}
              <button
                onClick={() => playSound('alert', settings)}
                className="w-full py-2 text-xs font-bold bg-inset border border-edge rounded-xl hover:bg-edge text-fg-secondary transition-colors"
              >
                🔊 Test Alert Sound
              </button>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">Performance</h3>
        <div className="glass rounded-[2rem] divide-y divide-edge-subtle overflow-hidden">
          <div className="p-6 flex items-center justify-between hover:bg-inset/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tint-brand flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-fg">Run in background</p>
                <p className="text-[10px] text-fg-muted">Continue monitoring when closed.</p>
              </div>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, runInBackground: !s.runInBackground }))}
              className={cn("w-12 h-6 rounded-full transition-all relative", settings.runInBackground ? "bg-brand-500" : "bg-edge")}
              role="switch" aria-checked={settings.runInBackground} aria-label="Run in background"
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.runInBackground ? "left-7" : "left-1")} />
            </button>
          </div>
          <div className="p-6 flex items-center justify-between hover:bg-inset/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tint-brand flex items-center justify-center">
                <Cpu className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-fg">Low Resource Mode</p>
                <p className="text-[10px] text-fg-muted">Reduce AI precision.</p>
              </div>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, lowResourceMode: !s.lowResourceMode }))}
              className={cn("w-12 h-6 rounded-full transition-all relative", settings.lowResourceMode ? "bg-brand-500" : "bg-edge")}
              role="switch" aria-checked={settings.lowResourceMode} aria-label="Low resource mode"
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", settings.lowResourceMode ? "left-7" : "left-1")} />
            </button>
          </div>
          <div className="p-6 flex items-center justify-between hover:bg-inset/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-tint-brand flex items-center justify-center">
                <Cpu className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-fg">Hardware Rating</p>
                <p className="text-[10px] text-fg-muted">
                  {hardware ? `${hardware.cpuCores} Cores Detected` : 'Scanning...'}
                </p>
              </div>
            </div>
            {hardware && (
              <div className={cn(
                "px-3 py-1 rounded-full text-xs font-bold capitalize",
                hardware.tier === 'high' ? "bg-tint-emerald text-emerald-600 dark:text-emerald-400" :
                hardware.tier === 'low' ? "bg-tint-amber text-amber-600 dark:text-amber-400" :
                "bg-tint-brand text-brand-600 dark:text-brand-400"
              )}>
                {hardware.tier} Tier
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-faint">Reminders</h3>
        
        {/* Posture toggle */}
        <div className="glass rounded-[1.5rem] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-tint-brand">
              <Activity className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <span className="font-bold text-xs text-fg">Posture Alerts</span>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, reminders: { ...s.reminders, posture: !s.reminders.posture } }))}
            className={cn("w-8 h-4 rounded-full transition-all relative", settings.reminders.posture ? "bg-brand-500" : "bg-edge")}
            role="switch"
            aria-checked={settings.reminders.posture}
            aria-label="Toggle posture alerts"
          >
            <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", settings.reminders.posture ? "right-0.5" : "left-0.5")} />
          </button>
        </div>

        {/* Quiet Hours */}
        <div className="glass rounded-[1.5rem] p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-tint-brand">
                <Moon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              </div>
              <span className="font-bold text-xs text-fg">Quiet Hours</span>
            </div>
            <button 
              onClick={() => setSettings(s => ({ ...s, quietHours: { ...s.quietHours, enabled: !s.quietHours.enabled } }))}
              className={cn("w-8 h-4 rounded-full transition-all relative", settings.quietHours.enabled ? "bg-brand-500" : "bg-edge")}
              role="switch"
              aria-checked={settings.quietHours.enabled}
              aria-label="Toggle quiet hours"
            >
              <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", settings.quietHours.enabled ? "right-0.5" : "left-0.5")} />
            </button>
          </div>
          {settings.quietHours.enabled && (
             <div className="flex gap-3 items-end pt-2 pb-1 transition-opacity">
               <div className="flex flex-col flex-1">
                 <label className="text-[9px] font-bold text-fg-faint uppercase tracking-widest mb-1.5">Start</label>
                 <select 
                   value={settings.quietHours.startHour}
                   onChange={e => setSettings(s => ({ ...s, quietHours: { ...s.quietHours, startHour: parseInt(e.target.value) || 0 } }))}
                   className="w-full appearance-none bg-inset border border-edge-subtle rounded-xl py-2 px-3 text-xs font-bold text-fg cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all hover:border-edge"
                 >
                   {HOUR_OPTIONS.map(h => <option key={`start-${h.value}`} value={h.value}>{h.label}</option>)}
                 </select>
               </div>
               <span className="text-fg-faint text-xs font-bold pb-2.5">→</span>
               <div className="flex flex-col flex-1">
                 <label className="text-[9px] font-bold text-fg-faint uppercase tracking-widest mb-1.5">End</label>
                 <select 
                   value={settings.quietHours.endHour}
                   onChange={e => setSettings(s => ({ ...s, quietHours: { ...s.quietHours, endHour: parseInt(e.target.value) || 0 } }))}
                   className="w-full appearance-none bg-inset border border-edge-subtle rounded-xl py-2 px-3 text-xs font-bold text-fg cursor-pointer text-center focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all hover:border-edge"
                 >
                   {HOUR_OPTIONS.map(h => <option key={`end-${h.value}`} value={h.value}>{h.label}</option>)}
                 </select>
               </div>
             </div>
          )}
        </div>

        {/* Interval controls */}
        <div className="space-y-3">
          {[
            { 
              id: 'sitting', 
              label: 'Sitting Break', 
              icon: Timer, 
              tint: 'bg-tint-amber',
              color: 'text-amber-600 dark:text-amber-400', 
              intervalKey: 'sittingInterval' as const,
              min: 30, max: 120, step: 15,
              unit: 'min'
            },
            { 
              id: 'eyeStrain', 
              label: 'Eye Strain (20-20-20)', 
              icon: Eye, 
              tint: 'bg-tint-indigo',
              color: 'text-indigo-600 dark:text-indigo-400', 
              intervalKey: 'eyeStrainInterval' as const,
              min: 10, max: 60, step: 5,
              unit: 'min'
            },
            { 
              id: 'water', 
              label: 'Hydration Reminder', 
              icon: Droplets, 
              tint: 'bg-tint-blue',
              color: 'text-blue-600 dark:text-blue-400', 
              intervalKey: 'waterInterval' as const,
              min: 30, max: 180, step: 15,
              unit: 'min'
            },
          ].map(item => (
            <div key={item.id} className="glass rounded-[1.5rem] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.tint)}>
                    <item.icon className={cn("w-4 h-4", item.color)} />
                  </div>
                  <span className="font-bold text-xs text-fg">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {settings.reminders[item.intervalKey]} min
                  </span>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, reminders: { ...s.reminders, [item.id]: !s.reminders[item.id as keyof typeof s.reminders] } }))}
                    className={cn("w-8 h-4 rounded-full transition-all relative", settings.reminders[item.id as keyof typeof settings.reminders] ? "bg-brand-500" : "bg-edge")}
                    role="switch"
                    aria-checked={!!settings.reminders[item.id as keyof typeof settings.reminders]}
                    aria-label={`Toggle ${item.label}`}
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
                    className="w-full h-1.5 bg-edge rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-[9px] text-fg-faint">
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
        className="w-full py-4 bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white rounded-[1.5rem] font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl"
      >
        Save All Changes
      </button>

      {isCalibrating && (
        <CalibrationWizard 
          onClose={() => setIsCalibrating(false)} 
          lowResourceMode={settings.lowResourceMode}
          onComplete={(data) => {
            onCalibrationUpdate(data);
            setIsCalibrating(false);
          }}
        />
      )}
    </div>
  );
};

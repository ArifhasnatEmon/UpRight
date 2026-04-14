import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  BarChart3,
  Settings as SettingsIcon,
  Shield,
  Trophy,
  LogOut,
  User as UserIcon,
  Sun,
  Moon,
} from 'lucide-react';

import { PostureState } from './types';
import { cn } from './utils';
import { TIMING } from './lib/constants';
import { getDailyTip, getOfflineTip } from './lib/gemini';
import { playSound } from './lib/audio';
import { storageKeys } from './lib/storage';

import { useSettings } from './hooks/useSettings';
import { useAppData } from './hooks/useAppData';
import { useHealthTimers } from './hooks/useHealthTimers';
import { useElectronBridge } from './hooks/useElectronBridge';
import { useTheme } from './hooks/useTheme';
import { loadCalibration, clearCalibration } from './lib/posture/calibration';
import { CalibrationData } from './types';

import { SplashScreen } from './pages/SplashScreen';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Onboarding } from './components/Onboarding';
import { Auth } from './components/Auth';

export default function App() {
  // Navigation state
  const [appState, setAppState] = useState<'splash' | 'auth' | 'onboarding' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'settings' | 'profile'>('dashboard');

  // Posture state
  const [postureState, setPostureState] = useState<PostureState>('good');
  const [postureScore, setPostureScore] = useState(100);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [calibration, setCalibration] = useState<CalibrationData | null>(loadCalibration());

  // Alert state
  const [showAlert, setShowAlert] = useState(false);
  const [reminderAlert, setReminderAlert] = useState<{ type: 'water' | 'eye' | 'sitting'; message: string } | null>(null);
  const reminderSnoozedUntil = useRef<number>(0);

  // Snooze refs
  const snoozeEndTimeRef = useRef<number>(0);
  const snoozeFrozenMsRef = useRef<number>(0);
  const [snoozeMinutesLeft, setSnoozeMinutesLeft] = useState<number | null>(null);

  const reminderAlertRef = useRef(reminderAlert);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState<string>(() => getOfflineTip());

  // Hooks
  const { settings, setSettings, saveSettings } = useSettings();
  const appData = useAppData({ setToastMessage });
  const resolvedTheme = useTheme(settings.theme);

  const {
    sittingTime, waterTime, eyeTime,
    resetWaterTimer: originalResetWater,
    resetEyeTimer, resetSittingTimer,
  } = useHealthTimers(
    isMonitoring,
    settings.reminders.waterInterval,
    settings.reminders.eyeStrainInterval,
    settings.reminders.sittingInterval,
    {
      onWaterAlert: () => {
        const now = Date.now();
        if (!settings.reminders.water || now < reminderSnoozedUntil.current || showAlert) return;
        // Rate limit
        if (now - lastReminderTime.current < 60000) return;
        lastReminderTime.current = now;
        setReminderAlert({ type: 'water', message: `Time to drink water! You haven't had any in ${settings.reminders.waterInterval} minutes.` });
      },
      onEyeAlert: () => {
        const now = Date.now();
        if (!settings.reminders.eyeStrain || now < reminderSnoozedUntil.current || showAlert) return;
        if (now - lastReminderTime.current < 60000) return;
        lastReminderTime.current = now;
        setReminderAlert({ type: 'eye', message: '20-20-20 Rule: Look at something 20 feet away for 20 seconds to rest your eyes.' });
      },
      onSittingAlert: (minutes) => {
        const now = Date.now();
        if (!settings.reminders.sitting || now < reminderSnoozedUntil.current || showAlert) return;
        if (now - lastReminderTime.current < 60000) return;
        lastReminderTime.current = now;
        setReminderAlert({ type: 'sitting', message: `You've been sitting for ${minutes} minutes. Stand up and stretch for a moment!` });
      },
    },
  );

  useElectronBridge({
    isMonitoring,
    setIsMonitoring,
    setActiveTab: (tab: string) => setActiveTab(tab as typeof activeTab),
    runInBackground: settings.runInBackground,
    showBubble: settings.showBubble,
    setSettings,
  });

  // Alert refs
  const lastAlertTime = useRef<number>(0);
  const criticalStartTime = useRef<number | null>(null);
  const goodPostureXpInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReminderTime = useRef<number>(0);
  const lastOverlayState = useRef<string>('');

  // Derived callbacks

  const resetWaterTimer = useCallback(() => {
    originalResetWater();
    appData.setWaterResets(prev => {
      const newCount = prev + 1;
      appData.checkAchievements(appData.logs, newCount);
      return newCount;
    });
  }, [originalResetWater, appData.logs, appData.checkAchievements, appData.setWaterResets]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Snooze system
  useEffect(() => {
    if (!isMonitoring) {
      setPostureState('good');
      setPostureScore(100);

      if (snoozeEndTimeRef.current > Date.now()) {

        snoozeFrozenMsRef.current = snoozeEndTimeRef.current - Date.now();
        snoozeEndTimeRef.current = 0;
      }
    } else if (isMonitoring && snoozeFrozenMsRef.current > 0) {

      snoozeEndTimeRef.current = Date.now() + snoozeFrozenMsRef.current;
      snoozeFrozenMsRef.current = 0;
    }
  }, [isMonitoring]);

  // Snooze display
  useEffect(() => {
    const update = () => {
      let minutes: number | null = null;
      if (snoozeFrozenMsRef.current > 0) {
        minutes = Math.ceil(snoozeFrozenMsRef.current / 60000);
      } else if (snoozeEndTimeRef.current > Date.now()) {
        minutes = Math.ceil((snoozeEndTimeRef.current - Date.now()) / 60000);
      }
      setSnoozeMinutesLeft(prev => prev === minutes ? prev : minutes);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => { reminderAlertRef.current = reminderAlert; }, [reminderAlert]);

  // XP rewards
  useEffect(() => {
    if (goodPostureXpInterval.current) clearInterval(goodPostureXpInterval.current);
    goodPostureXpInterval.current = setInterval(() => {
      if (postureState === 'good' && isMonitoring) {
        appData.addXP(3);
        appData.pushSessionScore(postureScore);
      }
    }, TIMING.GOOD_POSTURE_XP_INTERVAL);
    return () => { if (goodPostureXpInterval.current) clearInterval(goodPostureXpInterval.current); };
  }, [postureState, isMonitoring, postureScore, appData.addXP, appData.pushSessionScore]);

  // Posture handler

  const handleStateChange = useCallback((state: PostureState, score: number) => {
    setPostureState(state);
    setPostureScore(score);


    appData.processPostureChange(state, score);

    // Quiet hours
    if (settings.quietHours.enabled) {
      const hour = new Date().getHours();
      const { startHour, endHour } = settings.quietHours;
      const inQuietHours = startHour <= endHour
        ? hour >= startHour && hour < endHour
        : hour >= startHour || hour < endHour;
      if (inQuietHours) return;
    }

    // Alert logic
    if ((state === 'critical' || state === 'warning') && settings.enableFloatingAlerts) {
      const now = Date.now();
      const threshold = state === 'critical' ? TIMING.PERSISTENCE_THRESHOLD : TIMING.WARNING_PERSISTENCE_THRESHOLD;

      if (criticalStartTime.current === null) {
        criticalStartTime.current = now;
      } else if (now - criticalStartTime.current >= threshold) {
        if (now - lastAlertTime.current >= TIMING.COOLDOWN_PERIOD) {
          if (snoozeEndTimeRef.current <= Date.now() && snoozeFrozenMsRef.current <= 0) {
            if (!reminderAlertRef.current) {
              setShowAlert(true);
              lastAlertTime.current = now;
              criticalStartTime.current = null;
            }
          }
        }
      }
    } else {
      criticalStartTime.current = null;
    }
  }, [settings.enableFloatingAlerts, settings.quietHours, appData.processPostureChange]);

  const handleDismiss = useCallback(() => {
    setShowAlert(false);
  }, []);

  const handleSnooze = useCallback((duration: number) => {
    setShowAlert(false);
    snoozeEndTimeRef.current = Date.now() + duration * 60 * 1000;
    snoozeFrozenMsRef.current = 0;
    setSnoozeMinutesLeft(duration);
  }, []);


  // Overlay sync
  useEffect(() => {
    const newState = {
      postureState,
      isMonitoring,
      showAlert,
      alertPosition: settings.alertPosition,
      reminderAlert,
      // Only forward achievement/level-up toasts to overlay, not mundane messages
      toastMessage: toastMessage && (toastMessage.startsWith('🏆') || toastMessage.includes('Level Up') || toastMessage.startsWith('⬆️'))
        ? toastMessage
        : null,
      snoozeRemainingMinutes: snoozeMinutesLeft,
      showBubble: settings.showBubble,
      theme: resolvedTheme,
      soundEnabled: settings.soundEnabled,
      soundVolume: settings.soundVolume,
      soundPreset: settings.soundPreset,
    };

    const stateKey = JSON.stringify(newState);
    if (stateKey === lastOverlayState.current) return;
    lastOverlayState.current = stateKey;


    window.electronAPI?.updateOverlayState?.(newState);
  }, [postureState, isMonitoring, showAlert, settings.alertPosition, settings.showBubble, settings.soundEnabled, settings.soundVolume, settings.soundPreset, reminderAlert, toastMessage, snoozeMinutesLeft, resolvedTheme]);

  useEffect(() => {
    if (window.electronAPI?.onOverlayActionReceived) {
      return window.electronAPI.onOverlayActionReceived((action, payload) => {
        if (action === 'dismiss') {
          handleDismiss();
        } else if (action === 'snooze') {
          handleSnooze(payload as number);
        } else if (action === 'pause') {
          setIsMonitoring(prev => !prev);
        } else if (action === 'reminder-snooze') {
          playSound('snooze', settings);
          reminderSnoozedUntil.current = Date.now() + 15 * 60 * 1000;
          setReminderAlert(null);
        } else if (action === 'reminder-done') {
          playSound('dismiss', settings);
          if (reminderAlert) {
            appData.addBreakLog(reminderAlert.type);
            if (reminderAlert.type === 'water') originalResetWater();
            else if (reminderAlert.type === 'eye') resetEyeTimer();
            else if (reminderAlert.type === 'sitting') resetSittingTimer();
          }
          setReminderAlert(null);
        } else if (action === 'hide-bubble') {
          setSettings(s => ({ ...s, showBubble: false }));
        } else if (['dashboard', 'analytics', 'settings', 'profile'].includes(action)) {
          setActiveTab(action as typeof activeTab);
        }
      });
    }
  }, [handleDismiss, handleSnooze, reminderAlert, originalResetWater, resetEyeTimer, resetSittingTimer]);

  // Settings save

  const handleSaveSettings = useCallback(() => {
    saveSettings();
    setToastMessage('Settings saved successfully!');
  }, [saveSettings]);

  // Auth lifecycle

  const handleAuth = useCallback((userData: { name: string; email: string | null }) => {
    appData.handleAuth(userData);

    if (userData.email) {
      const hasCompletedOnboarding = localStorage.getItem(storageKeys.onboardingComplete);
      if (hasCompletedOnboarding) {
        appData.createSession(userData.email);
        setAppState('main');
      } else {
        setAppState('onboarding');
      }
    } else {

      const hasCompletedOnboarding = localStorage.getItem(storageKeys.onboardingComplete);
      setAppState(hasCompletedOnboarding ? 'main' : 'onboarding');
    }
  }, [appData.handleAuth, appData.createSession]);

  const handleLogout = useCallback(() => {
    appData.handleLogout();
    // Stop monitoring and hide all overlay elements
    setIsMonitoring(false);
    setShowAlert(false);
    setReminderAlert(null);
    // Clear global state so next user gets fresh onboarding + calibration
    localStorage.removeItem(storageKeys.onboardingComplete);
    clearCalibration();
    setCalibration(null);
    // Hide bubble and clear overlay
    setSettings(s => ({ ...s, showBubble: false }));
    window.electronAPI?.updateOverlayState?.({
      postureState: 'good',
      isMonitoring: false,
      showAlert: false,
      alertPosition: settings.alertPosition,
      reminderAlert: null,
      toastMessage: null,
      snoozeRemainingMinutes: null,
      showBubble: false,
      theme: resolvedTheme,
      soundEnabled: false,
      soundVolume: 0,
      soundPreset: 'silent',
    });
    setAppState('auth');
  }, [appData.handleLogout, settings.alertPosition, resolvedTheme]);

  // Splash routing

  if (appState === 'splash') {
    return (
      <SplashScreen
        onComplete={() => {
          const currentUser = localStorage.getItem(storageKeys.currentUser);
          if (currentUser) {
            const hasCompletedOnboarding = localStorage.getItem(storageKeys.onboardingComplete);
            if (hasCompletedOnboarding) {

              const { email } = JSON.parse(currentUser);
              if (email) appData.createSession(email);
              setAppState('main');
            } else {
              setAppState('onboarding');
            }
          } else {
            setAppState('auth');
          }
        }}
      />
    );
  }

  if (appState === 'auth') return <Auth onAuth={handleAuth} />;

  if (appState === 'onboarding') {
    return (
      <Onboarding onComplete={() => {
        localStorage.setItem(storageKeys.onboardingComplete, 'true');

        if (appData.currentUserEmail) appData.createSession(appData.currentUserEmail);
        setAppState('main');
      }} />
    );
  }

  // Theme toggle
  const toggleTheme = () => {
    setSettings(s => ({
      ...s,
      theme: resolvedTheme === 'light' ? 'dark' : 'light',
    }));
  };

  // Main layout

  return (
    <div className="h-screen max-h-screen bg-base flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900 overflow-hidden">

      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Header */}
      <header className="h-16 bg-card border-b border-edge flex items-center justify-between px-8 shrink-0 z-50" role="banner">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight text-fg">UpRight</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-1.5 bg-inset rounded-full border border-edge-subtle">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
              postureState === 'good' ? 'bg-emerald-500 shadow-emerald-500/50' :
                postureState === 'warning' ? 'bg-amber-500 shadow-amber-500/50' :
                  'bg-red-500 shadow-red-500/50'
            )} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">{postureState} Mode</span>
          </div>
          <div className="h-6 w-px bg-edge" />
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-inset rounded-xl transition-colors text-fg-muted"
              title={`Theme: ${settings.theme}`}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {window.electronAPI && (
              <>
                <button
                  onClick={() => window.electronAPI?.minimizeWindow?.()}
                  className="p-2 hover:bg-inset rounded-xl transition-colors text-fg-muted"
                  title="Minimize"
                  aria-label="Minimize to taskbar"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (settings.runInBackground) {
                      window.electronAPI?.hideToTray?.();
                    } else {
                      window.electronAPI?.quitApp?.();
                    }
                  }}
                  className="p-2 hover:bg-tint-red hover:text-red-500 rounded-xl transition-colors text-fg-muted"
                  title={settings.runInBackground ? "Close to tray" : "Exit application"}
                  aria-label={settings.runInBackground ? "Close to tray" : "Exit application"}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-72 bg-card border-r border-edge flex flex-col p-6 gap-3 shrink-0 overflow-hidden" role="navigation" aria-label="Main navigation">
          {([
            { id: 'dashboard', icon: Activity, label: 'Dashboard' },
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
            { id: 'profile', icon: UserIcon, label: 'Profile' },
            { id: 'settings', icon: SettingsIcon, label: 'Settings' },
          ] as const).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-[1.5rem] transition-all group relative",
                activeTab === item.id
                  ? "bg-tint-brand text-brand-700 dark:text-brand-400 shadow-sm"
                  : "text-fg-muted hover:bg-inset hover:text-fg"
              )}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 w-1 h-8 bg-brand-500 rounded-r-full"
                />
              )}
              <item.icon className={cn("w-6 h-6", activeTab === item.id ? "text-brand-600 dark:text-brand-400" : "text-fg-faint group-hover:text-fg-secondary")} />
              <span className="block font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}

          {/* Daily Tip */}
          <div className="mt-auto p-6 bg-neutral-900 rounded-t-[2rem] block relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.2em]">Daily Tip</p>
                <button
                  onClick={() => {
                    const avgScore = appData.logs.length > 0
                      ? Math.round(appData.logs.slice(0, 20).reduce((s, l) => s + l.score, 0) / Math.min(appData.logs.length, 20))
                      : 75;
                    const issue = appData.logs.find(l => l.state === 'critical') ? 'slouching' :
                      appData.logs.find(l => l.state === 'too_close') ? 'sitting too close to screen' : 'general posture';
                    getDailyTip(avgScore, issue).then(tip => setDailyTip(tip));
                  }}
                  className="text-[9px] text-brand-400/60 hover:text-brand-400 transition-colors"
                  title="Refresh tip"
                >
                  ↻
                </button>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-medium">{dailyTip}</p>
              {appData.currentUserEmail && (
                <p className="text-[8px] text-brand-400/50 mt-2">✦ AI-powered</p>
              )}
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <Shield className="w-24 h-24 text-white" />
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-2.5 bg-inset dark:bg-neutral-900 rounded-b-[2rem] text-fg-faint hover:text-red-500 dark:hover:text-red-400 transition-all text-[10px] font-bold tracking-wide w-full text-center border-t border-edge-subtle dark:border-neutral-800"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </nav>

        {/* Main content */}
        <main id="main-content" className="flex-1 bg-base overflow-hidden flex flex-col relative" role="main" aria-label={`${activeTab} content`}>
          <div className={cn("flex-1 p-8 min-h-0 overflow-y-auto", activeTab !== 'dashboard' && 'hidden')}>
            <Dashboard
              isMonitoring={isMonitoring}
              setIsMonitoring={setIsMonitoring}
              settings={settings}
              user={appData.user}
              postureScore={postureScore}
              postureState={postureState}
              sittingTime={sittingTime}
              waterTime={waterTime}
              eyeTime={eyeTime}
              snoozeMinutesLeft={snoozeMinutesLeft}
              resetWaterTimer={resetWaterTimer}
              resetEyeTimer={resetEyeTimer}
              resetSittingTimer={resetSittingTimer}
              onStateChange={handleStateChange}
              calibration={calibration}
              onCalibrationUpdate={setCalibration}
            />
          </div>
          {activeTab === 'analytics' && (
            <div className="flex-1 p-8 min-h-0 overflow-y-auto w-full h-full">
              <Analytics logs={appData.logs} user={appData.user} sessions={appData.sessions} breakLogs={appData.breakLogs} />
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="flex-1 p-8 min-h-0 overflow-y-auto w-full h-full">
              <Profile
                user={appData.user}
                logs={appData.logs}
                settings={settings}
                setSettings={setSettings}
                onLogout={handleLogout}
                onUpdateName={appData.updateUserName}
                currentUserEmail={appData.currentUserEmail}
              />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="flex-1 p-8 min-h-0 overflow-y-auto w-full h-full">
              <Settings
                settings={settings}
                setSettings={setSettings}
                onSave={handleSaveSettings}
                calibration={calibration}
                onCalibrationUpdate={setCalibration}
              />
            </div>
          )}
        </main>
      </div>



      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] bg-neutral-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
            role="status"
            aria-live="polite"
          >
            {toastMessage.startsWith('🏆') ? (
              <Trophy className="w-5 h-5 text-brand-400" />
            ) : (
              <Activity className="w-5 h-5 text-brand-400" />
            )}
            <span className="font-bold text-sm tracking-tight">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

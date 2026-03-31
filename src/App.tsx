import React, { useState, useEffect } from 'react';
import { PostureState, PostureLog, Session, BreakLog } from './types';
import { cn } from './utils';
import { getOfflineTip } from './lib/gemini';

// Data & Defaults
import { generateMockLogs, generateMockSessions, generateMockBreakLogs } from './data/mockData';
import { MOCK_TIMERS } from './data/defaults';

// Hooks
import { useSettings } from './hooks/useSettings';
import { useElectronIPC } from './hooks/useElectronIPC';
import { useAuth } from './hooks/useAuth';

// Layout
import { AppHeader } from './layouts/AppHeader';
import { Sidebar } from './layouts/Sidebar';

// Components
import { Onboarding } from './components/Onboarding';
import { Auth } from './components/Auth';
import { Toast } from './components/Toast';

// Pages
import { SplashScreen } from './pages/SplashScreen';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';

export default function App() {
  // ── Core State ──
  const [appState, setAppState] = useState<'splash' | 'auth' | 'onboarding' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'settings' | 'profile'>('dashboard');
  const [postureState] = useState<PostureState>('good');
  const [postureScore] = useState(92);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // ── Data State ──
  const [logs, setLogs] = useState<PostureLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  const [dailyTip] = useState<string>(() => getOfflineTip());

  // ── Hooks ──
  const { settings, setSettings, toastMessage, handleSaveSettings } = useSettings();
  useElectronIPC(setIsMonitoring, setActiveTab, isMonitoring);
  const { 
    user, 
    setUser, 
    currentUserEmail, 
    setCurrentUserEmail, 
    handleAuth, 
    handleLogout, 
    handleUpdateName 
  } = useAuth(setAppState, setLogs, setSessions, setBreakLogs, setIsMonitoring);

  // ── Load Existing Session on Mount ──
  useEffect(() => {
    const currentUser = localStorage.getItem('upright_current_user');
    if (!currentUser) return;

    const { name, email } = JSON.parse(currentUser);
    setCurrentUserEmail(email);

    const savedUser = localStorage.getItem('upright_user_' + email);
    if (savedUser) setUser(JSON.parse(savedUser));
    else setUser(prev => ({ ...prev, name }));

    setLogs(generateMockLogs());
    setSessions(generateMockSessions());
    setBreakLogs(generateMockBreakLogs());

    const hasCompletedOnboarding = localStorage.getItem('upright_onboarding_complete');
    if (hasCompletedOnboarding) setAppState('main');
  }, [setCurrentUserEmail, setUser]);

  // ── Pre-Main Screens ──
  if (appState === 'splash') {
    return (
      <SplashScreen
        onComplete={() => {
          const currentUser = localStorage.getItem('upright_current_user');
          if (currentUser) {
            const hasCompletedOnboarding = localStorage.getItem('upright_onboarding_complete');
            setAppState(hasCompletedOnboarding ? 'main' : 'onboarding');
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
        localStorage.setItem('upright_onboarding_complete', 'true');
        setAppState('main');
      }} />
    );
  }

  // ── Main App Layout ──
  return (
    <div className="h-screen max-h-screen bg-neutral-50 flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900 overflow-hidden">
      <AppHeader postureState={postureState} onLogout={handleLogout} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} dailyTip={dailyTip} />

        <main className="flex-1 bg-neutral-50/50 overflow-hidden flex flex-col relative">
          <div className={cn("flex-1 p-8 min-h-0 overflow-y-auto", activeTab !== 'dashboard' && 'hidden')}>
            <Dashboard
              isMonitoring={isMonitoring}
              setIsMonitoring={setIsMonitoring}
              settings={settings}
              user={user}
              postureScore={postureScore}
              postureState={postureState}
              sittingTime={MOCK_TIMERS.sittingTime}
              waterTime={MOCK_TIMERS.waterTime}
              eyeTime={MOCK_TIMERS.eyeTime}
              resetWaterTimer={() => {}}
              resetEyeTimer={() => {}}
              onStateChange={() => {}}
            />
          </div>
          <div className={cn("flex-1 p-8 min-h-0 overflow-y-auto", activeTab !== 'analytics' && 'hidden')}>
            <Analytics logs={logs} user={user} sessions={sessions} breakLogs={breakLogs} />
          </div>
          <div className={cn("flex-1 p-8 min-h-0 overflow-y-auto", activeTab !== 'profile' && 'hidden')}>
            <Profile
              user={user}
              logs={logs}
              settings={settings}
              setSettings={setSettings}
              onLogout={handleLogout}
              onUpdateName={handleUpdateName}
              currentUserEmail={currentUserEmail}
            />
          </div>
          <div className={cn("flex-1 p-8 min-h-0 overflow-y-auto", activeTab !== 'settings' && 'hidden')}>
            <Settings
              settings={settings}
              setSettings={setSettings}
              onSave={handleSaveSettings}
            />
          </div>
        </main>
      </div>

      <Toast message={toastMessage} />
    </div>
  );
}

import { useState, useCallback } from 'react';
import { UserProfile, PostureLog, Session, BreakLog } from '../types';
import { DEFAULT_USER } from '../data/defaults';
import { MOCK_ACHIEVEMENTS, generateMockLogs, generateMockSessions, generateMockBreakLogs } from '../data/mockData';

export function useAuth(
  setAppState: React.Dispatch<React.SetStateAction<'splash' | 'auth' | 'onboarding' | 'main'>>,
  setLogs: React.Dispatch<React.SetStateAction<PostureLog[]>>,
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>,
  setBreakLogs: React.Dispatch<React.SetStateAction<BreakLog[]>>,
  setIsMonitoring: React.Dispatch<React.SetStateAction<boolean>>
) {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  const handleAuth = useCallback((userData: { name: string; email: string | null }) => {
    setCurrentUserEmail(userData.email);

    if (userData.email) {
      const savedUser = localStorage.getItem('upright_user_' + userData.email);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        const newUser: UserProfile = {
          name: userData.name,
          level: 3,
          xp: 320,
          achievements: MOCK_ACHIEVEMENTS,
        };
        setUser(newUser);
        localStorage.setItem('upright_user_' + userData.email, JSON.stringify(newUser));
      }
    } else {
      setUser({ name: 'Guest User', level: 3, xp: 320, achievements: MOCK_ACHIEVEMENTS });
    }

    setLogs(generateMockLogs());
    setSessions(generateMockSessions());
    setBreakLogs(generateMockBreakLogs());

    const hasCompletedOnboarding = localStorage.getItem('upright_onboarding_complete');
    setAppState(hasCompletedOnboarding ? 'main' : 'onboarding');
  }, [setAppState, setBreakLogs, setLogs, setSessions]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('upright_current_user');
    setCurrentUserEmail(null);
    setAppState('auth');
    setUser(DEFAULT_USER);
    setLogs([]);
    setSessions([]);
    setBreakLogs([]);
    setIsMonitoring(true);
  }, [setAppState, setBreakLogs, setLogs, setSessions, setIsMonitoring]);

  const handleUpdateName = useCallback((newName: string) => {
    setUser(prev => {
      const updated = { ...prev, name: newName };
      if (currentUserEmail) {
        localStorage.setItem('upright_user_' + currentUserEmail, JSON.stringify(updated));
        const currentUserData = JSON.parse(localStorage.getItem('upright_current_user') || '{}');
        localStorage.setItem('upright_current_user', JSON.stringify({ ...currentUserData, name: newName }));
      }
      return updated;
    });
  }, [currentUserEmail]);

  return {
    user,
    setUser,
    currentUserEmail,
    setCurrentUserEmail,
    handleAuth,
    handleLogout,
    handleUpdateName
  };
}

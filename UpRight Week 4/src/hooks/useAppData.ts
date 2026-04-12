import { useState, useRef, useCallback, useEffect } from 'react';
import { UserProfile, PostureLog, PostureState, Session, BreakLog } from '../types';
import { storageKeys, getJSON, setJSON } from '../lib/storage';
import { getLevelFromXp, TIMING, ACHIEVEMENT_DEFINITIONS } from '../lib/constants';
import { getAchievementMessage } from '../lib/gemini';

const DEFAULT_USER: UserProfile = {
  name: 'Guest User',
  level: 1,
  xp: 0,
  achievements: [],
};

interface UseAppDataOptions {
  setToastMessage: (msg: string | null) => void;
}

// App data
export const useAppData = ({ setToastMessage }: UseAppDataOptions) => {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [logs, setLogs] = useState<PostureLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  const [waterResets, setWaterResets] = useState(0);

  // Session tracking
  const currentSessionId = useRef<number | null>(null);
  const sessionScores = useRef<number[]>([]);

  // Achievement tracking
  const consecutiveGoodCount = useRef<number>(0);
  // Cache counts
  const lastCheckedLogCount = useRef<number>(0);

  // Posture tracking
  const lastLogTime = useRef<number>(0);

  // Sync refs
  const logsRef = useRef<PostureLog[]>(logs);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  const emailRef = useRef(currentUserEmail);
  useEffect(() => { emailRef.current = currentUserEmail; }, [currentUserEmail]);

  const waterResetsRef = useRef(waterResets);
  useEffect(() => { waterResetsRef.current = waterResets; }, [waterResets]);

  // Load data

  const loadUserData = useCallback((email: string, name: string) => {
    setCurrentUserEmail(email);

    const savedUser = localStorage.getItem(storageKeys.user(email));
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser({ ...DEFAULT_USER, name });
    }

    setLogs(getJSON(storageKeys.logs(email), []));
    setBreakLogs(getJSON(storageKeys.breakLogs(email), []));

    // Orphan cleanup
    const savedSessions: Session[] = getJSON(storageKeys.sessions(email), []);
    const cleanedSessions = savedSessions.map(s => {
      // Close orphaned
      if (!s.endTime) {
         return {
           ...s,
           endTime: new Date(new Date(s.startTime).getTime() + Math.max(s.duration * 60000, 1000)).toISOString()
         };
      }
      return s;
    });
    setSessions(cleanedSessions);
    // Save sessions
    if (JSON.stringify(savedSessions) !== JSON.stringify(cleanedSessions)) {
       localStorage.setItem(storageKeys.sessions(email), JSON.stringify(cleanedSessions));
    }
  }, []);

  // Initial load
  useEffect(() => {
    const raw = localStorage.getItem(storageKeys.currentUser);
    if (raw) {
      const { name, email } = JSON.parse(raw);
      loadUserData(email, name);
    }
  }, [loadUserData]);

  // Manage Session

  const createSession = useCallback((email: string) => {
    const newSessionId = Date.now();
    currentSessionId.current = newSessionId;
    sessionScores.current = [];

    const newSession: Session = {
      id: newSessionId,
      startTime: new Date().toISOString(),
      endTime: null,
      avgScore: 0,
      duration: 0,
    };

    const existing: Session[] = getJSON(storageKeys.sessions(email), []);
    const updated = [newSession, ...existing].slice(0, 1000);
    setJSON(storageKeys.sessions(email), updated);
    setSessions(updated);
  }, []);

  const endSession = useCallback(() => {
    const email = emailRef.current;
    if (currentSessionId.current === null || !email) return;

    const now = new Date();
    const sessionKey = storageKeys.sessions(email);
    const allSessions: Session[] = getJSON(sessionKey, []);
    const idx = allSessions.findIndex(s => s.id === currentSessionId.current);

    if (idx !== -1) {
      const start = new Date(allSessions[idx].startTime);
      const durationMins = Math.round((now.getTime() - start.getTime()) / 60000);
      const avg = sessionScores.current.length > 0
        ? Math.round(sessionScores.current.reduce((a, b) => a + b, 0) / sessionScores.current.length)
        : 0;
      allSessions[idx] = { ...allSessions[idx], endTime: now.toISOString(), duration: durationMins, avgScore: avg };
      setJSON(sessionKey, allSessions);
      setSessions(allSessions);
    }

    currentSessionId.current = null;
    sessionScores.current = [];
  }, []);

  // Close session
  useEffect(() => {
    const handler = () => endSession();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [endSession]);

  const pushSessionScore = useCallback((score: number) => {
    sessionScores.current.push(score);
  }, []);

  // Manage log

  const addLog = useCallback((log: PostureLog): PostureLog[] => {
    const email = emailRef.current;
    if (email) {
      const logKey = storageKeys.logs(email);
      const existing: PostureLog[] = getJSON(logKey, []);
      const updated = [log, ...existing].slice(0, 5000);
      setJSON(logKey, updated);
      setLogs(updated);
      return updated;
    } else {
      const updated = [log, ...logsRef.current].slice(0, 5000);
      setLogs(updated);
      return updated;
    }
  }, []);

  const addBreakLog = useCallback((type: 'water' | 'eye' | 'sitting') => {
    const newBreakLog: BreakLog = {
      id: Date.now(),
      type,
      timestamp: new Date().toISOString(),
    };
    const email = emailRef.current;
    if (email) {
      const breakKey = storageKeys.breakLogs(email);
      const existing = getJSON<BreakLog[]>(breakKey, []);
      const updated = [newBreakLog, ...existing].slice(0, 1000);
      setJSON(breakKey, updated);
      setBreakLogs(updated);
    } else {
      setBreakLogs(prev => [newBreakLog, ...prev].slice(0, 1000));
    }
  }, []);

  // Xp tracking

  const addXP = useCallback((amount: number) => {
    setUser(prev => {
      const newXp = prev.xp + amount;
      const newLevel = getLevelFromXp(newXp);
      const levelUp = newLevel > prev.level;
      const updatedUser = { ...prev, xp: newXp, level: newLevel };

      if (levelUp) {
        setToastMessage(`⬆️ Level Up! You are now Level ${newLevel}!`);
      }

      const email = emailRef.current;
      if (email) {
        setJSON(storageKeys.user(email), updatedUser);
      }
      return updatedUser;
    });
  }, [setToastMessage]);

  const checkAchievements = useCallback((currentLogs: PostureLog[], currentResets: number) => {
    // Pre check
    const logCount = currentLogs.length;
    const earlyBirdOrOwl = new Date().getHours() < 8 || new Date().getHours() >= 22;
    if (logCount === lastCheckedLogCount.current && !earlyBirdOrOwl && consecutiveGoodCount.current < 10) {
      return;
    }
    lastCheckedLogCount.current = logCount;

    setUser(prev => {
      const email = emailRef.current;

      // Lazy load
      const toUnlock = ACHIEVEMENT_DEFINITIONS.filter((def: any) => {
        if (prev.achievements.some(a => a.id === def.id)) return false;

        switch (def.id) {
          case 'first_log': return currentLogs.length >= 1;
          case 'perfect_10': return consecutiveGoodCount.current >= 10;
          case 'century': return currentLogs.length >= 100;
          case 'hydrated': return currentResets >= 5;
          case 'early_bird': return new Date().getHours() < 8;
          case 'night_owl': return new Date().getHours() >= 22;
          case 'break_champion': {
            if (email) {
              return getJSON<BreakLog[]>(storageKeys.breakLogs(email), []).length >= 10;
            }
            return false;
          }
          case 'streak_3': {
            const uniqueDays = new Set(currentLogs.map(l => l.timestamp.split('T')[0]));
            return uniqueDays.size >= 3;
          }
          case 'posture_pro': {
            if (currentLogs.length < 20) return false;
            const count = Math.min(currentLogs.length, 50);
            const avg = currentLogs.slice(0, count).reduce((s, l) => s + l.score, 0) / count;
            return avg >= 85;
          }
          case 'eyes_saver': {
            if (email) {
              return getJSON<BreakLog[]>(storageKeys.breakLogs(email), []).filter(b => b.type === 'eye').length >= 5;
            }
            return false;
          }
          default: return false;
        }
      });

      if (toUnlock.length > 0) {
        const newAchievements = toUnlock.map((def: any) => ({ ...def, unlockedAt: new Date().toISOString() }));
        const updatedUser = { ...prev, achievements: [...prev.achievements, ...newAchievements] };

        if (email) {
          setJSON(storageKeys.user(email), updatedUser);
        }

        setTimeout(() => {
          if (email) {
            getAchievementMessage(newAchievements[0].title, newAchievements[0].description)
              .then((msg: string) => setToastMessage(msg));
          } else {
            setToastMessage(`🏆 Achievement Unlocked: ${newAchievements[0].title}!`);
          }
        }, 3200);

        return updatedUser;
      }
      return prev;
    });
  }, [setToastMessage]);

  // Update posture

  const processPostureChange = useCallback((state: PostureState, score: number) => {
    const now = Date.now();
    
    if (state === 'good') {
      consecutiveGoodCount.current += 1;
      if (consecutiveGoodCount.current === 10) {
        checkAchievements(logsRef.current, waterResetsRef.current);
      }
    } else {
      consecutiveGoodCount.current = 0;
    }

    // Log posture
    if (now - lastLogTime.current >= TIMING.LOG_THROTTLE) {
      lastLogTime.current = now;
      const newLog: PostureLog = { id: now, timestamp: new Date().toISOString(), score, state, duration: 5 };
      const updatedLogs = addLog(newLog);

      sessionScores.current.push(score);

      let earnedXp = 0;
      if (state === 'good' && score >= 80) earnedXp = 3;
      else if (score >= 80) earnedXp = 5;
      else if (score >= 50) earnedXp = 1;
      if (earnedXp > 0) addXP(earnedXp);

      checkAchievements(updatedLogs, waterResetsRef.current);
    }
  }, [addLog, addXP, checkAchievements]);

  // App auth

  const handleAuth = useCallback((userData: { name: string; email: string | null }) => {
    if (userData.email) {
      loadUserData(userData.email, userData.name);
    } else {
      setCurrentUserEmail(null);
      setUser({ ...DEFAULT_USER });
      setLogs([]);
      setSessions([]);
      setBreakLogs([]);
      setWaterResets(0);
    }
  }, [loadUserData]);

  const handleLogout = useCallback(() => {
    endSession();
    localStorage.removeItem(storageKeys.currentUser);
    setCurrentUserEmail(null);
    setUser({ ...DEFAULT_USER });
    setLogs([]);
    setSessions([]);
    setBreakLogs([]);
    setWaterResets(0);
  }, [endSession]);

  const updateUserName = useCallback((newName: string) => {
    setUser(prev => {
      const updated = { ...prev, name: newName };
      const email = emailRef.current;
      if (email) {
        setJSON(storageKeys.user(email), updated);
        const currentUserData = getJSON(storageKeys.currentUser, {} as Record<string, string>);
        setJSON(storageKeys.currentUser, { ...currentUserData, name: newName });
      }
      return updated;
    });
  }, []);

  return {
    // State
    user, setUser,
    currentUserEmail,
    logs, sessions, breakLogs,
    waterResets, setWaterResets,

    // Actions
    handleAuth, handleLogout,
    createSession, endSession,
    addLog, addBreakLog,
    addXP, checkAchievements,
    pushSessionScore, processPostureChange,
    updateUserName, loadUserData,
  };
};

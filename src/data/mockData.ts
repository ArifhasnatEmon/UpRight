import { PostureState, PostureLog, Session, BreakLog } from '../types';

export const MOCK_ACHIEVEMENTS = [
  { id: 'first_log', title: 'First Step', description: 'Saved your first posture log', icon: '🎯', unlockedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'early_bird', title: 'Early Bird', description: 'Used the app before 8 AM', icon: '🌅', unlockedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'hydrated', title: 'Hydration Hero', description: 'Reset water timer 5 times in a session', icon: '💧', unlockedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'streak_3', title: 'On a Roll', description: 'Used the app 3 days in a row', icon: '🔥', unlockedAt: new Date(Date.now() - 86400000).toISOString() },
];

export const generateMockLogs = (): PostureLog[] => {
  const logs: PostureLog[] = [];
  const states: PostureState[] = ['good', 'good', 'good', 'good', 'warning', 'warning', 'critical'];
  const now = new Date();
  for (let i = 0; i < 80; i++) {
    const hoursAgo = Math.floor(Math.random() * 168);
    const timestamp = new Date(now.getTime() - hoursAgo * 3600000);
    const state = states[Math.floor(Math.random() * states.length)];
    const score = state === 'good' ? 80 + Math.floor(Math.random() * 21)
      : state === 'warning' ? 55 + Math.floor(Math.random() * 25)
        : 20 + Math.floor(Math.random() * 35);
    logs.push({
      id: Date.now() - i * 1000,
      timestamp: timestamp.toISOString(),
      score,
      state,
      duration: 5,
    });
  }
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const generateMockSessions = (): Session[] => {
  const sessions: Session[] = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const startOffset = i * 24 + Math.floor(Math.random() * 8);
    const startTime = new Date(now.getTime() - startOffset * 3600000);
    const duration = 30 + Math.floor(Math.random() * 90);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    sessions.push({
      id: Date.now() - i * 100000,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      avgScore: 70 + Math.floor(Math.random() * 25),
      duration,
    });
  }
  return sessions;
};

export const generateMockBreakLogs = (): BreakLog[] => {
  const breakLogs: BreakLog[] = [];
  const types: ('water' | 'eye' | 'sitting')[] = ['water', 'eye', 'sitting'];
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const hoursAgo = Math.floor(Math.random() * 72);
    breakLogs.push({
      id: Date.now() - i * 5000,
      timestamp: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
      type: types[Math.floor(Math.random() * types.length)],
    });
  }
  return breakLogs;
};

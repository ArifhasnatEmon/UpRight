export type PostureState = 'good' | 'warning' | 'critical' | 'too_close' | 'disabled';

export interface PostureLog {
  id: number;
  timestamp: string;
  score: number;
  state: PostureState;
  duration: number;
}

export interface ReminderSettings {
  posture: boolean;
  sitting: boolean;
  eyeStrain: boolean;
  water: boolean;
  sittingInterval: number; // minutes
  eyeStrainInterval: number; // minutes
  waterInterval: number; // minutes
}

export type AlertPosition = 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface AppSettings {
  runInBackground: boolean;
  enableFloatingAlerts: boolean;
  alertPosition: AlertPosition;
  alertOpacity: number;
  snoozeDuration: number;
  postureSensitivity: number; // 1-10
  frameRate: number;
  lowResourceMode: boolean;
  anonymousDataSharing: boolean;
  localStorageOnly: boolean;
  reminders: ReminderSettings;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserProfile {
  name: string;
  level: number;
  xp: number;
  achievements: Achievement[];
}

export interface Session {
  id: number;
  startTime: string;    // ISO string — app যখন active হয়
  endTime: string | null; // ISO string — app যখন close/minimize হয়, চলতে থাকলে null
  avgScore: number;     // ওই session-এর posture score-এর গড়
  duration: number;     // মিনিটে (endTime - startTime)
}

export interface BreakLog {
  id: number;
  timestamp: string;    // ISO string
  type: 'water' | 'eye' | 'sitting'; // কোন ধরনের break
}

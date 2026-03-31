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
  startTime: string;   
  endTime: string | null; 
  avgScore: number;     
  duration: number;     
}

export interface BreakLog {
  id: number;
  timestamp: string;    
  type: 'water' | 'eye' | 'sitting'; 
}

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

// Quiet hours
export interface QuietHours {
  enabled: boolean;
  startHour: number;   // 0-23
  endHour: number;     // 0-23
}

export interface AppSettings {
  runInBackground: boolean;
  enableFloatingAlerts: boolean;
  showBubble: boolean;
  alertPosition: AlertPosition;
  postureSensitivity: number; // 1-10
  frameRate: number;
  lowResourceMode: boolean;
  anonymousDataSharing: boolean;
  localStorageOnly: boolean;
  reminders: ReminderSettings;
  quietHours: QuietHours;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  soundVolume: number;           // Volume scale
  soundPreset: 'default' | 'gentle' | 'chime' | 'silent';
}

// Account types
export interface Account {
  email: string;
  name: string;
  passwordHash: string;
}

// Hardware profile
export interface HardwareProfile {
  tier: 'high' | 'balanced' | 'low';
  cpuCores: number;
  hasGPU: boolean;
  detectedAt: string; // ISO timestamp
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
  startTime: string;        // Start time
  endTime: string | null;    // End time
  avgScore: number;          // Average score
  duration: number;          // Session duration
}

export interface BreakLog {
  id: number;
  timestamp: string;         // ISO string
  type: 'water' | 'eye' | 'sitting'; // Break type
}

// Posture calibration
export interface CalibrationData {
  timestamp: string; // ISO string
  baseline: {
    eyeDistance: number;
    headTilt: number;
    neckLength: number;
    pitchDiff: number;
    rotationDiff: number;
  };
}

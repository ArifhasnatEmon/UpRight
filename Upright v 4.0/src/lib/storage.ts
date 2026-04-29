// Built keys
export const storageKeys = {
  currentUser: 'upright_current_user',
  accounts: 'upright_accounts',
  settings: 'upright_settings',
  onboardingComplete: 'upright_onboarding_complete',
  tipIndex: 'upright_tip_index',
  user: (email: string) => `upright_user_${email}`,
  logs: (email: string) => `upright_logs_${email}`,
  sessions: (email: string) => `upright_sessions_${email}`,
  breakLogs: (email: string) => `upright_breaklogs_${email}`,
  avatar: (email: string | null) => email ? `upright_avatar_${email}` : 'upright_avatar_guest',
};

// Storage helpers
export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

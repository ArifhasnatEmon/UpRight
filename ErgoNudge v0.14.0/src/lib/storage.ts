// Built keys
export const storageKeys = {
  currentUser: 'ergonudge_current_user',
  accounts: 'ergonudge_accounts',
  settings: 'ergonudge_settings',
  onboardingComplete: 'ergonudge_onboarding_complete',
  tipIndex: 'ergonudge_tip_index',
  user: (email: string) => `ergonudge_user_${email}`,
  logs: (email: string) => `ergonudge_logs_${email}`,
  sessions: (email: string) => `ergonudge_sessions_${email}`,
  breakLogs: (email: string) => `ergonudge_breaklogs_${email}`,
  avatar: (email: string | null) => email ? `ergonudge_avatar_${email}` : 'ergonudge_avatar_guest',
};

// Storage helpers
export function getJSON<T>(key: string, fallback: T): T {
  try {
    let raw = localStorage.getItem(key);
    if (!raw && key.startsWith('ergonudge_')) {
      const legacyKey = key.replace('ergonudge_', 'upright_');
      raw = localStorage.getItem(legacyKey);
    }
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

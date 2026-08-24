// src/hooks/useCloudSync.ts
// Push-only cloud sync — local is ALWAYS the source of truth.
// Never reads data back from Supabase. Never throws. Never blocks UI.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, PostureLog, Session, BreakLog } from '../types';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const BATCH_SIZE = 500;
const LAST_SYNC_KEY = 'ergonudge_last_sync';

interface UseCloudSyncOptions {
  email: string | null;
  user: UserProfile;
  logs: PostureLog[];
  sessions: Session[];
  breakLogs: BreakLog[];
  settings: Record<string, unknown>;
  avatarDataUrl: string | null;
  enabled: boolean;
}

interface SyncResult {
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  syncNow: () => Promise<void>;
}


/** Convert base64 data URL to Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Batch upsert rows into a table in chunks */
async function batchUpsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  email: string,
): Promise<void> {
  if (!supabase || rows.length === 0) return;

  // Tag each row with email
  const tagged = rows.map(r => ({ ...r, email }));
  console.info(`[CloudSync] Preparing to upsert ${tagged.length} rows to ${table}`);

  let totalInserted = 0;
  for (let i = 0; i < tagged.length; i += BATCH_SIZE) {
    const chunk = tagged.slice(i, i + BATCH_SIZE);
    
    // We remove the onConflict parameter so Supabase automatically infers it
    // from the primary key, avoiding silent PostgREST parsing failures on composite keys.
    const { data, error } = await supabase
      .from(table)
      .upsert(chunk as any)
      .select();

    if (error) {
      console.warn(`[CloudSync] Batch upsert ${table} failed:`, error.message);
      throw error;
    }
    
    totalInserted += (data?.length || 0);
  }
  
  console.info(`[CloudSync] Successfully upserted ${totalInserted}/${tagged.length} rows to ${table}`);
}

export function useCloudSync({
  email,
  user,
  logs,
  sessions,
  breakLogs,
  settings,
  avatarDataUrl,
  enabled,
}: UseCloudSyncOptions): SyncResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(
    () => localStorage.getItem(LAST_SYNC_KEY),
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isSyncingRef = useRef(false);
  const lastSyncedEmailRef = useRef<string | null>(null);

  // Refs for stable closure
  const emailRef = useRef(email);
  const userRef = useRef(user);
  const logsRef = useRef(logs);
  const sessionsRef = useRef(sessions);
  const breakLogsRef = useRef(breakLogs);
  const settingsRef = useRef(settings);
  const avatarRef = useRef(avatarDataUrl);
  const enabledRef = useRef(enabled);

  useEffect(() => { emailRef.current = email; }, [email]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { breakLogsRef.current = breakLogs; }, [breakLogs]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { avatarRef.current = avatarDataUrl; }, [avatarDataUrl]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // Online/offline tracking
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    const currentEmail = emailRef.current;
    if (!supabase || !currentEmail || !enabledRef.current || !navigator.onLine) return;
    if (isSyncingRef.current) return; // prevent overlapping syncs

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      // NOTE: No Supabase Auth needed — all tables use public anon-key RLS policies.
      // The previous signUp/signOut pattern was corrupting the client's auth state
      // and causing all subsequent DB writes to fail silently.

      // 1. Avatar upload (if present)
      let uploadedAvatarUrl: string | null = null;
      const avatarData = avatarRef.current;
      if (avatarData && avatarData.startsWith('data:')) {
        const blob = dataUrlToBlob(avatarData);
        const path = `${currentEmail}/avatar.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

        if (uploadError) {
          console.warn('[CloudSync] Avatar upload failed:', uploadError.message);
          // Non-fatal — continue syncing other data
        } else {
          // Get the download URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(path);
          uploadedAvatarUrl = urlData?.publicUrl ?? null;
        }
      }

      // 2. Upsert profile
      // Only include avatar_url when a new avatar was actually uploaded,
      // to avoid overwriting an existing avatar with null on every sync.
      const currentUser = userRef.current;
      const profilePayload: Record<string, unknown> = {
        email: currentEmail,
        name: currentUser.name,
        xp: currentUser.xp,
        level: currentUser.level,
        achievements: currentUser.achievements as unknown[],
        settings: settingsRef.current as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      };
      if (uploadedAvatarUrl !== null) {
        profilePayload.avatar_url = uploadedAvatarUrl;
      }
      const { error: profileError } = await supabase
        .from('upright_profiles')
        .upsert(profilePayload as any, { onConflict: 'email' });

      if (profileError) {
        console.warn('[CloudSync] Profile upsert failed:', profileError.message);
        throw profileError;
      }

      // 3. Batch upsert logs
      await batchUpsert('upright_logs', logsRef.current as any[], currentEmail);

      // 4. Batch upsert sessions
      const sessionRows = sessionsRef.current.map(s => ({
        id: s.id,
        start_time: s.startTime,
        end_time: s.endTime,
        avg_score: s.avgScore,
        duration: s.duration,
      }));
      await batchUpsert('upright_sessions', sessionRows as any[], currentEmail);

      // 5. Batch upsert break logs
      await batchUpsert('upright_break_logs', breakLogsRef.current as any[], currentEmail);

      // 6. Record sync timestamp
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncAt(now);

      console.info(`[CloudSync] Sync complete for ${currentEmail}`);
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err) || 'Sync failed due to an unknown error';
      setSyncError(`Sync Error: ${msg}`);
      console.warn('[CloudSync] Sync error stack:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []); // stable — reads everything from refs

  useEffect(() => {
    if (!enabled || !email || !isOnline) return;

    const interval = setInterval(() => {
      syncNow();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, email, isOnline, syncNow]);

  useEffect(() => {
    if (enabled && email && isOnline && email !== lastSyncedEmailRef.current) {
      lastSyncedEmailRef.current = email;
      // Small delay to let React settle after login
      const timer = setTimeout(() => syncNow(), 2000);
      return () => clearTimeout(timer);
    }
  }, [email, enabled, isOnline, syncNow]);

  return { isSyncing, lastSyncAt, syncError, syncNow };
}

// src/lib/gemini.ts
// All Gemini calls go through the Supabase Edge Function (gemini-proxy).
// The API key lives as a Supabase server secret — it is never in this bundle.
// If Supabase is unreachable (offline, not configured), all functions fall back
// gracefully to offline tips — the app never breaks.

import { supabase } from './supabase';
import { getOfflineTip } from './offlineTips';
import { EMOJI_TROPHY } from './emoji';

const CACHE: Record<string, { value: string; expiresAt: number }> = {};

let lastTipCallTime = 0;
let lastInsightCallTime = 0;
const MIN_TIP_INTERVAL = 10 * 60 * 1000;    // 10 min
const MIN_INSIGHT_INTERVAL = 5 * 60 * 1000; // 5 min

const getCached = (key: string): string | null => {
  const memEntry = CACHE[key];
  if (memEntry && Date.now() < memEntry.expiresAt) return memEntry.value;
  try {
    const stored = localStorage.getItem(`upright_ai_cache_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() < parsed.expiresAt) {
        CACHE[key] = parsed;
        return parsed.value;
      }
    }
  } catch {}
  return null;
};

const setCache = (key: string, value: string, ttlMs: number) => {
  const entry = { value, expiresAt: Date.now() + ttlMs };
  CACHE[key] = entry;
  try {
    localStorage.setItem(`upright_ai_cache_${key}`, JSON.stringify(entry));
  } catch {}
};

const canCallTipApi = () => Date.now() - lastTipCallTime >= MIN_TIP_INTERVAL;
const canCallInsightApi = () => Date.now() - lastInsightCallTime >= MIN_INSIGHT_INTERVAL;
const markTipApiCall = () => { lastTipCallTime = Date.now(); };
const markInsightApiCall = () => { lastInsightCallTime = Date.now(); };

// Returns null if Supabase is not configured or call fails (offline safe).
async function callProxy(
  type: 'daily_tip' | 'analytics_insight' | 'achievement',
  context: Record<string, unknown>
): Promise<string | null> {
  if (!supabase) return null; // No Supabase config — offline mode

  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { type, context },
    });

    if (error) {
      console.warn('[UpRight] Edge Function error:', error.message);
      return null;
    }

    const result = (data as { result?: string })?.result?.trim();
    return result || null;
  } catch (err) {
    console.warn('[UpRight] Gemini proxy unreachable:', err);
    return null;
  }
}

export const getDailyTip = async (
  avgScore: number,
  mostCommonIssue: string
): Promise<string> => {
  const cacheKey = 'daily_tip';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!canCallTipApi()) return getOfflineTip();

  markTipApiCall();
  const result = await callProxy('daily_tip', { avgScore, mostCommonIssue });

  if (result) {
    setCache(cacheKey, result, 1 * 60 * 60 * 1000); // 1h cache
    return result;
  }

  return getOfflineTip();
};

export const getAnalyticsInsight = async (
  avgScore: number,
  criticalPercent: number,
  tooClosePercent: number,
  worstHour: number | null
): Promise<string | null> => {
  const cacheKey = `insight_${avgScore}_${criticalPercent}_${tooClosePercent}_${worstHour}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!canCallInsightApi()) return null;

  markInsightApiCall();
  const result = await callProxy('analytics_insight', {
    avgScore,
    criticalPercent,
    tooClosePercent,
    worstHour,
  });

  if (result) {
    setCache(cacheKey, result, 2 * 60 * 60 * 1000); // 2h cache
    return result;
  }

  return null;
};

export const getAchievementMessage = async (
  achievementTitle: string,
  _achievementDescription: string
): Promise<string> => {
  // Achievement messages are short — no caching, no rate limiting
  const result = await callProxy('achievement', { achievementTitle });
  return result ?? `${EMOJI_TROPHY} Achievement Unlocked: ${achievementTitle}!`;
};

// Legacy export
export { getOfflineTip };

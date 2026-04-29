import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL_ID } from './config';
import { getOfflineTip } from './offlineTips';
import { EMOJI_TROPHY } from './emoji';

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Rate limiting - separate for tip and insight

const CACHE: Record<string, { value: string; expiresAt: number }> = {};
let lastTipCallTime = 0;
let lastInsightCallTime = 0;
const MIN_TIP_INTERVAL = 10 * 60 * 1000;     // 10 min (was 1 hour)
const MIN_INSIGHT_INTERVAL = 5 * 60 * 1000;   // 5 min (was 1 hour)

const getCached = (key: string): string | null => {
  const memEntry = CACHE[key];
  if (memEntry && Date.now() < memEntry.expiresAt) return memEntry.value;
  // Try localStorage persistence
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

const canCallTipApi = (): boolean => {
  return Date.now() - lastTipCallTime >= MIN_TIP_INTERVAL;
};

const canCallInsightApi = (): boolean => {
  return Date.now() - lastInsightCallTime >= MIN_INSIGHT_INTERVAL;
};

const markTipApiCall = () => {
  lastTipCallTime = Date.now();
};

const markInsightApiCall = () => {
  lastInsightCallTime = Date.now();
};

// Daily tip
export const getDailyTip = async (avgScore: number, mostCommonIssue: string): Promise<string> => {
  const cacheKey = `daily_tip`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!canCallTipApi()) return getOfflineTip();

  try {
    const ai = getAI();
    if (!ai) return getOfflineTip();

    markTipApiCall();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: `You are an ergonomics expert. A user's average posture score this week is ${avgScore}/100. Their most common issue is: "${mostCommonIssue}". Give ONE specific, practical ergonomics tip in 1-2 short sentences. Be direct and actionable. No intro phrases like "Great question" or "Here's a tip".`,
    });

    const tip = response.text?.trim() || getOfflineTip();
    setCache(cacheKey, tip, 12 * 60 * 60 * 1000); // 12h cache
    return tip;
  } catch (err) {
    console.warn('[UpRight] Gemini API error:', err);
    return getOfflineTip();
  }
};

// Analytics insight
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

  try {
    const ai = getAI();
    if (!ai) return null;

    markInsightApiCall();
    const context = [
      `Average posture score: ${avgScore}/100`,
      `Critical posture: ${criticalPercent}% of the time`,
      `Too close to screen: ${tooClosePercent}% of the time`,
      worstHour !== null ? `Worst posture hour: ${worstHour}:00` : '',
    ].filter(Boolean).join('. ');

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: `You are an ergonomics health coach. Analyze this user's posture data and give 2-3 sentence personalized advice. Data: ${context}. Be specific, empathetic, and actionable. No generic phrases.`,
    });

    const insight = response.text?.trim() || null;
    if (insight) {
      setCache(cacheKey, insight, 2 * 60 * 60 * 1000); // 2h cache
    }
    return insight;
  } catch (err) {
    console.warn('[UpRight] Gemini insight API error:', err);
    return null;
  }
};

// Achievement message
export const getAchievementMessage = async (achievementTitle: string, _achievementDescription: string): Promise<string> => {
  return `${EMOJI_TROPHY} Achievement Unlocked: ${achievementTitle}!`;
};

// Legacy export
export { getOfflineTip };





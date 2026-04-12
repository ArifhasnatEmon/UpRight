import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL_ID } from './config';
import { getOfflineTip } from './offlineTips';

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Rate limiting

const CACHE: Record<string, { value: string; expiresAt: number }> = {};
let lastApiCallTime = 0;
const MIN_API_INTERVAL = 60 * 60 * 1000; // 1 hour interval

const getCached = (key: string): string | null => {
  const entry = CACHE[key];
  if (entry && Date.now() < entry.expiresAt) return entry.value;
  return null;
};

const setCache = (key: string, value: string, ttlMs: number) => {
  CACHE[key] = { value, expiresAt: Date.now() + ttlMs };
};

const canCallApi = (): boolean => {
  return Date.now() - lastApiCallTime >= MIN_API_INTERVAL;
};

const markApiCall = () => {
  lastApiCallTime = Date.now();
};

// Daily tip
export const getDailyTip = async (avgScore: number, mostCommonIssue: string): Promise<string> => {
  const cacheKey = `daily_tip`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!canCallApi()) return getOfflineTip();

  try {
    const ai = getAI();
    if (!ai) return getOfflineTip();

    markApiCall();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: `You are an ergonomics expert. A user's average posture score this week is ${avgScore}/100. Their most common issue is: "${mostCommonIssue}". Give ONE specific, practical ergonomics tip in 1-2 short sentences. Be direct and actionable. No intro phrases like "Great question" or "Here's a tip".`,
    });

    const tip = response.text?.trim() || getOfflineTip();
    setCache(cacheKey, tip, 12 * 60 * 60 * 1000); // 12h cache
    return tip;
  } catch {
    return getOfflineTip();
  }
};

// Analytics insight
export const getAnalyticsInsight = async (
  avgScore: number,
  criticalPercent: number,
  tooClosePercent: number,
  worstHour: number | null
): Promise<string> => {
  const cacheKey = `insight_${avgScore}_${criticalPercent}_${tooClosePercent}_${worstHour}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (!canCallApi()) return '';

  try {
    const ai = getAI();
    if (!ai) return '';

    markApiCall();
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

    const insight = response.text?.trim() || '';
    setCache(cacheKey, insight, 2 * 60 * 60 * 1000); // 2h cache
    return insight;
  } catch {
    return '';
  }
};

// Achievement message
export const getAchievementMessage = async (achievementTitle: string, _achievementDescription: string): Promise<string> => {
  return `🏆 Achievement Unlocked: ${achievementTitle}!`;
};

// Legacy export
export { getOfflineTip };





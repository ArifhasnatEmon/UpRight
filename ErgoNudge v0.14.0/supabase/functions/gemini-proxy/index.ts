// supabase/functions/gemini-proxy/index.ts
// Deno Edge Function — secure Gemini API proxy for ErgoNudge
// The GEMINI_API_KEY lives as a Supabase secret, never in the client bundle.
// @ts-nocheck — Deno URL imports are not understood by VS Code's Node TS engine

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Prompt builders ──────────────────────────────────────────

function buildPrompt(type: string, context: Record<string, unknown>): string {
  switch (type) {
    case "daily_tip": {
      const avgScore = context.avgScore ?? 0;
      const issue = context.mostCommonIssue ?? "poor posture";
      return `You are a friendly, highly intelligent ergonomics coach. A user's average posture score is ${avgScore}/100 and their most common issue is "${issue}". Give ONE unique, highly actionable, and non-obvious piece of advice to help them improve. Keep it to exactly 2 short sentences. Do not use generic phrases like "sit up straight" or "adjust your chair".`;
    }
    case "analytics_insight": {
      const parts = [
        `Average score: ${context.avgScore ?? 0}/100`,
        `Critical slouching: ${context.criticalPercent ?? 0}% of the time`,
        `Too close to screen: ${context.tooClosePercent ?? 0}% of the time`,
        context.worstHour !== null && context.worstHour !== undefined
          ? `Worst hour: ${(() => {
              const hr = Number(context.worstHour);
              const ampm1 = hr >= 12 ? 'PM' : 'AM';
              const h1 = hr % 12 || 12;
              const nextHr = (hr + 1) % 24;
              const ampm2 = nextHr >= 12 ? 'PM' : 'AM';
              const h2 = nextHr % 12 || 12;
              return `${h1}:00 ${ampm1} to ${h2}:00 ${ampm2}`;
            })()}`
          : null,
      ].filter(Boolean).join(". ");
      return `You are an expert biomechanics analyst reviewing a user's daily posture data: ${parts}.
Write a highly engaging, personalized 3-sentence insight. 
Sentence 1: An interesting observation about their data patterns. 
Sentence 2: Why this specific pattern matters for their long-term health or energy levels.
Sentence 3: A practical, unique micro-habit they can start doing tomorrow to fix it.
Do NOT use robotic intro phrases. Be conversational but authoritative.`;
    }
    case "achievement": {
      const title = context.achievementTitle ?? "Achievement";
      return `Write a short, enthusiastic 1-sentence congratulations message for a user who just unlocked the "${title}" achievement in a posture tracking app. Keep it under 15 words. Include a relevant emoji.`;
    }
    default:
      return "";
  }
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse request body
    const body = await req.json() as {
      type?: string;
      context?: Record<string, unknown>;
    };

    const { type, context = {} } = body;

    // Validate type
    const validTypes = ["daily_tip", "analytics_insight", "achievement"];
    if (!type || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Unknown type. Valid types: ${validTypes.join(", ")}` }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Read API key from Supabase secret (never from request)
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[gemini-proxy] GEMINI_API_KEY secret not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Build prompt
    const prompt = buildPrompt(type, context);

    // Call Gemini REST API
    const geminiUrl = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("[gemini-proxy] Gemini API error:", geminiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Gemini API error" }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const result: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[gemini-proxy] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});

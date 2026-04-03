import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 2000;
const FALLBACK_TYPE = "meal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fallbackResponse() {
  return new Response(
    JSON.stringify({ type: FALLBACK_TYPE }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── Provider: Claude Haiku ──────────────────────────────────────────────────

async function callHaiku(prompt: string): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Haiku API error:", response.status, errorText);
    throw new Error(`Haiku error: ${response.status}`);
  }

  const result = await response.json();
  return result?.content?.[0]?.text?.trim() ?? "";
}

// ── Provider: Gemini Flash ──────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 20,
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini error: ${response.status}`);
  }

  const result = await response.json();
  return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mealName } = (await req.json()) as { mealName?: string };

    if (!mealName) {
      return fallbackResponse();
    }

    const apiKey = LLM_PROVIDER === "gemini" ? GEMINI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`${LLM_PROVIDER} API key not set`);
      return fallbackResponse();
    }

    const prompt = `Classify this meal/food name into one of these leftover types: meal, main, soup, side.

- "meal" = a complete dish (e.g. lasanha, empadão, pizza, bacalhau à brás)
- "main" = a main protein or centrepiece (e.g. frango grelhado, salmão, bifes)
- "soup" = any soup (e.g. sopa de legumes, canja, caldo verde)
- "side" = a side dish or accompaniment (e.g. arroz, batatas, salada, legumes)

If uncertain, default to "meal".

Food: "${mealName}"

Reply with ONLY a JSON object (no markdown, no backticks):
{"type": "<meal|main|soup|side>"}`;

    let rawText: string;
    try {
      rawText = LLM_PROVIDER === "gemini"
        ? await callGemini(prompt)
        : await callHaiku(prompt);
    } catch (err) {
      console.error(`${LLM_PROVIDER} call failed:`, err);
      return fallbackResponse();
    }

    let parsed: { type?: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const validTypes = ["meal", "main", "soup", "side"];
      const matched = validTypes.find(
        (t) => t.toLowerCase() === rawText.toLowerCase(),
      );
      return new Response(
        JSON.stringify({ type: matched ?? FALLBACK_TYPE }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validTypes = ["meal", "main", "soup", "side"];
    const type = validTypes.includes(parsed.type ?? "")
      ? parsed.type
      : FALLBACK_TYPE;

    return new Response(
      JSON.stringify({ type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("classify-leftover error:", err);
    return fallbackResponse();
  }
});

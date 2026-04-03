import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 2000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClassifyResult {
  name: string;
  type: string;
  doses: number | null;
  expiryDays: number | null;
}

function fallbackResponse(input: string) {
  return new Response(
    JSON.stringify({ name: input, type: "meal", doses: null, expiryDays: null }),
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
      max_tokens: 80,
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
        maxOutputTokens: 80,
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
    const { input } = (await req.json()) as { input?: string };

    if (!input) {
      return fallbackResponse("");
    }

    const apiKey = LLM_PROVIDER === "gemini" ? GEMINI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`${LLM_PROVIDER} API key not set`);
      return fallbackResponse(input);
    }

    const prompt = `You receive a voice command about food leftovers. Parse it: translate the food item name to Portuguese, infer the leftover type, and extract dose count and validity if mentioned.

Types (pick the best match):
- "soup" — soups (e.g. vegetable soup, chicken soup)
- "main" — main protein dishes (e.g. steaks, chicken breast, fish)
- "side" — side dishes (e.g. rice, pasta, potatoes, salad)
- "meal" — complete meals or when you cannot determine the type (e.g. lasagna, stew)

Input: "${input}"

Reply with ONLY a JSON object (no markdown, no backticks):
{"name": "<food name in Portuguese>", "type": "<meal|main|soup|side>", "doses": <number or null if not specified>, "expiryDays": <number of days or null if not specified>}

Examples:
- "rice" → {"name": "arroz", "type": "side", "doses": null, "expiryDays": null}
- "4 doses of rice for 3 days" → {"name": "arroz", "type": "side", "doses": 4, "expiryDays": 3}
- "chicken soup" → {"name": "sopa de frango", "type": "soup", "doses": null, "expiryDays": null}
- "3 doses of vegetable soup" → {"name": "sopa de legumes", "type": "soup", "doses": 3, "expiryDays": null}
- "lasagna for 5 days" → {"name": "lasanha", "type": "meal", "doses": null, "expiryDays": 5}
- "steaks" → {"name": "bifes", "type": "main", "doses": null, "expiryDays": null}
- "2 doses of pasta" → {"name": "massa", "type": "side", "doses": 2, "expiryDays": null}
- "fish valid for 2 days" → {"name": "peixe", "type": "main", "doses": null, "expiryDays": 2}
- "6 doses of stew for a week" → {"name": "estufado", "type": "meal", "doses": 6, "expiryDays": 7}
- "I ate the rice" → {"name": "arroz", "type": "side", "doses": null, "expiryDays": null}
- "I ate 3 doses of rice" → {"name": "arroz", "type": "side", "doses": 3, "expiryDays": null}
- "throw out the soup" → {"name": "sopa", "type": "soup", "doses": null, "expiryDays": null}`;

    let rawText: string;
    try {
      rawText = LLM_PROVIDER === "gemini"
        ? await callGemini(prompt)
        : await callHaiku(prompt);
    } catch (err) {
      console.error(`${LLM_PROVIDER} call failed:`, err);
      return fallbackResponse(input);
    }

    let parsed: { name?: string; type?: string; doses?: number | null; expiryDays?: number | null };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("classify-leftover: failed to parse LLM response:", rawText);
      return fallbackResponse(input);
    }

    const validTypes = ["meal", "main", "soup", "side"];
    const result: ClassifyResult = {
      name: parsed.name?.trim() || input,
      type: validTypes.includes(parsed.type ?? "") ? parsed.type! : "meal",
      doses: typeof parsed.doses === "number" && parsed.doses > 0 ? parsed.doses : null,
      expiryDays: typeof parsed.expiryDays === "number" && parsed.expiryDays > 0 ? parsed.expiryDays : null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("classify-leftover error:", err);
    return fallbackResponse("");
  }
});

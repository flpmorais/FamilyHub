import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config — set LLM_PROVIDER to "gemini" or "haiku" (default: haiku)
const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 2000;
const FALLBACK_CATEGORY = "Other";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fallbackResponse(itemName: string) {
  return new Response(
    JSON.stringify({ category: FALLBACK_CATEGORY, parsedName: itemName, quantityNote: null }),
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
    const { itemName, categories } = (await req.json()) as {
      itemName?: string;
      categories?: string[];
    };

    if (!itemName || !categories?.length) {
      return fallbackResponse(itemName ?? "");
    }

    // Check API key for selected provider
    const apiKey = LLM_PROVIDER === "gemini" ? GEMINI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`${LLM_PROVIDER} API key not set`);
      return fallbackResponse(itemName);
    }

    // Build prompt (shared across providers)
    const prompt = `You receive a shopping item input (in any language) that may contain a quantity and an item name. Parse it, translate the item name and quantity to Portuguese, and classify into a category.

Input: "${itemName}"
Categories: ${categories.join(", ")}

Reply with ONLY a JSON object (no markdown, no backticks):
{"name": "<item name in Portuguese, without quantity>", "quantity": <quantity string in Portuguese, or null if none>, "category": "<best category from the list>"}

Examples:
- "milk" → {"name": "leite", "quantity": null, "category": "Dairy"}
- "3 packs of milk" → {"name": "leite", "quantity": "3 pacotes", "category": "Dairy"}
- "olive oil" → {"name": "azeite", "quantity": null, "category": "Pantry"}
- "half a kilo of rice" → {"name": "arroz", "quantity": "meio quilo", "category": "Pantry"}
- "leite" → {"name": "leite", "quantity": null, "category": "Dairy"}
- "3 pacotes de leite" → {"name": "leite", "quantity": "3 pacotes", "category": "Dairy"}`;

    // Call selected provider
    let rawText: string;
    try {
      rawText = LLM_PROVIDER === "gemini"
        ? await callGemini(prompt)
        : await callHaiku(prompt);
    } catch (err) {
      console.error(`${LLM_PROVIDER} call failed:`, err);
      return fallbackResponse(itemName);
    }

    // Parse JSON response (shared)
    let parsed: { name?: string; quantity?: string | null; category?: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // LLM returned non-JSON — try to match as category name
      const matched = categories.find(
        (c) => c.toLowerCase() === rawText.toLowerCase(),
      );
      return new Response(
        JSON.stringify({ category: matched ?? FALLBACK_CATEGORY, parsedName: itemName, quantityNote: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsedName = parsed.name?.trim() || itemName;
    const quantityNote = parsed.quantity?.trim() || null;
    const matchedCategory = categories.find(
      (c) => c.toLowerCase() === (parsed.category ?? "").toLowerCase(),
    );

    return new Response(
      JSON.stringify({
        category: matchedCategory ?? FALLBACK_CATEGORY,
        parsedName,
        quantityNote,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("classify-item error:", err);
    return new Response(
      JSON.stringify({ category: FALLBACK_CATEGORY, parsedName: "", quantityNote: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

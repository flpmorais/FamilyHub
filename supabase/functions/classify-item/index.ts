import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config — set LLM_PROVIDER to "gemini" or "haiku" (default: haiku)
const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 2000;
const FALLBACK_CATEGORY = "Outros";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fallbackResponse(itemName: string) {
  return new Response(
    JSON.stringify({ category: FALLBACK_CATEGORY, parsedName: itemName, quantityNote: null, isUrgent: false }),
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
    const prompt = `You receive a shopping item input (in any language) that may contain a quantity, an urgency marker, and an item name. Parse it, translate the item name and quantity to Portuguese, classify into a category, and detect if it is urgent.

If the input contains urgency markers like "urgent", "urgently", "asap", or "right now", set "urgent" to true and remove the urgency word from the item name. Otherwise set "urgent" to false.

Input: "${itemName}"
Categories: ${categories.join(", ")}

Reply with ONLY a JSON object (no markdown, no backticks):
{"name": "<item name in Portuguese, without quantity or urgency words>", "quantity": <quantity string in Portuguese, or null if none>, "category": "<best category from the list>", "urgent": <true or false>}

Examples:
- "milk" → {"name": "leite", "quantity": null, "category": "Lacticínios", "urgent": false}
- "3 packs of milk" → {"name": "leite", "quantity": "3 pacotes", "category": "Lacticínios", "urgent": false}
- "urgent milk" → {"name": "leite", "quantity": null, "category": "Lacticínios", "urgent": true}
- "milk urgent" → {"name": "leite", "quantity": null, "category": "Lacticínios", "urgent": true}
- "3 packs of urgent milk" → {"name": "leite", "quantity": "3 pacotes", "category": "Lacticínios", "urgent": true}
- "olive oil" → {"name": "azeite", "quantity": null, "category": "Despensa", "urgent": false}
- "half a kilo of rice" → {"name": "arroz", "quantity": "meio quilo", "category": "Despensa", "urgent": false}
- "leite" → {"name": "leite", "quantity": null, "category": "Lacticínios", "urgent": false}
- "3 pacotes de leite" → {"name": "leite", "quantity": "3 pacotes", "category": "Lacticínios", "urgent": false}`;

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
    let parsed: { name?: string; quantity?: string | null; category?: string; urgent?: boolean };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // LLM returned non-JSON — try to match as category name
      const matched = categories.find(
        (c) => c.toLowerCase() === rawText.toLowerCase(),
      );
      return new Response(
        JSON.stringify({ category: matched ?? FALLBACK_CATEGORY, parsedName: itemName, quantityNote: null, isUrgent: false }),
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
        isUrgent: Boolean(parsed.urgent),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("classify-item error:", err);
    return new Response(
      JSON.stringify({ category: FALLBACK_CATEGORY, parsedName: "", quantityNote: null, isUrgent: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

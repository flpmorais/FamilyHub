import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config — same pattern as classify-item
const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const LLM_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 3000;
const MAX_TEXT_LENGTH = 4000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function errorResponse(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── HTML stripping ─────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

// ── LLM Providers ──────────────────────────────────────────────────────────

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
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Haiku API error:", response.status, errorText);
    throw new Error(`Haiku error: ${response.status}`);
  }

  const result = await response.json();
  return result?.content?.[0]?.text?.trim() ?? "";
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
      },
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini error: ${response.status}`);
  }

  const result = await response.json();
  return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = (await req.json()) as { url?: string };

    if (!url) {
      return errorResponse("URL is required");
    }

    // Check API key
    const apiKey = LLM_PROVIDER === "gemini" ? GEMINI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`${LLM_PROVIDER} API key not set`);
      return errorResponse("LLM provider not configured");
    }

    // 1. Fetch HTML
    let html: string;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 FamilyHub Recipe Importer" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        return errorResponse(`Failed to fetch URL: ${response.status}`);
      }

      html = await response.text();
    } catch (err) {
      console.error("URL fetch failed:", err);
      return errorResponse("Could not fetch the URL. Check the link and try again.");
    }

    // 2. Strip HTML to text
    const text = stripHtml(html);

    if (text.length < 50) {
      return errorResponse("Page content too short to extract a recipe");
    }

    // 3. Build prompt
    const prompt = `Extract a recipe from the following web page text. Return ONLY a JSON object (no markdown, no backticks, no explanation):

{"name": "<recipe name>", "type": "<one of: meal, main, side, soup, dessert, other>", "ingredients": [{"name": "<ingredient name>", "quantity": "<amount with unit, or null if not specified>"}], "steps": ["<step 1 text>", "<step 2 text>"], "servings": <number or null>, "prepTimeMinutes": <number or null>, "cookTimeMinutes": <number or null>}

Rules:
- "type" must be exactly one of: meal, main, side, soup, dessert, other
- Keep ingredient names and steps in the original language of the recipe
- Each step should be a complete instruction
- If servings/times are not found, use null
- If no recipe is found in the text, return {"error": "No recipe found"}

Web page text:
${text}`;

    // 4. Call LLM
    let rawText: string;
    try {
      rawText = LLM_PROVIDER === "gemini"
        ? await callGemini(prompt)
        : await callHaiku(prompt);
    } catch (err) {
      console.error(`${LLM_PROVIDER} call failed:`, err);
      return errorResponse("LLM extraction failed. Try again.");
    }

    // 5. Parse JSON response
    let parsed: Record<string, unknown>;
    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("LLM returned non-JSON:", rawText.slice(0, 200));
      return errorResponse("Could not parse recipe from page content");
    }

    // Check for error response from LLM
    if (parsed.error) {
      return errorResponse(String(parsed.error));
    }

    // 6. Return structured recipe
    return new Response(
      JSON.stringify({
        name: parsed.name ?? "",
        type: parsed.type ?? "other",
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        servings: typeof parsed.servings === "number" ? parsed.servings : null,
        prepTimeMinutes: typeof parsed.prepTimeMinutes === "number" ? parsed.prepTimeMinutes : null,
        cookTimeMinutes: typeof parsed.cookTimeMinutes === "number" ? parsed.cookTimeMinutes : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("extract-recipe error:", err);
    return errorResponse("An unexpected error occurred");
  }
});

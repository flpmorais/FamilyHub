import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config — same pattern as extract-recipe
const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const LLM_TIMEOUT_MS = 8000;

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

const RECIPE_PROMPT = `Extract a recipe from this image of a printed or handwritten recipe. Return ONLY a JSON object (no markdown, no backticks, no explanation):

{"name": "<recipe name>", "type": "<one of: meal, main, side, soup, dessert, other>", "ingredients": [{"name": "<ingredient name>", "quantity": "<amount with unit, or null if not specified>"}], "steps": ["<step 1 text>", "<step 2 text>"], "servings": <number or null>, "prepTimeMinutes": <number or null>, "cookTimeMinutes": <number or null>}

Rules:
- "type" must be exactly one of: meal, main, side, soup, dessert, other
- Keep ingredient names and steps in the original language of the recipe
- Each step should be a complete instruction
- If servings/times are not found, use null
- If the image does not contain a recipe, return {"error": "No recipe found"}`;

// ── LLM with Vision ───────────────────────────────────────────────────────

async function callHaikuVision(imageBase64: string, mimeType: string): Promise<string> {
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
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: RECIPE_PROMPT,
          },
        ],
      }],
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Haiku Vision API error:", response.status, errorText);
    throw new Error(`Haiku error: ${response.status}`);
  }

  const result = await response.json();
  return result?.content?.[0]?.text?.trim() ?? "";
}

async function callGeminiVision(imageBase64: string, mimeType: string): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: RECIPE_PROMPT,
          },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
      },
    }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Vision API error:", response.status, errorText);
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
    const { imageBase64, mimeType } = (await req.json()) as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return errorResponse("imageBase64 is required");
    }

    const resolvedMimeType = mimeType ?? "image/jpeg";

    // Check API key
    const apiKey = LLM_PROVIDER === "gemini" ? GEMINI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`${LLM_PROVIDER} API key not set`);
      return errorResponse("LLM provider not configured");
    }

    // Call LLM with vision
    let rawText: string;
    try {
      rawText = LLM_PROVIDER === "gemini"
        ? await callGeminiVision(imageBase64, resolvedMimeType)
        : await callHaikuVision(imageBase64, resolvedMimeType);
    } catch (err) {
      console.error(`${LLM_PROVIDER} vision call failed:`, err);
      return errorResponse("LLM extraction failed. Try again with a clearer photo.");
    }

    // Parse JSON response
    let parsed: Record<string, unknown>;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("LLM returned non-JSON:", rawText.slice(0, 200));
      return errorResponse("Could not parse recipe from photo");
    }

    // Check for error response from LLM
    if (parsed.error) {
      return errorResponse(String(parsed.error));
    }

    // Return structured recipe
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
    console.error("extract-recipe-photo error:", err);
    return errorResponse("An unexpected error occurred");
  }
});

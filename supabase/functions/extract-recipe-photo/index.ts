import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_TIMEOUT_MS = 8000;
const SONNET_TIMEOUT_MS = 30000;

type ModelChoice = "haiku" | "sonnet";

const MODEL_IDS: Record<ModelChoice, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250514",
};

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
- ALWAYS translate the recipe name, all ingredient names, and all steps to European Portuguese (pt-PT), never Brazilian Portuguese (pt-BR)
- Each step should be a complete instruction
- If servings/times are not found, use null
- If the image does not contain a recipe, return {"error": "No recipe found"}
- For ingredients: first look for a structured ingredient list; only if no ingredient list is found, try to infer ingredients from the recipe steps
- Unit conversion for English-language recipes: convert cups to ml (1 cup = 234 ml), tablespoons to ml (1 tablespoon = 15 ml), teaspoons to ml (1 teaspoon = 5 ml)
- Unit conversion for non-English recipes: use "chavenas" for cups, "colheres de sopa" for tablespoons, "colheres de chá" for teaspoons (do NOT convert to ml)
- ALWAYS convert pints, quarts, and gallons to ml; ALWAYS convert ounces and pounds to grams`;

// ── LLM with Vision ───────────────────────────────────────────────────────

async function callAnthropicVision(imageBase64: string, mimeType: string, model: ModelChoice): Promise<string> {
  const isSonnet = model === "sonnet";
  const timeout = isSonnet ? SONNET_TIMEOUT_MS : HAIKU_TIMEOUT_MS;

  const body: Record<string, unknown> = {
    model: MODEL_IDS[model],
    max_tokens: isSonnet ? 4000 : 2000,
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
  };

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${model} Vision API error:`, response.status, errorText);
    throw new Error(`${model} error: ${response.status}`);
  }

  const result = await response.json();
  const textBlock = result?.content?.find((b: { type: string }) => b.type === "text");
  return textBlock?.text?.trim() ?? "";
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, model: rawModel } = (await req.json()) as {
      imageBase64?: string;
      mimeType?: string;
      model?: string;
    };

    if (!imageBase64) {
      return errorResponse("imageBase64 is required");
    }

    const resolvedMimeType = mimeType ?? "image/jpeg";
    const model: ModelChoice = (["haiku", "sonnet"] as const).includes(rawModel as ModelChoice)
      ? (rawModel as ModelChoice)
      : "haiku";

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not set");
      return errorResponse("LLM provider not configured");
    }

    // Call LLM with vision
    let rawText: string;
    try {
      rawText = await callAnthropicVision(imageBase64, resolvedMimeType, model);
    } catch (err) {
      console.error(`${model} vision call failed:`, err);
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

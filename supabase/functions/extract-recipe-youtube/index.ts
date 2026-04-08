import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_DATA_API_KEY") ?? "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_TIMEOUT_MS = 12000;
const SONNET_TIMEOUT_MS = 30000;
const FETCH_TIMEOUT_MS = 6000;
const MAX_TEXT_LENGTH = 8000;

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

function recipeResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── LLM Provider ──────────────────────────────────────────────────────────

async function callAnthropic(prompt: string, model: ModelChoice): Promise<string> {
  const isSonnet = model === "sonnet";
  const timeout = isSonnet ? SONNET_TIMEOUT_MS : HAIKU_TIMEOUT_MS;

  const body: Record<string, unknown> = {
    model: MODEL_IDS[model],
    max_tokens: isSonnet ? 4000 : 2000,
    messages: [{ role: "user", content: prompt }],
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
    console.error(`${model} API error:`, response.status, errorText);
    throw new Error(`${model} error: ${response.status}`);
  }

  const result = await response.json();
  const textBlock = result?.content?.find((b: { type: string }) => b.type === "text");
  return textBlock?.text?.trim() ?? "";
}

// ── YouTube Data API: video description ───────────────────────────────────

async function fetchVideoDescription(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("YouTube videos API error:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const data = await response.json();
    const snippet = data.items?.[0]?.snippet;
    if (!snippet) {
      console.log("No video snippet found");
      return null;
    }

    // Combine title and description for better context
    const text = `Title: ${snippet.title ?? ""}\n\nDescription:\n${snippet.description ?? ""}`.trim().slice(0, MAX_TEXT_LENGTH);
    console.log(`Video description extracted: ${text.length} chars`);
    return text.length > 50 ? text : null;
  } catch (err) {
    console.error("Video description fetch failed:", err);
    return null;
  }
}

// ── YouTube Data API: comments ────────────────────────────────────────────

async function fetchComments(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("YouTube comments API error:", response.status, errText);
      // Comments may be disabled — not a fatal error
      return null;
    }

    const data = await response.json();
    const comments = (data.items ?? [])
      .map(
        (item: { snippet?: { topLevelComment?: { snippet?: { textDisplay?: string } } } }) =>
          item.snippet?.topLevelComment?.snippet?.textDisplay ?? "",
      )
      .filter(Boolean)
      .join("\n");

    const text = comments.slice(0, MAX_TEXT_LENGTH);
    console.log(`Comments extracted: ${text.length} chars`);
    return text.length > 30 ? text : null;
  } catch (err) {
    console.error("Comments fetch failed:", err);
    return null;
  }
}

// ── LLM extraction ────────────────────────────────────────────────────────

function buildRecipePrompt(text: string, source: string): string {
  return `Extract a recipe from the following ${source}. Return ONLY a JSON object (no markdown, no backticks, no explanation):

{"name": "<recipe name>", "type": "<one of: meal, main, side, soup, dessert, other>", "ingredients": [{"name": "<ingredient name>", "quantity": "<amount with unit, or null if not specified>"}], "steps": ["<step 1 text>", "<step 2 text>"], "servings": <number or null>, "prepTimeMinutes": <number or null>, "cookTimeMinutes": <number or null>}

Rules:
- "type" must be exactly one of: meal, main, side, soup, dessert, other
- ALWAYS translate the recipe name, all ingredient names, and all steps to European Portuguese (pt-PT), never Brazilian Portuguese (pt-BR)
- Each step should be a complete instruction
- If servings/times are not found, use null
- If no recipe is found in the text, return {"error": "No recipe found"}
- For ingredients: first look for a structured ingredient list in the text; only if no ingredient list is found, try to infer ingredients from the recipe steps
- Unit conversion for English-language recipes: convert cups to ml (1 cup = 234 ml), tablespoons to ml (1 tablespoon = 15 ml), teaspoons to ml (1 teaspoon = 5 ml)
- Unit conversion for non-English recipes: use "chavenas" for cups, "colheres de sopa" for tablespoons, "colheres de chá" for teaspoons (do NOT convert to ml)
- ALWAYS convert pints, quarts, and gallons to ml; ALWAYS convert ounces and pounds to grams

Text:
${text}`;
}

function parseRecipeJson(rawText: string): Record<string, unknown> | null {
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function formatRecipeResponse(parsed: Record<string, unknown>) {
  return recipeResponse({
    name: parsed.name ?? "",
    type: parsed.type ?? "other",
    ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    servings: typeof parsed.servings === "number" ? parsed.servings : null,
    prepTimeMinutes: typeof parsed.prepTimeMinutes === "number" ? parsed.prepTimeMinutes : null,
    cookTimeMinutes: typeof parsed.cookTimeMinutes === "number" ? parsed.cookTimeMinutes : null,
  });
}

async function tryExtractFromText(text: string, source: string, model: ModelChoice): Promise<Response | null> {
  try {
    const rawText = await callAnthropic(buildRecipePrompt(text, source), model);
    const parsed = parseRecipeJson(rawText);
    if (parsed && !parsed.error) {
      return formatRecipeResponse(parsed);
    }
    console.log(`LLM extraction from ${source} returned no recipe`);
    return null;
  } catch (err) {
    console.error(`LLM call for ${source} failed:`, err);
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId, model: rawModel } = (await req.json()) as { videoId?: string; model?: string };

    if (!videoId) {
      return errorResponse("videoId is required");
    }

    const model: ModelChoice = (["haiku", "sonnet"] as const).includes(rawModel as ModelChoice)
      ? (rawModel as ModelChoice)
      : "haiku";

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not set");
      return errorResponse("LLM provider not configured");
    }

    if (!YOUTUBE_API_KEY) {
      console.error("YOUTUBE_DATA_API_KEY not set");
      return errorResponse("YouTube API key not configured. Set YOUTUBE_DATA_API_KEY in Supabase secrets.");
    }

    // Step 1: Try video description (title + description from YouTube Data API)
    console.log(`[${videoId}] Step 1: Fetching video description via API...`);
    const description = await fetchVideoDescription(videoId);

    if (description) {
      const result = await tryExtractFromText(description, "YouTube video description", model);
      if (result) return result;
      console.log(`[${videoId}] Description extraction failed, trying comments...`);
    } else {
      console.log(`[${videoId}] No description available, trying comments...`);
    }

    // Step 2: Fallback to comments
    console.log(`[${videoId}] Step 2: Fetching comments via API...`);
    const comments = await fetchComments(videoId);

    if (comments) {
      const result = await tryExtractFromText(comments, "YouTube video comments", model);
      if (result) return result;
    }

    // Step 3: Nothing worked
    console.log(`[${videoId}] All extraction attempts failed`);
    return errorResponse("No recipe found in video description or comments");
  } catch (err) {
    console.error("extract-recipe-youtube error:", err);
    return errorResponse("An unexpected error occurred");
  }
});

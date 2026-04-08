import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_TIMEOUT_MS = 15000;
const SONNET_TIMEOUT_MS = 30000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_TEXT_LENGTH = 8000;
const MAX_JSONLD_LENGTH = 12000;

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

// ── JSON-LD extraction ────────────────────────────────────────────────────

function extractJsonLdRecipe(html: string): string | null {
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  const isRecipeType = (type: unknown): boolean =>
    type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);

      if (isRecipeType(data["@type"])) {
        return JSON.stringify(data).slice(0, MAX_JSONLD_LENGTH);
      }

      if (Array.isArray(data)) {
        const recipe = data.find((item: Record<string, unknown>) => isRecipeType(item["@type"]));
        if (recipe) return JSON.stringify(recipe).slice(0, MAX_JSONLD_LENGTH);
      }

      if (data["@graph"] && Array.isArray(data["@graph"])) {
        const recipe = data["@graph"].find((item: Record<string, unknown>) => isRecipeType(item["@type"]));
        if (recipe) return JSON.stringify(recipe).slice(0, MAX_JSONLD_LENGTH);
      }
    } catch {
      continue;
    }
  }

  return null;
}

// ── Recipe container extraction ───────────────────────────────────────────

function extractRecipeHtml(html: string): string | null {
  const patterns = [
    /<div[^>]+class="[^"]*wprm-recipe-container[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?:<\/div>\s*)*<!-- end wprm/i,
    /<div[^>]+class="[^"]*wprm-recipe[^"]*"[^>]*>[\s\S]+/i,
    /<div[^>]+class="[^"]*tasty-recipe[^"]*"[^>]*>[\s\S]+/i,
    /<div[^>]+class="[^"]*easyrecipe[^"]*"[^>]*>[\s\S]+/i,
    /<div[^>]+class="[^"]*recipe-card[^"]*"[^>]*>[\s\S]+/i,
    /<div[^>]+itemtype="[^"]*schema\.org\/Recipe[^"]*"[^>]*>[\s\S]+/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[0].length > 200) {
      return match[0];
    }
  }

  return null;
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

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, text, model: rawModel } = (await req.json()) as { url?: string; text?: string; model?: string };

    if (!url && !text) {
      return errorResponse("URL or text is required");
    }

    const model: ModelChoice = (["haiku", "sonnet"] as const).includes(rawModel as ModelChoice)
      ? (rawModel as ModelChoice)
      : "haiku";

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not set");
      return errorResponse("LLM provider not configured");
    }

    // 1. Get page text (from raw text or URL fetch)
    let pageText: string;
    let isStructuredData = false;

    if (text) {
      pageText = text.trim().slice(0, MAX_TEXT_LENGTH);
    } else {
      let html: string;
      try {
        const response = await fetch(url!, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.5",
          },
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

        // Tier 1: JSON-LD structured recipe data
      const jsonLd = extractJsonLdRecipe(html);
      if (jsonLd) {
        pageText = jsonLd;
        isStructuredData = true;
      } else {
        // Tier 2: Recipe container extraction, Tier 3: full page strip
        const recipeSection = extractRecipeHtml(html);
        pageText = stripHtml(recipeSection ?? html);
      }
    }

    if (pageText.length < 50) {
      return errorResponse("Page content too short to extract a recipe");
    }

    // 3. Build prompt
    const sourceLabel = isStructuredData ? "structured recipe data (JSON-LD)" : "web page text";

    const prompt = `Extract a recipe from the following ${sourceLabel}. Return ONLY a JSON object (no markdown, no backticks, no explanation):

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

${isStructuredData ? "Structured recipe data" : "Web page text"}:
${pageText}`;

    // 4. Call LLM
    let rawText: string;
    try {
      rawText = await callAnthropic(prompt, model);
    } catch (err) {
      console.error(`${model} call failed:`, err);
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

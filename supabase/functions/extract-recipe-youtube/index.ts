import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provider config — same pattern as extract-recipe
const LLM_PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "haiku";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_DATA_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const LLM_TIMEOUT_MS = 12000;
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

function recipeResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
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

async function callLlm(prompt: string): Promise<string> {
  return LLM_PROVIDER === "gemini"
    ? await callGemini(prompt)
    : await callHaiku(prompt);
}

// ── Transcript fetching ────────────────────────────────────────────────────

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Fetch YouTube watch page to extract caption track URLs
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const html = await response.text();

    // Extract captionTracks from ytInitialPlayerResponse
    const match = html.match(/"captionTracks":\s*(\[[^\]]*\])/);
    if (!match) {
      console.log("No captionTracks found in page HTML");
      return null;
    }

    let tracks: { baseUrl?: string; languageCode?: string }[];
    try {
      tracks = JSON.parse(match[1]);
    } catch {
      console.log("Failed to parse captionTracks JSON");
      return null;
    }

    if (!tracks?.length || !tracks[0].baseUrl) {
      console.log("No caption track URLs found");
      return null;
    }

    // Fetch the first available caption track (usually auto-generated)
    const trackUrl = tracks[0].baseUrl;
    const trackResponse = await fetch(trackUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const trackXml = await trackResponse.text();

    // Parse XML to plain text
    const text = trackXml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);

    return text.length > 50 ? text : null;
  } catch (err) {
    console.error("Transcript fetch failed:", err);
    return null;
  }
}

// ── Comments fallback ──────────────────────────────────────────────────────

async function fetchComments(videoId: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    console.log("No YOUTUBE_DATA_API_KEY set, skipping comments fallback");
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&order=relevance&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("YouTube comments API error:", response.status);
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
- Keep ingredient names and steps in the original language of the recipe
- Each step should be a complete instruction
- If servings/times are not found, use null
- If no recipe is found in the text, return {"error": "No recipe found"}

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

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId } = (await req.json()) as { videoId?: string };

    if (!videoId) {
      return errorResponse("videoId is required");
    }

    // Check LLM API key
    const apiKey = LLM_PROVIDER === "gemini" ? GEMINI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(`${LLM_PROVIDER} API key not set`);
      return errorResponse("LLM provider not configured");
    }

    // Step 1: Try transcript
    console.log(`Fetching transcript for video ${videoId}...`);
    const transcript = await fetchTranscript(videoId);

    if (transcript) {
      console.log(`Transcript found (${transcript.length} chars), sending to LLM...`);
      try {
        const rawText = await callLlm(
          buildRecipePrompt(transcript, "YouTube video transcript"),
        );
        const parsed = parseRecipeJson(rawText);

        if (parsed && !parsed.error) {
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
        console.log("Transcript LLM extraction returned no recipe, trying comments...");
      } catch (err) {
        console.error("Transcript LLM call failed:", err);
      }
    } else {
      console.log("No transcript available, trying comments...");
    }

    // Step 2: Fallback to comments
    const comments = await fetchComments(videoId);

    if (comments) {
      console.log(`Comments found (${comments.length} chars), sending to LLM...`);
      try {
        const rawText = await callLlm(
          buildRecipePrompt(comments, "YouTube video comments"),
        );
        const parsed = parseRecipeJson(rawText);

        if (parsed && !parsed.error) {
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
      } catch (err) {
        console.error("Comments LLM call failed:", err);
      }
    }

    // Step 3: Nothing worked
    return errorResponse("No recipe found in transcript or comments");
  } catch (err) {
    console.error("extract-recipe-youtube error:", err);
    return errorResponse("An unexpected error occurred");
  }
});

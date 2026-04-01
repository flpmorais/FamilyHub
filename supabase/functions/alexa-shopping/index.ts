import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALEXA_API_KEY = Deno.env.get("ALEXA_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLASSIFY_URL = `${SUPABASE_URL}/functions/v1/classify-item`;
const DEV_SYNC_URL = Deno.env.get("DEV_SYNC_URL") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Dev mirror (fire-and-forget) ────────────────────────────────────────────

async function mirrorToDev(payload: Record<string, unknown>) {
  if (!DEV_SYNC_URL) return;
  try {
    await fetch(DEV_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": ALEXA_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Best-effort — don't fail prod if dev is down
  }
}

// ── Alexa response helpers ──────────────────────────────────────────────────

function alexaResponse(text: string, endSession = true) {
  return new Response(
    JSON.stringify({
      version: "1.0",
      response: {
        outputSpeech: { type: "PlainText", text },
        shouldEndSession: endSession,
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function error401() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

// ── DB helpers ──────────────────────────────────────────────────────────────

let cachedFamilyId: string | null = null;

async function getFamilyId(): Promise<string> {
  if (cachedFamilyId) return cachedFamilyId;
  const { data, error } = await supabase
    .from("families")
    .select("id")
    .limit(1)
    .single();
  if (error || !data) throw new Error("Family not found");
  cachedFamilyId = data.id;
  return data.id;
}

async function findByName(
  familyId: string,
  name: string,
): Promise<{ id: string; is_ticked: boolean; category_id: string } | null> {
  const { data, error } = await supabase
    .from("shopping_items")
    .select("id, is_ticked, category_id")
    .eq("family_id", familyId)
    .ilike("name", name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getCategoryNames(
  familyId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("shopping_categories")
    .select("id, name")
    .eq("family_id", familyId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface ClassifyResult {
  category: string;
  parsedName: string;
  quantityNote: string | null;
}

async function classifyItem(
  itemName: string,
  categories: string[],
): Promise<ClassifyResult> {
  try {
    const res = await fetch(CLASSIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ itemName, categories }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { category: "Outros", parsedName: itemName, quantityNote: null };
    const data = await res.json();
    return {
      category: data?.category ?? "Other",
      parsedName: data?.parsedName || itemName,
      quantityNote: data?.quantityNote ?? null,
    };
  } catch {
    return { category: "Outros", parsedName: itemName, quantityNote: null };
  }
}

// ── Intent handlers ─────────────────────────────────────────────────────────

async function handleAddItem(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();

  // Parse + translate to Portuguese + classify in one LLM call
  const cats = await getCategoryNames(familyId);
  const catNames = cats.map((c) => c.name);
  const { parsedName, quantityNote, category } = await classifyItem(rawInput, catNames);

  // Dedup check using Portuguese parsed name
  const existing = await findByName(familyId, parsedName);

  if (existing && !existing.is_ticked) {
    return alexaResponse(`${rawInput} is already on the list.`);
  }

  if (existing && existing.is_ticked) {
    const updates: Record<string, unknown> = {
      is_ticked: false,
      updated_at: new Date().toISOString(),
    };
    if (quantityNote) updates.quantity_note = quantityNote;
    await supabase
      .from("shopping_items")
      .update(updates)
      .eq("id", existing.id);
    mirrorToDev({ action: "untick", name: parsedName, quantityNote });
    return alexaResponse(`${rawInput} is back on the list.`);
  }

  // New item — create with Portuguese name, quantity, and classified category
  const matchedCat = cats.find((c) => c.name === category);
  const categoryId =
    matchedCat?.id ?? cats.find((c) => c.name === "Outros")?.id ?? cats[0]?.id;

  const ts = new Date().toISOString();
  await supabase.from("shopping_items").insert({
    family_id: familyId,
    name: parsedName,
    category_id: categoryId,
    quantity_note: quantityNote,
    is_ticked: false,
    created_at: ts,
    updated_at: ts,
  });

  mirrorToDev({ action: "add", name: parsedName, categoryName: category, quantityNote });
  return alexaResponse(`Added ${rawInput} to the list.`);
}

async function handleRemoveItem(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();

  // Translate to Portuguese for DB lookup
  const cats = await getCategoryNames(familyId);
  const catNames = cats.map((c) => c.name);
  const { parsedName } = await classifyItem(rawInput, catNames);

  const existing = await findByName(familyId, parsedName);

  if (!existing) {
    return alexaResponse(`${rawInput} is not on the list.`);
  }

  await supabase
    .from("shopping_items")
    .update({ is_ticked: true, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  mirrorToDev({ action: "tick", name: parsedName });
  return alexaResponse(`Removed ${rawInput} from the list.`);
}

async function handleCheckItem(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();

  // Translate to Portuguese for DB lookup
  const cats = await getCategoryNames(familyId);
  const catNames = cats.map((c) => c.name);
  const { parsedName } = await classifyItem(rawInput, catNames);

  const existing = await findByName(familyId, parsedName);

  if (existing && !existing.is_ticked) {
    return alexaResponse(`Yes, ${rawInput} is on the list.`);
  }

  return alexaResponse(`No, ${rawInput} is not on the list.`);
}

async function handleLastItem(): Promise<Response> {
  const familyId = await getFamilyId();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("name")
    .eq("family_id", familyId)
    .eq("is_ticked", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return alexaResponse("The list is empty.");
  }

  // Last item name is in Portuguese (from DB) — respond with it as-is
  return alexaResponse(`The last item was ${data.name}.`);
}

async function handleSetQuantity(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();

  // Parse "milk is 3 packs" → parsedName: "leite", quantityNote: "3 pacotes"
  const cats = await getCategoryNames(familyId);
  const catNames = cats.map((c) => c.name);
  const { parsedName, quantityNote } = await classifyItem(rawInput, catNames);

  if (!quantityNote) {
    return alexaResponse(
      `I didn't catch the quantity. Try saying: set quantity of milk to 3 packs.`,
    );
  }

  const existing = await findByName(familyId, parsedName);

  if (!existing) {
    return alexaResponse(`That item is not on the list.`);
  }

  await supabase
    .from("shopping_items")
    .update({
      quantity_note: quantityNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  mirrorToDev({ action: "setQuantity", name: parsedName, quantityNote });
  return alexaResponse(`Updated the quantity.`);
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Auth check — accept header (curl/testing) or query param (Alexa endpoint)
  const url = new URL(req.url);
  const apiKey =
    req.headers.get("x-api-key") ??
    req.headers.get("X-Api-Key") ??
    url.searchParams.get("api_key");
  if (!ALEXA_API_KEY || apiKey !== ALEXA_API_KEY) {
    return error401();
  }

  try {
    const body = await req.json();
    const requestType = body?.request?.type;

    if (requestType === "LaunchRequest") {
      return alexaResponse(
        "Hi! You can add, remove, or check items on the shopping list.",
        false,
      );
    }

    if (requestType === "SessionEndedRequest") {
      return alexaResponse("", true);
    }

    if (requestType !== "IntentRequest") {
      return alexaResponse("I didn't catch that. Try again.");
    }

    const intentName = body.request.intent.name;
    const slots = body.request.intent.slots ?? {};

    switch (intentName) {
      case "AddItem": {
        const item = slots.item?.value;
        if (!item) return alexaResponse("I didn't catch the item. Try again.");
        return await handleAddItem(item);
      }

      case "RemoveItem": {
        const item = slots.item?.value;
        if (!item) return alexaResponse("I didn't catch the item. Try again.");
        return await handleRemoveItem(item);
      }

      case "CheckItem": {
        const item = slots.item?.value;
        if (!item) return alexaResponse("I didn't catch the item. Try again.");
        return await handleCheckItem(item);
      }

      case "LastItem":
        return await handleLastItem();

      case "SetQuantity": {
        const input = slots.input?.value;
        if (!input)
          return alexaResponse(
            "I didn't catch that. Try saying: set quantity of milk to 3 packs.",
          );
        return await handleSetQuantity(input);
      }

      case "AMAZON.HelpIntent":
        return alexaResponse(
          "Say add and the item name, remove and the item name, or ask if something is on the list.",
          false,
        );

      case "AMAZON.CancelIntent":
      case "AMAZON.StopIntent":
        return alexaResponse("Goodbye!");

      case "AMAZON.FallbackIntent":
        return alexaResponse(
          "I didn't catch that. You can add, remove, or check items.",
          false,
        );

      default:
        return alexaResponse("I didn't catch that. Try again.");
    }
  } catch (err) {
    console.error("alexa-shopping error:", err);
    return alexaResponse("Something went wrong. Try again later.");
  }
});

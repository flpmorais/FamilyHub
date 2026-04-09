import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALEXA_API_KEY = Deno.env.get("ALEXA_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLASSIFY_URL = `${SUPABASE_URL}/functions/v1/classify-item`;
const CLASSIFY_LEFTOVER_URL = `${SUPABASE_URL}/functions/v1/classify-leftover`;
const DEV_SYNC_URL = Deno.env.get("DEV_SYNC_URL") ?? "";
const DEV_SYNC_LEFTOVERS_URL = Deno.env.get("DEV_SYNC_LEFTOVERS_URL") ?? "";

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

async function mirrorLeftoverToDev(payload: Record<string, unknown>) {
  if (!DEV_SYNC_LEFTOVERS_URL) return;
  try {
    await fetch(DEV_SYNC_LEFTOVERS_URL, {
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
  isUrgent: boolean;
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
    if (!res.ok) return { category: "Outros", parsedName: itemName, quantityNote: null, isUrgent: false };
    const data = await res.json();
    return {
      category: data?.category ?? "Other",
      parsedName: data?.parsedName || itemName,
      quantityNote: data?.quantityNote ?? null,
      isUrgent: Boolean(data?.isUrgent),
    };
  } catch {
    return { category: "Outros", parsedName: itemName, quantityNote: null, isUrgent: false };
  }
}

// ── Leftover helpers ────────────────────────────────────────────────────────

interface LeftoverClassifyResult {
  name: string;
  type: string;
  doses: number | null;
  expiryDays: number | null;
}

async function classifyLeftover(input: string): Promise<LeftoverClassifyResult> {
  try {
    const res = await fetch(CLASSIFY_LEFTOVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { name: input, type: "meal", doses: null, expiryDays: null };
    const data = await res.json();
    return {
      name: data?.name || input,
      type: data?.type || "meal",
      doses: data?.doses ?? null,
      expiryDays: data?.expiryDays ?? null,
    };
  } catch {
    return { name: input, type: "meal", doses: null, expiryDays: null };
  }
}

async function findLeftoverByName(
  familyId: string,
  name: string,
): Promise<{
  id: string;
  total_doses: number;
  doses_eaten: number;
  doses_thrown_out: number;
} | null> {
  const { data, error } = await supabase
    .from("leftovers")
    .select("id, total_doses, doses_eaten, doses_thrown_out")
    .eq("family_id", familyId)
    .eq("status", "active")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── Intent handlers ─────────────────────────────────────────────────────────

async function handleAddItem(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();

  // Parse + translate to Portuguese + classify in one LLM call
  const cats = await getCategoryNames(familyId);
  const catNames = cats.map((c) => c.name);
  const { parsedName, quantityNote, category, isUrgent } = await classifyItem(rawInput, catNames);

  // Dedup check using Portuguese parsed name
  const existing = await findByName(familyId, parsedName);

  if (existing && !existing.is_ticked) {
    return alexaResponse(`${rawInput} is already on the list.`);
  }

  if (existing && existing.is_ticked) {
    const updates: Record<string, unknown> = {
      is_ticked: false,
      checked_at: null,
      is_urgent: isUrgent,
      updated_at: new Date().toISOString(),
    };
    if (quantityNote) updates.quantity_note = quantityNote;
    await supabase
      .from("shopping_items")
      .update(updates)
      .eq("id", existing.id);
    mirrorToDev({ action: "untick", name: parsedName, quantityNote, isUrgent });
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
    is_urgent: isUrgent,
    is_ticked: false,
    created_at: ts,
    updated_at: ts,
  });

  mirrorToDev({ action: "add", name: parsedName, categoryName: category, quantityNote, isUrgent });
  const urgentPrefix = isUrgent ? "urgent " : "";
  return alexaResponse(`Added ${urgentPrefix}${rawInput} to the list.`);
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

  const tickTs = new Date().toISOString();
  await supabase
    .from("shopping_items")
    .update({ is_ticked: true, checked_at: tickTs, updated_at: tickTs })
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

// ── Leftover intent handlers ────────────────────────────────────────────────

async function handleAddLeftover(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();
  const { name, type, doses, expiryDays } = await classifyLeftover(rawInput);

  const totalDoses = doses ?? 2;
  const days = expiryDays ?? 4;
  const ts = new Date().toISOString();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);

  await supabase.from("leftovers").insert({
    family_id: familyId,
    name,
    type: type ?? "meal",
    total_doses: totalDoses,
    doses_eaten: 0,
    doses_thrown_out: 0,
    expiry_days: days,
    date_added: ts,
    expiry_date: expiry.toISOString(),
    status: "active",
    created_at: ts,
    updated_at: ts,
  });

  mirrorLeftoverToDev({ action: "add", name, type, totalDoses, expiryDays: days });
  return alexaResponse(
    `Added ${rawInput} to leftovers. ${totalDoses} doses, ${days} days.`,
  );
}

async function handleEatLeftover(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();
  const { name, doses } = await classifyLeftover(rawInput);

  const item = await findLeftoverByName(familyId, name);
  if (!item) {
    return alexaResponse(`I couldn't find ${rawInput} in your leftovers.`);
  }

  const remaining = item.total_doses - item.doses_eaten - item.doses_thrown_out;
  const ts = new Date().toISOString();

  if (doses === null) {
    // Eat all remaining
    await supabase
      .from("leftovers")
      .update({
        doses_eaten: item.total_doses - item.doses_thrown_out,
        status: "closed",
        updated_at: ts,
      })
      .eq("id", item.id);

    mirrorLeftoverToDev({ action: "eat_all", name });
    return alexaResponse(`Marked all ${rawInput} as eaten.`);
  }

  // Eat N doses (capped at remaining)
  const toEat = Math.min(doses, remaining);
  const newEaten = item.doses_eaten + toEat;
  const newStatus =
    newEaten + item.doses_thrown_out >= item.total_doses ? "closed" : "active";

  await supabase
    .from("leftovers")
    .update({ doses_eaten: newEaten, status: newStatus, updated_at: ts })
    .eq("id", item.id);

  mirrorLeftoverToDev({ action: "eat", name, doses: toEat });
  return alexaResponse(`Marked ${toEat} doses of ${rawInput} as eaten.`);
}

async function handleThrowOutLeftover(rawInput: string): Promise<Response> {
  const familyId = await getFamilyId();
  const { name } = await classifyLeftover(rawInput);

  const item = await findLeftoverByName(familyId, name);
  if (!item) {
    return alexaResponse(`I couldn't find ${rawInput} in your leftovers.`);
  }

  const ts = new Date().toISOString();
  await supabase
    .from("leftovers")
    .update({
      doses_thrown_out: item.total_doses - item.doses_eaten,
      status: "closed",
      updated_at: ts,
    })
    .eq("id", item.id);

  mirrorLeftoverToDev({ action: "throw_out", name });
  return alexaResponse(`Threw out ${rawInput}.`);
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
        "Hi! You can manage your shopping list or leftovers.",
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

      case "AddLeftover": {
        const input = slots.input?.value;
        if (!input)
          return alexaResponse("I didn't catch the item. Try again.");
        return await handleAddLeftover(input);
      }

      case "EatLeftover": {
        const input = slots.input?.value;
        if (!input)
          return alexaResponse("I didn't catch the item. Try again.");
        return await handleEatLeftover(input);
      }

      case "ThrowOutLeftover": {
        const input = slots.input?.value;
        if (!input)
          return alexaResponse("I didn't catch the item. Try again.");
        return await handleThrowOutLeftover(input);
      }

      case "AMAZON.HelpIntent":
        return alexaResponse(
          "For shopping, say add, remove, or check an item. For leftovers, say add to leftovers, I ate, or throw out.",
          false,
        );

      case "AMAZON.CancelIntent":
      case "AMAZON.StopIntent":
        return alexaResponse("Goodbye!");

      case "AMAZON.FallbackIntent":
        return alexaResponse(
          "I didn't catch that. You can manage your shopping list or leftovers.",
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

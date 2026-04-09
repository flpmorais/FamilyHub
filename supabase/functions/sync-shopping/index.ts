import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALEXA_API_KEY = Deno.env.get("ALEXA_API_KEY") ?? "";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

let cachedFamilyId: string | null = null;

async function getFamilyId(): Promise<string> {
  if (cachedFamilyId) return cachedFamilyId;
  const { data } = await supabase.from("families").select("id").limit(1).single();
  if (!data) throw new Error("Family not found");
  cachedFamilyId = data.id;
  return data.id;
}

async function findByName(familyId: string, name: string) {
  const { data } = await supabase
    .from("shopping_items")
    .select("id, is_ticked, category_id")
    .eq("family_id", familyId)
    .ilike("name", name)
    .maybeSingle();
  return data;
}

async function findCategoryByName(familyId: string, name: string) {
  const { data } = await supabase
    .from("shopping_categories")
    .select("id")
    .eq("family_id", familyId)
    .ilike("name", name)
    .maybeSingle();
  return data;
}

serve(async (req: Request) => {
  // Auth
  const apiKey =
    req.headers.get("x-api-key") ??
    req.headers.get("X-Api-Key") ??
    new URL(req.url).searchParams.get("api_key");
  if (!ALEXA_API_KEY || apiKey !== ALEXA_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { action, name, categoryName, quantityNote, isUrgent } = await req.json();
    if (!action || !name) {
      return new Response(JSON.stringify({ ok: false, error: "Missing action or name" }), { status: 400 });
    }

    const familyId = await getFamilyId();
    const ts = new Date().toISOString();
    const existing = await findByName(familyId, name);

    switch (action) {
      case "add": {
        if (existing && !existing.is_ticked) break; // Already on list
        if (existing && existing.is_ticked) {
          const updates: Record<string, unknown> = {
            is_ticked: false,
            checked_at: null,
            is_urgent: isUrgent ?? false,
            updated_at: ts,
          };
          if (quantityNote) updates.quantity_note = quantityNote;
          await supabase.from("shopping_items").update(updates).eq("id", existing.id);
          break;
        }
        // New item
        const cat = categoryName ? await findCategoryByName(familyId, categoryName) : null;
        const otherCat = !cat ? await findCategoryByName(familyId, "Outros") : null;
        const categoryId = cat?.id ?? otherCat?.id;
        await supabase.from("shopping_items").insert({
          family_id: familyId,
          name,
          category_id: categoryId,
          quantity_note: quantityNote ?? null,
          is_urgent: isUrgent ?? false,
          is_ticked: false,
          created_at: ts,
          updated_at: ts,
        });
        break;
      }
      case "untick": {
        if (existing) {
          const updates: Record<string, unknown> = {
            is_ticked: false,
            checked_at: null,
            updated_at: ts,
          };
          if (quantityNote) updates.quantity_note = quantityNote;
          if (isUrgent !== undefined) updates.is_urgent = isUrgent;
          await supabase.from("shopping_items").update(updates).eq("id", existing.id);
        }
        break;
      }
      case "tick": {
        if (existing) {
          await supabase
            .from("shopping_items")
            .update({ is_ticked: true, checked_at: ts, updated_at: ts })
            .eq("id", existing.id);
        }
        break;
      }
      case "setQuantity": {
        if (existing && quantityNote) {
          await supabase.from("shopping_items").update({ quantity_note: quantityNote, updated_at: ts }).eq("id", existing.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-shopping error:", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

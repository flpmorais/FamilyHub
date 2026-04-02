import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SYNC_KEY = Deno.env.get("SYNC_CATEGORIES_KEY") ?? "";
const OTHER_ENV_SYNC_URL = Deno.env.get("OTHER_ENV_SYNC_URL") ?? "";

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

async function mirrorToOtherEnv(payload: Record<string, unknown>) {
  if (!OTHER_ENV_SYNC_URL || !SYNC_KEY) return;
  try {
    await fetch(OTHER_ENV_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Key": SYNC_KEY,
      },
      body: JSON.stringify({ ...payload, mirror: false }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Best-effort — don't fail if other env is down
  }
}

serve(async (req: Request) => {
  // Auth — accept sync key (cross-env) or JWT (app calls)
  const syncKeyHeader = req.headers.get("x-sync-key");
  const isSyncKeyAuth = !!(SYNC_KEY && syncKeyHeader === SYNC_KEY);

  let isJwtAuth = false;
  if (!isSyncKeyAuth) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        isJwtAuth = !!user;
      } catch {
        // Invalid token
      }
    }
  }

  if (!isSyncKeyAuth && !isJwtAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, mirror } = body;
    const familyId = await getFamilyId();

    switch (action) {
      case "create": {
        const { name, sortOrder, active } = body;
        await supabase.from("shopping_categories").upsert(
          { family_id: familyId, name, sort_order: sortOrder ?? 0, active: active ?? true },
          { onConflict: "family_id,name" }
        );
        break;
      }

      case "edit": {
        const { oldName, name, active } = body;
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (active !== undefined) updates.active = active;
        await supabase
          .from("shopping_categories")
          .update(updates)
          .eq("family_id", familyId)
          .ilike("name", oldName);
        break;
      }

      case "delete": {
        const { name } = body;
        await supabase
          .from("shopping_categories")
          .delete()
          .eq("family_id", familyId)
          .ilike("name", name);
        break;
      }

      case "reorder": {
        const { items } = body as { items: { name: string; sortOrder: number }[] };
        for (const item of items) {
          await supabase
            .from("shopping_categories")
            .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
            .eq("family_id", familyId)
            .ilike("name", item.name);
        }
        break;
      }

      case "setActive": {
        const { name, active } = body;
        await supabase
          .from("shopping_categories")
          .update({ active, updated_at: new Date().toISOString() })
          .eq("family_id", familyId)
          .ilike("name", name);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
    }

    // Mirror to other environment if requested
    if (mirror) {
      mirrorToOtherEnv(body);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-categories error:", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

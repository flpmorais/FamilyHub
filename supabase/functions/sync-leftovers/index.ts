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
  const { data, error } = await supabase.from("families").select("id").limit(1).maybeSingle();
  if (error) throw new Error(`Family query error: ${error.message}`);
  if (!data) throw new Error("No family found in database");
  cachedFamilyId = data.id;
  return data.id;
}

async function findActiveByName(
  familyId: string,
  name: string,
): Promise<{ id: string; total_doses: number; doses_eaten: number; doses_thrown_out: number } | null> {
  const { data } = await supabase
    .from("leftovers")
    .select("id, total_doses, doses_eaten, doses_thrown_out")
    .eq("family_id", familyId)
    .eq("status", "active")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  return data;
}

serve(async (req: Request) => {
  const apiKey =
    req.headers.get("x-api-key") ??
    req.headers.get("X-Api-Key") ??
    new URL(req.url).searchParams.get("api_key");
  if (!ALEXA_API_KEY || apiKey !== ALEXA_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { action, name, type, totalDoses, expiryDays, doses } = await req.json();
    if (!action || !name) {
      return new Response(JSON.stringify({ ok: false, error: "Missing action or name" }), { status: 400 });
    }

    const familyId = await getFamilyId();
    const ts = new Date().toISOString();

    switch (action) {
      case "add": {
        const days = expiryDays ?? 4;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        await supabase.from("leftovers").insert({
          family_id: familyId,
          name,
          type: type ?? "meal",
          total_doses: totalDoses ?? 2,
          doses_eaten: 0,
          doses_thrown_out: 0,
          expiry_days: days,
          date_added: ts,
          expiry_date: expiry.toISOString(),
          status: "active",
          created_at: ts,
          updated_at: ts,
        });
        break;
      }
      case "eat": {
        const item = await findActiveByName(familyId, name);
        if (item) {
          const remaining = item.total_doses - item.doses_eaten - item.doses_thrown_out;
          const toEat = Math.min(doses ?? remaining, remaining);
          const newEaten = item.doses_eaten + toEat;
          const newStatus =
            newEaten + item.doses_thrown_out >= item.total_doses ? "closed" : "active";
          await supabase
            .from("leftovers")
            .update({ doses_eaten: newEaten, status: newStatus, updated_at: ts })
            .eq("id", item.id);
        }
        break;
      }
      case "eat_all": {
        const item = await findActiveByName(familyId, name);
        if (item) {
          await supabase
            .from("leftovers")
            .update({
              doses_eaten: item.total_doses - item.doses_thrown_out,
              status: "closed",
              updated_at: ts,
            })
            .eq("id", item.id);
        }
        break;
      }
      case "throw_out": {
        const item = await findActiveByName(familyId, name);
        if (item) {
          await supabase
            .from("leftovers")
            .update({
              doses_thrown_out: item.total_doses - item.doses_eaten,
              status: "closed",
              updated_at: ts,
            })
            .eq("id", item.id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-leftovers error:", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

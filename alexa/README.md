# Alexa Skill — Diva (FamilyHub Shopping List)

## Architecture

```
                                     ┌──────────────────────┐
┌─────────────┐     HTTPS POST      │  alexa-shopping       │
│  Amazon Echo │ ──────────────────► │  (PROD Edge Function) │──► PROD DB
│  (English)   │ ◄────────────────── │                      │
└─────────────┘   English response  │  • Auth: api_key      │
                                     │  • English responses   │
                                     │  • Calls classify-item │
                                     └────────┬─────────────┘
                                              │ fire-and-forget
                                     ┌────────▼─────────────┐
                                     │  sync-shopping        │
                                     │  (DEV Edge Function)  │──► DEV DB
                                     │                      │
                                     │  • Receives parsed PT │
                                     │  • Mirrors mutations   │
                                     └──────────────────────┘

  classify-item (on PROD):
    Input: "3 packs of milk" (English)
    → Gemini/Haiku LLM
    → Output: { name: "leite", quantity: "3 pacotes", category: "Dairy" }
```

### Language Flow

1. **You speak English** to Alexa: "add 3 packs of milk"
2. **Alexa responds in English**: "Added 3 packs of milk to the list"
3. **LLM translates + classifies**: name → "leite", quantity → "3 pacotes", category → "Dairy"
4. **Prod DB stores Portuguese**: name="leite", quantity_note="3 pacotes"
5. **Dev DB mirrors**: same item created automatically via fire-and-forget
6. **Both apps display Portuguese**: "leite" under Dairy with note "3 pacotes"

### Dual Environment

The Alexa endpoint always points to **prod**. After each successful mutation (add, remove, set quantity), prod fires a POST to the `sync-shopping` Edge Function on dev. This means:

- **Prod app** always has the latest data (primary)
- **Dev app** also gets the data (mirror, best-effort)
- If dev is down, prod works normally — nothing breaks
- Dev doesn't need its own Alexa endpoint

### Edge Functions

| Function | Deployed to | Purpose |
|---|---|---|
| `alexa-shopping` | Prod + Dev | Handles Alexa intents, writes to local DB, mirrors to dev (prod only) |
| `classify-item` | Prod + Dev | Translates English → Portuguese, parses quantity, classifies category |
| `sync-shopping` | Dev only | Receives mirrored mutations from prod |

### LLM Provider

Configurable via `LLM_PROVIDER` secret:
- `haiku` (default) — Claude Haiku 4.5 via Anthropic API. Reliable, ~$0.01/month at family scale.
- `gemini` — Gemini Flash via Google AI. Free tier but aggressive rate limiting.

To switch: `npx supabase secrets set LLM_PROVIDER=gemini` (or `haiku`)

---

## Voice Commands

| Command | Example | Alexa Response |
|---|---|---|
| **Add item** | "Alexa, ask Diva to add milk" | "Added milk to the list" |
| **Add with quantity** | "Alexa, tell Diva to add 3 packs of milk" | "Added 3 packs of milk to the list" |
| **Remove item** | "Alexa, tell Diva to remove butter" | "Removed butter from the list" |
| **Check item** | "Alexa, ask Diva if I have bread" | "Yes, bread is on the list" |
| **Last item** | "Alexa, ask Diva what was the last item" | "The last item was leite" |
| **Set quantity** | "Alexa, tell Diva set quantity of milk to 6 packs" | "Updated the quantity" |
| **Help** | "Alexa, ask Diva for help" | Lists available commands |
| **Open** | "Alexa, open Diva" | Welcome message |

---

## Setup Guide

### Step 1: Deploy Edge Functions

```bash
# Dev — all 3 functions
npx supabase link --project-ref vblyzgjvseodveypmxdz
npx supabase functions deploy classify-item --no-verify-jwt
npx supabase functions deploy alexa-shopping --no-verify-jwt
npx supabase functions deploy sync-shopping --no-verify-jwt

# Prod — 2 functions (no sync-shopping)
npx supabase link --project-ref xedvtgdcnnsgpqixrzib
npx supabase functions deploy classify-item --no-verify-jwt
npx supabase functions deploy alexa-shopping --no-verify-jwt
```

### Step 2: Set Secrets

```bash
# Dev
npx supabase link --project-ref vblyzgjvseodveypmxdz
npx supabase secrets set ANTHROPIC_API_KEY=<key>
npx supabase secrets set ALEXA_API_KEY=<key>
npx supabase secrets set LLM_PROVIDER=haiku

# Prod (same + DEV_SYNC_URL for mirroring)
npx supabase link --project-ref xedvtgdcnnsgpqixrzib
npx supabase secrets set ANTHROPIC_API_KEY=<key>
npx supabase secrets set ALEXA_API_KEY=<key>
npx supabase secrets set LLM_PROVIDER=haiku
npx supabase secrets set DEV_SYNC_URL=https://vblyzgjvseodveypmxdz.supabase.co/functions/v1/sync-shopping
```

### Step 3: Create Alexa Skill

1. Go to https://developer.amazon.com/alexa/console/ask
2. Create Skill → **Diva**, **English (US)**, Custom, Provision your own, Start from scratch

### Step 4: Interaction Model

1. Sidebar → Interaction Model → JSON Editor
2. Paste contents of `interaction-model.json`
3. Save → Build Skill

### Step 5: Endpoint

1. Sidebar → Endpoint → HTTPS
2. Default Region URL (always prod):
   ```
   https://xedvtgdcnnsgpqixrzib.supabase.co/functions/v1/alexa-shopping?api_key=<ALEXA_API_KEY>
   ```
3. SSL: "My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"
4. Save Endpoints

### Step 6: Test

1. Test tab → "Development"
2. Type: "ask diva to add milk"
3. On your Echo: **"Alexa, ask Diva to add milk"**

---

## Secrets Reference

| Secret | Dev | Prod | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Yes | Claude Haiku for classification |
| `GEMINI_API_KEY` | Yes | Yes | Gemini Flash (backup provider) |
| `ALEXA_API_KEY` | Yes | Yes | Authenticates Alexa + sync requests |
| `LLM_PROVIDER` | Yes | Yes | `haiku` or `gemini` |
| `DEV_SYNC_URL` | No | Yes | URL to dev sync-shopping endpoint |

## Troubleshooting

**"There was a problem with the requested skill's response"** → Check endpoint URL and API key. Check Edge Function logs in Supabase Dashboard.

**Items stored in English instead of Portuguese** → LLM failed (quota/key issue). Check `ANTHROPIC_API_KEY` / `LLM_PROVIDER` secrets. Fallback stores raw English input.

**Items appear in prod but not dev** → Check `DEV_SYNC_URL` secret on prod. Check `sync-shopping` is deployed on dev. Mirror is best-effort — check dev function logs.

**401 Unauthorized** → API key mismatch. Ensure `ALEXA_API_KEY` is the same on both environments and matches the endpoint URL query parameter.

## Future Enhancements

- **Alexa request signature verification** — cryptographically verify requests came from Amazon. See `signature-verification-backlog.md`.

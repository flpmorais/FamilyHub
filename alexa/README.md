# Alexa Skill — Diva (FamilyHub)

## Architecture

```
                                     ┌──────────────────────────────┐
┌─────────────┐     HTTPS POST      │  alexa-shopping                │
│  Amazon Echo │ ──────────────────► │  (PROD Edge Function)          │──► PROD DB
│  (English)   │ ◄────────────────── │                                │
└─────────────┘   English response  │  • Auth: api_key                │
                                     │  • English responses             │
                                     │  • Shopping: calls classify-item │
                                     │  • Leftovers: calls classify-    │
                                     │    leftover                      │
                                     └────────┬──────────┬─────────────┘
                                              │          │
                                   shopping   │          │  leftovers
                                              │          │
                                     ┌────────▼────┐ ┌───▼──────────────┐
                                     │sync-shopping │ │ sync-leftovers    │
                                     │(DEV)        │ │ (DEV)             │
                                     │  ──► DEV DB │ │  ──► DEV DB      │
                                     └─────────────┘ └──────────────────┘
```

### Nodes

| Node | Environment | Role |
|---|---|---|
| **Amazon Echo (Alexa)** | Cloud | Captures English voice, sends JSON intent to prod endpoint. Single `AMAZON.SearchQuery` slot per intent. |
| **alexa-shopping** | Prod + Dev | Main handler. Routes shopping intents (Add, Remove, Check, LastItem, SetQuantity) and leftover intents (AddLeftover, EatLeftover, ThrowOutLeftover). Calls classify-item or classify-leftover for translation, writes to prod DB, mirrors to dev. |
| **classify-item** | Prod + Dev | LLM-powered function for shopping items. Receives raw English input + category list. Returns Portuguese name, quantity, category, and urgency flag. |
| **classify-leftover** | Prod + Dev | LLM-powered function for leftovers. Receives raw English input. Returns Portuguese name, inferred type (meal/main/soup/side), dose count, and validity in days. |
| **sync-shopping** | Dev only | Receives mirrored shopping mutations from prod. Applies add/untick/tick/setQuantity to dev DB. **Never mirrors back.** |
| **sync-leftovers** | Dev only | Receives mirrored leftover mutations from prod. Applies add/eat/eat_all/throw_out to dev DB. **Never mirrors back.** |
| **LLM (Claude Haiku / Gemini)** | External API | Called by classify-item and classify-leftover for translation and parsing. |
| **Prod DB** | Prod Supabase | Primary data store. Alexa always writes here first. |
| **Dev DB** | Dev Supabase | Mirror. Receives data from sync functions. App UI on dev reads/writes here directly. |

### Data Flow

```
User speaks English to Alexa
  ↓
Alexa sends intent JSON to alexa-shopping (PROD)
  ↓
alexa-shopping calls classify-item or classify-leftover (PROD)
  ↓
LLM returns parsed Portuguese data
  ↓
alexa-shopping writes to PROD DB
  ↓
alexa-shopping fires mirror to DEV (sync-shopping or sync-leftovers)
  ↓
sync function writes to DEV DB
  ↓
Alexa responds in English
```

### Language Flow

1. **You speak English** to Alexa: "add rice to leftovers"
2. **Alexa responds in English**: "Added rice to leftovers. 2 doses, 4 days."
3. **LLM translates + classifies**: name → "arroz", type → "side"
4. **Prod DB stores Portuguese**: name="arroz", type="side"
5. **Dev DB mirrors**: same item created automatically via fire-and-forget
6. **Both apps display Portuguese**: "arroz" with type "Acompanhamento"

### Dual Environment

The Alexa endpoint always points to **prod**. After each successful mutation, prod fires a POST to the corresponding sync Edge Function on dev. This means:

- **Prod app** always has the latest data (primary)
- **Dev app** also gets the data (mirror, best-effort)
- If dev is down, prod works normally — nothing breaks
- Dev doesn't need its own Alexa endpoint

### Loop Prevention

1. **Alexa → Prod** — alexa-shopping writes to prod DB and fires mirror
2. **Prod → Dev** — sync function receives the payload and writes to dev DB
3. **Dev never mirrors back** — sync functions have no outbound calls

---

## Shopping List

### Voice Commands

| Command | Example | Alexa Response |
|---|---|---|
| **Add item** | "Alexa, ask Diva to add milk" | "Added milk to the list" |
| **Add with quantity** | "Alexa, tell Diva to add 3 packs of milk" | "Added 3 packs of milk to the list" |
| **Add urgent item** | "Alexa, ask Diva to add urgent milk" | "Added urgent milk to the list" |
| **Remove item** | "Alexa, tell Diva to remove butter" | "Removed butter from the list" |
| **Check item** | "Alexa, ask Diva if I have bread" | "Yes, bread is on the list" |
| **Last item** | "Alexa, ask Diva what was the last item" | "The last item was leite" |
| **Set quantity** | "Alexa, tell Diva set quantity of milk to 6 packs" | "Updated the quantity" |

### Urgent Items

Say "urgent" anywhere in the item name. The LLM detects urgency markers and strips them from the item name:

- "add urgent milk" → item "leite" with `is_urgent=true`
- "add 3 packs of urgent milk" → item "leite", quantity "3 pacotes", `is_urgent=true`

Recognized urgency markers: "urgent", "urgently", "asap", "right now"

---

## Leftovers

### Voice Commands

| Command | Example | Alexa Response |
|---|---|---|
| **Add leftover** | "Alexa, ask Diva to add rice to leftovers" | "Added rice to leftovers. 2 doses, 4 days." |
| **Add with doses** | "Alexa, tell Diva to add 4 doses of soup to leftovers" | "Added 4 doses of soup to leftovers. 4 doses, 4 days." |
| **Add with validity** | "Alexa, tell Diva to add lasagna for 3 days to leftovers" | "Added lasagna for 3 days to leftovers. 2 doses, 3 days." |
| **Add with both** | "Alexa, tell Diva to add 6 doses of stew for a week to leftovers" | "Added 6 doses of stew for a week to leftovers. 6 doses, 7 days." |
| **Eat all** | "Alexa, tell Diva I ate the rice" | "Marked all the rice as eaten." |
| **Eat N doses** | "Alexa, tell Diva I ate 3 doses of rice" | "Marked 3 doses of rice as eaten." |
| **Throw out** | "Alexa, tell Diva to throw out the soup" | "Threw out the soup." |

### Defaults

- **Doses**: 2 (if not specified in voice command)
- **Validity**: 4 days (if not specified in voice command)
- **Type**: Inferred by LLM from the food item:
  - `soup` — soups (vegetable soup, chicken soup)
  - `main` — main proteins (steaks, chicken, fish)
  - `side` — side dishes (rice, pasta, potatoes)
  - `meal` — complete meals or when type can't be determined (lasagna, stew)

### How It Works

1. You say "add 4 doses of chicken soup for 3 days to leftovers"
2. LLM parses: name → "sopa de frango", type → "soup", doses → 4, validity → 3 days
3. Leftover created in prod DB with 4 doses, expiry in 3 days
4. Mirrored to dev DB via sync-leftovers
5. Alexa confirms: "Added 4 doses of chicken soup for 3 days to leftovers. 4 doses, 3 days."

For eating, "I ate the rice" marks ALL remaining doses as eaten and closes the item. "I ate 3 doses of rice" marks exactly 3 doses (capped at remaining) and auto-closes if none are left.

Throwing out always discards ALL remaining doses: "throw out the soup".

---

## Edge Functions

| Function | Deployed to | Purpose |
|---|---|---|
| `alexa-shopping` | Prod + Dev | Handles all Alexa intents (shopping + leftovers), writes to local DB, mirrors to dev |
| `classify-item` | Prod + Dev | Translates English → Portuguese for shopping items, parses quantity, classifies category, detects urgency |
| `classify-leftover` | Prod + Dev | Translates English → Portuguese for leftovers, infers type, extracts doses and validity |
| `sync-shopping` | Dev only | Receives mirrored shopping mutations from prod |
| `sync-leftovers` | Dev only | Receives mirrored leftover mutations from prod |
| `sync-categories` | Prod + Dev | Bidirectional category sync between environments |

### LLM Provider

Configurable via `LLM_PROVIDER` secret:
- `haiku` (default) — Claude Haiku 4.5 via Anthropic API. Reliable, ~$0.01/month at family scale.
- `gemini` — Gemini Flash via Google AI. Free tier but aggressive rate limiting.

To switch: `npx supabase secrets set LLM_PROVIDER=gemini` (or `haiku`)

---

## Setup Guide

### Step 1: Deploy Edge Functions

```bash
# Dev — all functions
npx supabase link --project-ref vblyzgjvseodveypmxdz
npx supabase functions deploy classify-item --no-verify-jwt
npx supabase functions deploy classify-leftover --no-verify-jwt
npx supabase functions deploy alexa-shopping --no-verify-jwt
npx supabase functions deploy sync-shopping --no-verify-jwt
npx supabase functions deploy sync-leftovers --no-verify-jwt

# Prod — no sync functions (they only run on dev)
npx supabase link --project-ref xedvtgdcnnsgpqixrzib
npx supabase functions deploy classify-item --no-verify-jwt
npx supabase functions deploy classify-leftover --no-verify-jwt
npx supabase functions deploy alexa-shopping --no-verify-jwt
```

### Step 2: Set Secrets

```bash
# Dev
npx supabase link --project-ref vblyzgjvseodveypmxdz
npx supabase secrets set ANTHROPIC_API_KEY=<key>
npx supabase secrets set ALEXA_API_KEY=<key>
npx supabase secrets set LLM_PROVIDER=haiku

# Prod (same + sync URLs for mirroring)
npx supabase link --project-ref xedvtgdcnnsgpqixrzib
npx supabase secrets set ANTHROPIC_API_KEY=<key>
npx supabase secrets set ALEXA_API_KEY=<key>
npx supabase secrets set LLM_PROVIDER=haiku
npx supabase secrets set DEV_SYNC_URL=https://vblyzgjvseodveypmxdz.supabase.co/functions/v1/sync-shopping
npx supabase secrets set DEV_SYNC_LEFTOVERS_URL=https://vblyzgjvseodveypmxdz.supabase.co/functions/v1/sync-leftovers
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
2. Type: "ask diva to add milk" (shopping)
3. Type: "ask diva to add rice to leftovers" (leftovers)
4. Type: "tell diva I ate the rice" (eat)
5. On your Echo: **"Alexa, ask Diva to add rice to leftovers"**

---

## Secrets Reference

| Secret | Dev | Prod | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Yes | Claude Haiku for classification |
| `GEMINI_API_KEY` | Yes | Yes | Gemini Flash (backup provider) |
| `ALEXA_API_KEY` | Yes | Yes | Authenticates Alexa + sync requests |
| `LLM_PROVIDER` | Yes | Yes | `haiku` or `gemini` |
| `DEV_SYNC_URL` | No | Yes | URL to dev sync-shopping endpoint |
| `DEV_SYNC_LEFTOVERS_URL` | No | Yes | URL to dev sync-leftovers endpoint |

## Troubleshooting

**"There was a problem with the requested skill's response"** → Check endpoint URL and API key. Check Edge Function logs in Supabase Dashboard.

**Items stored in English instead of Portuguese** → LLM failed (quota/key issue). Check `ANTHROPIC_API_KEY` / `LLM_PROVIDER` secrets. Fallback stores raw English input.

**Items appear in prod but not dev** → Check `DEV_SYNC_URL` / `DEV_SYNC_LEFTOVERS_URL` secrets on prod. Check sync functions are deployed on dev. Mirror is best-effort — check dev function logs.

**401 Unauthorized** → API key mismatch. Ensure `ALEXA_API_KEY` is the same on both environments and matches the endpoint URL query parameter.

**Urgent not detected** → The LLM looks for "urgent", "urgently", "asap", "right now" in the input. If none found, defaults to non-urgent. Check classify-item logs.

**Leftover type wrong** → The LLM infers type from the food name. If it can't determine, defaults to "meal". Check classify-leftover logs.

**"I couldn't find X in your leftovers"** → The item name must match an active leftover. The LLM translates to Portuguese and matches via case-insensitive search. Check if the leftover exists and is active.

## Future Enhancements

- **Alexa request signature verification** — cryptographically verify requests came from Amazon. See `signature-verification-backlog.md`.

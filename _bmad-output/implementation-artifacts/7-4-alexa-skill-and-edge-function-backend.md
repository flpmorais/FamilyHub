# Story 7.4: Alexa Skill & Edge Function Backend

Status: review

## Story

As an Admin,
I want to add, remove, and query shopping items hands-free via Alexa while cooking,
So that I never have to stop what I'm doing to update the shopping list.

## Acceptance Criteria

1. **Given** a Supabase Edge Function `alexa-shopping` exists, **When** it receives a request, **Then** it validates the `ALEXA_API_KEY` header. **And** unauthenticated requests are rejected with a 401 response (FR79, NFR24).

2. **Given** the user says "Alexa, diz à Diva para adicionar azeite", **When** the AddItem intent fires, **Then** the Edge Function checks if "azeite" exists (case-insensitive). **And** if it exists and is ticked: unticks it, responds "Azeite voltou à lista" (FR69). **And** if it exists and is unticked: responds "Azeite já está na lista" (FR80). **And** if it doesn't exist: creates the item, calls `classify-item` Edge Function for AI categorization, responds "Adicionei azeite à lista" (FR74).

3. **Given** the user says "Alexa, diz à Diva para remover azeite", **When** the RemoveItem intent fires, **Then** the Edge Function ticks the item, responds "Removi azeite da lista" (FR75). **And** if the item doesn't exist, responds "Azeite não está na lista".

4. **Given** the user says "Alexa, diz à Diva se tenho leite na lista", **When** the CheckItem intent fires, **Then** the Edge Function queries for "leite" (case-insensitive). **And** responds "Sim, leite está na lista" or "Não, leite não está na lista" (FR76).

5. **Given** the user says "Alexa, diz à Diva qual foi o último item que adicionei", **When** the LastItem intent fires, **Then** the Edge Function queries for the most recently created unticked item. **And** responds "O último item foi {name}" (FR77). **And** if no items exist, responds "A lista está vazia".

6. **Given** the user says "Alexa, diz à Diva para definir a quantidade de leite para 3 pacotes", **When** the SetQuantity intent fires, **Then** the Edge Function updates the `quantity_note` on "leite" to "3 pacotes" (FR78). **And** responds "Quantidade de leite definida para 3 pacotes". **And** if item not found, responds "Leite não está na lista".

7. **Given** the Edge Function receives any request, **When** it processes the request, **Then** it responds within 3 seconds (NFR22).

8. **Given** the Alexa Skill interaction model is defined, **Then** it includes intents: AddItem, RemoveItem, CheckItem, LastItem, SetQuantity. **And** each intent has Portuguese sample utterances. **And** the invocation name is "diva".

9. **Given** the Alexa Skill is deployed as a personal skill, **Then** it does not require public certification. **And** it is accessible only to the developer's Amazon account.

## Tasks / Subtasks

- [x] Task 1: Edge Function `alexa-shopping` (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] Create `supabase/functions/alexa-shopping/index.ts` (Deno runtime)
  - [x] Validate `X-Api-Key` header against `ALEXA_API_KEY` secret — reject 401 if missing or wrong
  - [x] Parse Alexa request body: extract intent name and slot values
  - [x] Use Supabase service role client (`createClient` with `SUPABASE_SERVICE_ROLE_KEY`)
  - [x] Implement all 5 intent handlers:
    - [x] `AddItem`: findByName → untick if ticked, duplicate msg if unticked, create + classify if new
    - [x] `RemoveItem`: findByName → tick if found, not-found msg otherwise
    - [x] `CheckItem`: findByName → yes/no response based on unticked status
    - [x] `LastItem`: query most recent unticked by created_at DESC
    - [x] `SetQuantity`: findByName → update quantity_note
  - [x] Alexa-formatted JSON responses (PlainText outputSpeech)
  - [x] All responses in Portuguese
  - [x] LaunchRequest: welcome message (shouldEndSession: false)
  - [x] SessionEndedRequest: empty response
  - [x] Built-in intents: Help, Stop, Cancel, Fallback
  - [x] Family ID cached after first lookup for performance
  - [x] classify-item called via internal fetch with service role bearer token
- [x] Task 2: Edge Function secrets (AC: #1)
  - [x] Generated random ALEXA_API_KEY (token_urlsafe 32 bytes)
  - [x] Set on dev and prod
- [x] Task 3: Deploy Edge Function (AC: #7)
  - [x] Deployed `alexa-shopping` to dev (`vblyzgjvseodveypmxdz`)
  - [x] Deployed `alexa-shopping` to prod (`xedvtgdcnnsgpqixrzib`)
- [x] Task 4: Alexa Skill interaction model (AC: #8, #9)
  - [x] Created `alexa/skill-manifest.json` — invocation name "diva", locale "pt-PT", category SHOPPING_AND_MARKETING
  - [x] Created `alexa/interaction-model.json` — 5 custom intents + 4 Amazon built-in intents
  - [x] Rich sample utterances per intent (8-11 variations each)
  - [x] Slot type: AMAZON.SearchQuery for flexible item name matching
- [x] Task 5: Documentation
  - [x] Created `alexa/README.md` — setup instructions, usage examples, auth notes, personal deployment guide

## Dev Notes

### Architecture

- **Single Edge Function** (`alexa-shopping`) handles all intents. It has direct DB access via Supabase service role key.
- **AI categorization:** For AddItem (new items), the Edge Function calls the existing `classify-item` Edge Function internally via `fetch` to the same Supabase project URL. This reuses Story 7.3's categorization logic.
- **Authentication:** Dedicated `ALEXA_API_KEY` header — not the Supabase service role key. The Alexa Skill sends this header; the Edge Function validates it. Service role key stays server-side only.
- **No client-side code in this story.** The Alexa Skill talks directly to the Edge Function. The React Native app is not involved.

### Alexa Request/Response Format

**Alexa sends:**
```json
{
  "version": "1.0",
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "AddItem",
      "slots": {
        "item": { "value": "azeite" }
      }
    }
  }
}
```

**Edge Function returns:**
```json
{
  "version": "1.0",
  "response": {
    "outputSpeech": {
      "type": "PlainText",
      "text": "Adicionei azeite à lista"
    },
    "shouldEndSession": true
  }
}
```

### Database Access Pattern in Edge Function

The Edge Function needs to query `shopping_items` and `shopping_categories` directly. Since it runs server-side with the service role key, it bypasses RLS. It needs to scope all queries to the family.

**Family resolution:** Since this is a single-family app, the Edge Function queries `families` for the single family ID on startup (or caches it). No user authentication needed — the `ALEXA_API_KEY` is the household-level auth.

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
```

### Classify-Item Integration

For new items, call the `classify-item` Edge Function:
```typescript
const classifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/classify-item`;
const { category } = await fetch(classifyUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
  },
  body: JSON.stringify({ itemName, categories: categoryNames }),
}).then(r => r.json());
```

### Portuguese Alexa Responses

| Intent | Success | Not Found | Duplicate |
|---|---|---|---|
| AddItem (new) | "Adicionei {item} à lista" | — | — |
| AddItem (untick) | "{item} voltou à lista" | — | "{item} já está na lista" |
| RemoveItem | "Removi {item} da lista" | "{item} não está na lista" | — |
| CheckItem | "Sim, {item} está na lista" | "Não, {item} não está na lista" | — |
| LastItem | "O último item foi {item}" | "A lista está vazia" | — |
| SetQuantity | "Quantidade de {item} definida para {qty}" | "{item} não está na lista" | — |
| LaunchRequest | "Olá! Podes adicionar, remover ou verificar itens na lista de compras." | — | — |
| Help | "Diz adicionar e o nome do item, remover e o nome, ou pergunta se tens algo na lista." | — | — |

### File Locations

```
supabase/functions/alexa-shopping/index.ts  ← NEW (Edge Function)
alexa/skill-manifest.json                   ← NEW (Alexa Developer Console config)
alexa/interaction-model.json                ← NEW (intents, slots, utterances)
alexa/README.md                             ← NEW (setup instructions)
```

### Existing Code to Reference

- `supabase/functions/classify-item/index.ts` — Edge Function pattern (Deno, CORS, error handling)
- `src/repositories/supabase/shopping.repository.ts` — `findByName` logic (case-insensitive), tick/untick, addItem patterns (SQL queries to replicate in Edge Function)

### Testing

- Test Edge Function locally: `npx supabase functions serve alexa-shopping` then curl with Alexa-formatted JSON
- Test each intent with mock Alexa request body
- Test auth: verify 401 on missing/wrong API key
- Test AI categorization integration: verify new items get classified
- Alexa Skill Simulator in the Alexa Developer Console for end-to-end testing

### References

- [Source: _bmad-output/planning-artifacts/prd.md#Alexa Skill Integration] — FR74–FR80
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements] — NFR22 (3s timeout), NFR24 (API key auth)
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.4] — acceptance criteria
- [Source: _bmad-output/implementation-artifacts/7-3-ai-categorization-service.md] — classify-item Edge Function

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Alexa HTTPS endpoints don't natively support custom headers. The README documents this limitation and suggests Lambda proxy or query parameter alternatives. The Edge Function reads `X-Api-Key` or `x-api-key` (case-insensitive header check).
- Family ID is cached after first DB lookup (`cachedFamilyId`) — avoids an extra query on every Alexa request.
- `classify-item` is called via internal fetch using `SUPABASE_SERVICE_ROLE_KEY` as Bearer token — no extra auth secret needed for inter-function calls.

### Completion Notes List

- Edge Function `alexa-shopping` handles all 5 custom intents + LaunchRequest + SessionEndedRequest + 4 Amazon built-in intents
- All Portuguese responses with natural phrasing
- AddItem integrates AI categorization via classify-item Edge Function
- ALEXA_API_KEY set on both dev and prod (same key)
- Interaction model has rich utterance coverage (8-11 samples per intent) using AMAZON.SearchQuery for flexible item matching
- Skill manifest ready for Alexa Developer Console — user needs to paste interaction-model.json and set endpoint URL manually
- **User action needed:** Configure the skill in the Alexa Developer Console (see alexa/README.md)

### Change Log

- 2026-03-31: Story 7.4 implemented — alexa-shopping Edge Function, interaction model, skill manifest, README. Deployed to dev and prod.

### File List

**New files:**
- supabase/functions/alexa-shopping/index.ts
- alexa/interaction-model.json
- alexa/skill-manifest.json
- alexa/README.md

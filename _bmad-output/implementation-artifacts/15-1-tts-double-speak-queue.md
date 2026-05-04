# Story 15.1: TTS Double-Speak Queue

Status: done
branch: feature/15-1-tts-double-speak-queue

## ARCHITECTURE MANDATES — NON-NEGOTIABLE

1. **Zero Supabase footprint** — No learning data in Supabase. All data lives in the harness container filesystem.
2. **`languageLearningStore` for all learning UI state** — `ttsQueue`, `isSpeaking` must be driven from the store. No local `useState` for TTS state.
3. **All timing constants from `language-learning-defaults.ts`** — `TTS_REPEAT_PAUSE_MS` (800ms) and `TTS_PHRASE_PAUSE_MS` (1200ms) already defined. No inline timing values.
4. **All user-facing error messages in Portuguese** — never show technical error codes or English messages.
5. **Serial, non-preemptive TTS queue** — no concurrent speech. One phrase at a time, FIFO pipeline.
6. **TTS locale is always `el-GR`** — Greek text only for V4.

## Story

As an admin,
I want the app to speak Greek phrases aloud twice so I can hear the correct pronunciation,
with pauses that help me process what I'm hearing.

## Acceptance Criteria

1. **AC-1: Double-speak timing** — Given a `speak` SSE event arrives with phrases `["Καλημέρα", "Με λένε"]`, When the phrases are enqueued into the TTS queue, Then the app speaks "Καλημέρα" via expo-speech (el-GR) And waits 0.8 seconds And speaks "Καλημέρα" again And waits 1.2 seconds And speaks "Με λένε" And waits 0.8 seconds And speaks "Με λένε" again (NFR30).

2. **AC-2: Serial queue — no concurrent speech** — Given a speak event arrives while TTS is already playing, When the phrases are enqueued, Then they wait in the queue until the current phrase finishes — no concurrent speech.

3. **AC-3: First sound latency (NFR28)** — Given a speak event arrives, When TTS playback begins, Then the first sound starts within 500ms of the SSE event arriving on the phone.

4. **AC-4: Visual indicator** — Given TTS is playing, When the user views the chat, Then a visual indicator shows which phrase is currently being spoken.

## Tasks / Subtasks

- [x] Install `expo-speech` dependency (AC: #1)
  - [x] `npx expo install expo-speech`
  - [x] Verify it works with Expo SDK 55 and `expo-dev-client`
- [x] Create `src/hooks/use-tts-queue.ts` — serial TTS double-speak hook (AC: #1, #2, #3)
  - [x] Subscribe to `languageLearningStore.ttsQueue`
  - [x] Process queue serially: for each phrase, speak twice with configured pauses
  - [x] Use `expo-speech` `speak()` with `{ language: "el-GR" }`
  - [x] Use `expo-speech` `stop()` on unmount to cancel in-progress speech
  - [x] Set `isSpeaking` in store when queue is processing
  - [x] Dequeue phrases from store as they complete
- [x] Add `currentTtsPhrase` to `languageLearningStore` (AC: #4)
  - [x] New field: `currentTtsPhrase: string | null`
  - [x] New action: `setCurrentTtsPhrase(phrase: string | null)`
  - [x] Set to the phrase currently being spoken, null when idle
  - [x] Clear on `clearSession()` and `reset()`
- [x] Integrate `useTtsQueue` into `session.tsx` (AC: #1, #4)
  - [x] Call `useTtsQueue()` in the session screen so the hook is active during chat
  - [x] The hook auto-processes phrases enqueued by `useSession().sendMessage()` (speak events already call `enqueueTts`)
- [x] Show TTS visual indicator in `chat-bubble.tsx` or session screen (AC: #4)
  - [x] Read `currentTtsPhrase` from store
  - [x] Highlight or indicate the currently spoken phrase
  - [x] Can be a simple text indicator above the chat or inline on the bubble
- [x] Verify TTS double-speak timing and queue behavior (AC: #1–#4)

## Dev Notes

### Existing Code

This story creates the TTS hook that consumes phrases enqueued by the existing speak event handler. Key files:

| File | What Exists | What This Story Changes |
|---|---|---|
| `src/hooks/use-session.ts` | `sendMessage` dispatches `speak` SSE events via `store.enqueueTts(event.phrases)` (line 35) | No changes — it already enqueues phrases into the store |
| `src/stores/language-learning.store.ts` | `ttsQueue: string[]`, `isSpeaking: boolean`, `enqueueTts`, `dequeueTts`, `setSpeaking`, `clearSession` (clears queue) | Add `currentTtsPhrase` field and `setCurrentTtsPhrase` action |
| `src/constants/language-learning-defaults.ts` | `TTS_REPEAT_PAUSE_MS = 800`, `TTS_PHRASE_PAUSE_MS = 1200` | No changes — timing constants already defined |
| `src/app/(app)/(language-learning)/session.tsx` | Chat screen with message list and input | Add `useTtsQueue()` call + visual indicator |
| `src/components/language-learning/chat-bubble.tsx` | Agent/user chat bubbles | Optional: add TTS highlight for currently spoken phrase |

### Critical: expo-speech Installation

`expo-speech` is NOT currently installed. Must install first:

```bash
npx expo install expo-speech
```

`expo-speech` provides `speak()`, `stop()`, `isSpeakingAsync()` — all that's needed. It works with Expo SDK 55 and `expo-dev-client`. The `speak()` function accepts options including `language` for locale.

### Critical: Double-Speak Algorithm

For each phrase in the queue, the hook must:
1. Speak the phrase via `expo-speech.speak(phrase, { language: "el-GR" })`
2. Await completion (use the `onDone` callback or a promise wrapper)
3. Wait `TTS_REPEAT_PAUSE_MS` (800ms)
4. Speak the same phrase again
5. Await completion
6. Wait `TTS_PHRASE_PAUSE_MS` (1200ms) before the next phrase
7. Dequeue the phrase from the store

```typescript
async function processQueue() {
  while (store.ttsQueue.length > 0) {
    const phrase = store.ttsQueue[0];
    store.setCurrentTtsPhrase(phrase);
    
    // First speak
    await speak(phrase);
    await delay(TTS_REPEAT_PAUSE_MS);
    
    // Second speak
    await speak(phrase);
    await delay(TTS_PHRASE_PAUSE_MS);
    
    store.dequeueTts();
  }
  store.setCurrentTtsPhrase(null);
  store.setSpeaking(false);
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, { language: "el-GR", onDone: resolve });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Critical: expo-speak Promise Wrapper

`expo-speech.speak()` uses callbacks, not promises. Wrap it:

```typescript
import * as Speech from "expo-speech";

function speakPhrase(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Speech.speak(text, {
      language: "el-GR",
      onDone: resolve,
      onError: (error) => {
        logger.error("TTS", "speak failed", error);
        resolve(); // resolve anyway so queue continues
      },
    });
  });
}
```

Always resolve (never reject) on error so the queue continues processing remaining phrases.

### Critical: useTtsQueue Hook Pattern

The hook watches `ttsQueue` and triggers processing when new phrases arrive. Use `useEffect` with the queue length as dependency:

```typescript
export function useTtsQueue() {
  const ttsQueue = useLanguageLearningStore((s) => s.ttsQueue);
  const isSpeaking = useLanguageLearningStore((s) => s.isSpeaking);
  const store = useLanguageLearningStore();

  useEffect(() => {
    if (ttsQueue.length === 0 || isSpeaking) return;
    
    store.setSpeaking(true);
    let cancelled = false;

    (async () => {
      while (store.ttsQueue.length > 0 && !cancelled) {
        const phrase = store.ttsQueue[0];
        store.setCurrentTtsPhrase(phrase);

        await speakPhrase(phrase);
        if (cancelled) break;
        await delay(TTS_REPEAT_PAUSE_MS);
        if (cancelled) break;

        await speakPhrase(phrase);
        if (cancelled) break;
        await delay(TTS_PHRASE_PAUSE_MS);

        store.dequeueTts();
      }

      if (!cancelled) {
        store.setCurrentTtsPhrase(null);
        store.setSpeaking(false);
      }
    })();

    return () => { cancelled = true; Speech.stop(); };
  }, [ttsQueue.length > 0]); // trigger when queue becomes non-empty
}
```

Key points:
- Only start processing when queue becomes non-empty AND we're not already speaking
- `cancelled` flag prevents state updates after unmount
- Call `Speech.stop()` on cleanup to cancel any in-progress speech
- Check `cancelled` between each async step

### Critical: Visual Indicator (AC-4)

The simplest approach: add a small indicator above the chat input or in the session header showing the currently spoken phrase:

```tsx
{currentTtsPhrase && (
  <View style={s.ttsIndicator}>
    <Text style={s.ttsText}>🔊 {currentTtsPhrase}</Text>
  </View>
)}
```

A more advanced approach (story 15.2 will refine this): highlight the phrase text within the chat bubble. For this story, a standalone indicator is sufficient to meet AC-4.

### Critical: NFR28 — First Sound Within 500ms

The timing constraint is on the total path from SSE event arrival to first sound. The `enqueueTts` call in `useSession` is synchronous (just a store update). The `useTtsQueue` hook fires on the next React render cycle. `expo-speech.speak()` begins speaking immediately when called (no buffering).

To minimize latency:
- Keep the `useTtsQueue` effect lean — no unnecessary async work before calling `speakPhrase`
- The hook should process the queue immediately when it becomes non-empty

At family scale (single user, no performance pressure), 500ms is very achievable — the main latency is the TTS engine startup.

### Store Update: currentTtsPhrase

Add to `LanguageLearningState` interface:
```typescript
currentTtsPhrase: string | null;
setCurrentTtsPhrase: (phrase: string | null) => void;
```

Add to `initialState`:
```typescript
currentTtsPhrase: null as string | null,
```

Add action:
```typescript
setCurrentTtsPhrase: (currentTtsPhrase) => set({ currentTtsPhrase }),
```

Add to `clearSession`:
```typescript
currentTtsPhrase: null,
```

### What This Story Does NOT Include

- Greek text visual styling (larger font, distinct color in chat bubbles) → Story 15.2
- STT voice input (mic button) → Story 15.3
- Chat interface → Story 14.6 (already done)
- SSE stream consumption → Story 14.4 (already done)
- Any Supabase migrations

### Project Structure Notes

New files:
- `src/hooks/use-tts-queue.ts` — Serial TTS double-speak queue hook

Modified files:
- `src/stores/language-learning.store.ts` — Add `currentTtsPhrase` and `setCurrentTtsPhrase`
- `src/app/(app)/(language-learning)/session.tsx` — Add `useTtsQueue()` call + visual indicator
- `package.json` — Add `expo-speech` dependency

### References

- [Source: epics-v4-language-learning.md — Story 15.1 acceptance criteria, FR106, NFR28, NFR30]
- [Source: architecture-v4-language-learning.md — TTS queue management spec, timing constants, languageLearningStore fields]
- [Source: architecture-v4-language-learning.md — Enforcement summary rules 1-6]
- [Source: architecture-v4-language-learning.md — TTS queue processing process pattern]
- [Source: src/hooks/use-session.ts — Line 35: `enqueueTts(event.phrases)` — already enqueues speak events]
- [Source: src/stores/language-learning.store.ts — `ttsQueue`, `isSpeaking`, `enqueueTts`, `dequeueTts`, `setSpeaking` already exist]
- [Source: src/constants/language-learning-defaults.ts — `TTS_REPEAT_PAUSE_MS = 800`, `TTS_PHRASE_PAUSE_MS = 1200` already defined]
- [Source: src/app/(app)/(language-learning)/session.tsx — Session screen where useTtsQueue must be called]
- [Source: src/hooks/use-learning-connection.ts — Hook pattern to follow (useEffect with cancelled flag, cleanup)]

## Dev Agent Record

### Agent Model Used

GLM 5.1

### Debug Log References

### Completion Notes List

- Installed expo-speech via `npx expo install expo-speech` — compatible with SDK 55
- Added `currentTtsPhrase` field and `setCurrentTtsPhrase` action to languageLearningStore; cleared in `clearSession()`
- Created `src/hooks/use-tts-queue.ts` implementing serial double-speak queue: each phrase spoken twice with TTS_REPEAT_PAUSE_MS (800ms) between repeats and TTS_PHRASE_PAUSE_MS (1200ms) between phrases; uses cancelled flag + Speech.stop() cleanup
- Integrated `useTtsQueue()` into session screen; added visual indicator bar above chat input showing currently spoken phrase
- All timing constants from `language-learning-defaults.ts`; no inline timing values; TTS locale always el-GR

### File List

- `package.json` — Added expo-speech dependency
- `src/stores/language-learning.store.ts` — Added currentTtsPhrase field, setCurrentTtsPhrase action, clear in clearSession
- `src/hooks/use-tts-queue.ts` — New file: serial TTS double-speak queue hook
- `src/app/(app)/(language-learning)/session.tsx` — Added useTtsQueue() call and TTS visual indicator

### Change Log

- 2026-05-04: Implemented TTS double-speak queue — expo-speech installed, store updated with currentTtsPhrase, useTtsQueue hook created, session screen integrated with visual indicator

### Review Findings

- [x] [Review][Patch] Self-cancelling effect causes permanent TTS queue deadlock [src/hooks/use-tts-queue.ts] — Fixed: replaced store `isSpeaking` dep with `useRef` processing lock, deps now `[ttsQueue.length]` only.
- [x] [Review][Patch] Trailing 1.2s pause after the final phrase [src/hooks/use-tts-queue.ts:55] — Fixed: `TTS_PHRASE_PAUSE_MS` only applied when `liveStore().ttsQueue.length > 0`.
- [x] [Review][Patch] Silent TTS error swallowing without logging [src/hooks/use-tts-queue.ts:15] — Fixed: added `logger.error("TTS", "speak failed", error)` in onError before resolve.
- [x] [Review][Patch] Full store subscription causes unnecessary re-renders [src/hooks/use-tts-queue.ts:34] — Fixed: replaced `useLanguageLearningStore()` with `useLanguageLearningStore.getState()` for actions.
- [x] [Review][Patch] `clearSession` doesn't cancel in-flight speech [src/hooks/use-tts-queue.ts:33] — Fixed: added useEffect watching `activeSession`, calls `Speech.stop()` when null.
- [x] [Review][Defer] Date.now() message ID collisions [use-session.ts] — deferred, pre-existing
- [x] [Review][Defer] updateLastAgentMessage race condition [language-learning.store.ts] — deferred, pre-existing
- [x] [Review][Defer] router.replace post-navigation state write [use-session.ts] — deferred, pre-existing

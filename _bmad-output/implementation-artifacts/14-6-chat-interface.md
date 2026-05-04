# Story 14.6: Chat Interface

Status: done
branch: feature/14-6-chat-interface

## ARCHITECTURE MANDATES — NON-NEGOTIABLE

1. **Zero Supabase footprint** — No learning data in Supabase. All data lives in the harness container filesystem.
2. **SSE-only communication** — No WebSocket. HTTP + SSE for all client-harness communication.
3. **All harness API calls through `ISessionRepository`** — Never raw fetch in mobile screens/hooks.
4. **`languageLearningStore` for all learning UI state** — no local `useState` for session, messages, streaming, or TTS state. Exception: local `useState` is allowed for the text input value (it's ephemeral form state, not domain state).
5. **All timing constants from `language-learning-defaults.ts`** — no inline values in components.
6. **All user-facing error messages in Portuguese** — never show technical error codes or English messages.
7. **No React Native Paper `Card` component** — custom `TouchableOpacity`/`View` for all card/bubble UIs.
8. **No `EventSource` with custom headers** — SSE via fetch + ReadableStream (already handled by `sse-client.ts` from story 14.4).

## Story

As an admin,
I want to see my learning session as a chat conversation,
so that I can follow along with the agent's teaching.

## Acceptance Criteria

1. **AC-1: Chat message list** — Given a learning session is active, When the session screen loads, Then the app displays a scrollable list of chat messages And agent messages appear as bot-aligned chat bubbles And user messages appear as user-aligned chat bubbles.

2. **AC-2: Real-time streaming text** — Given the agent is generating a response, When `token` SSE events arrive, Then the current agent bubble updates in real-time with streaming text.

3. **AC-3: Send message** — Given the user types a message and taps send, When the message is submitted, Then a user bubble appears immediately in the chat And `ISessionRepository.sendMessage(content)` is called And a new agent bubble begins streaming the response.

4. **AC-4: Resume with history** — Given a session is resumed, When the chat screen loads with history, Then all previous messages from the resume response are rendered as chat bubbles.

5. **AC-5: Auto-scroll on new messages** — Given a resumed session has many messages, When the chat screen loads, Then the view scrolls to the bottom (most recent message).

## Tasks / Subtasks

- [x] Create `src/components/language-learning/chat-bubble.tsx` — chat message bubble (AC: #1, #2)
  - [x] Props: `message: ChatMessage`, `isStreaming?: boolean`
  - [x] Agent bubbles: left-aligned, distinct background color (e.g., `#F5F5F5`)
  - [x] User bubbles: right-aligned, accent background (e.g., `#B5451B` with white text)
  - [x] Streaming indicator on the active agent bubble (e.g., cursor or fade effect)
  - [x] Note: Greek text styling is story 15.2 — this story uses standard text only
- [x] Create `src/components/language-learning/chat-input.tsx` — text input + send button (AC: #3)
  - [x] Props: `onSend: (content: string) => void`, `disabled?: boolean`
  - [x] `TextInput` (multiline) + `TouchableOpacity` send button in a row
  - [x] Follow the input+button pattern from `recipe-comments.tsx` / `suggestion-comments.tsx`
  - [x] Disabled when `isStreaming` is true
  - [x] Clear input after send
  - [x] Note: mic button is story 15.3 — this story has text input only
- [x] Update `src/components/language-learning/index.ts` — export new components (AC: #1)
  - [x] Export `ChatBubble` and `ChatInput`
- [x] Replace `src/app/(app)/(language-learning)/session.tsx` placeholder with chat UI (AC: #1–#5)
  - [x] Header with skill label and back button
  - [x] `FlatList` rendering `ChatBubble` for each message from `languageLearningStore.messages`
  - [x] Auto-scroll to bottom on mount and when new messages arrive (use `FlatList` ref + `scrollToEnd()`)
  - [x] `ChatInput` pinned to bottom of screen (absolute positioned or flex layout)
  - [x] Use `useSession().sendMessage` for sending messages
  - [x] Loading indicator when starting/resuming session
  - [x] Empty state when no messages yet
- [x] Verify chat interface works with streaming (AC: #1–#5)

## Dev Notes

### Existing Code

This story replaces the session screen placeholder. Key files:

| File | What Exists | What This Story Changes |
|---|---|---|
| `src/app/(app)/(language-learning)/session.tsx` | Placeholder: shows skill label + "Ecrã de sessão (placeholder)" + back button | Replace with full chat UI |
| `src/stores/language-learning.store.ts` | `messages`, `addMessage`, `addMessages`, `updateLastAgentMessage`, `isStreaming`, `clearSession`, `activeSession` | No changes — all actions already exist |
| `src/types/language-learning.types.ts` | `ChatMessage` type: `{ id, role, content, timestamp }` | No changes |
| `src/hooks/use-session.ts` (story 14.4) | `sendMessage(content)`, `startSession`, `resumeSession`, `endSession` | No changes — consume `sendMessage` from this hook |
| `src/constants/language-learning-defaults.ts` | `SKILL_LABELS`, timing constants | No changes |
| `src/components/language-learning/index.ts` | Exports `ConnectionStatusBar`, `SkillCard` | Add `ChatBubble`, `ChatInput` exports |

### Critical: Chat Layout Pattern

The chat screen has a fixed layout: scrollable message list takes most of the screen, input bar pinned to the bottom. Use a flex column layout:

```
┌─────────────────────────┐
│ Header (skill label)     │
├─────────────────────────┤
│                          │
│   FlatList (messages)    │
│   ↕ scrollable           │
│                          │
│  ┌───────────┐           │
│  │ Agent msg │           │
│  └───────────┘           │
│        ┌────────────┐    │
│        │  User msg   │    │
│        └────────────┘    │
│                          │
├─────────────────────────┤
│ [TextInput] [Enviar]     │
└─────────────────────────┘
```

Layout structure:
```tsx
<View style={{ flex: 1 }}>
  {/* Header */}
  <View style={s.header}>
    <TouchableOpacity onPress={() => router.back()}>
      <Text>← Voltar</Text>
    </TouchableOpacity>
    <Text style={s.headerTitle}>{skillLabel}</Text>
  </View>

  {/* Messages */}
  <FlatList
    ref={flatListRef}
    data={messages}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <ChatBubble message={item} />}
    contentContainerStyle={s.messageList}
    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
  />

  {/* Input */}
  <ChatInput onSend={handleSend} disabled={isStreaming} />
</View>
```

### Critical: Auto-Scroll to Bottom

This project has no existing auto-scroll pattern. For a chat screen, auto-scroll on:
1. **Initial load** — scroll to bottom when messages first render (or when resuming with history)
2. **New messages** — scroll to bottom when a new message is added
3. **Streaming updates** — scroll to bottom as agent text grows (optional — can be distracting)

Use `FlatList` with a ref and `scrollToEnd()`:
```typescript
const flatListRef = useRef<FlatList>(null);

// Scroll on content size change (covers new messages and streaming)
onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}

// Scroll on initial layout (covers mount and resume)
onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
```

For resumed sessions with many messages, the initial `scrollToEnd` on layout ensures the user sees the most recent messages immediately.

### Critical: ChatBubble Component

Agent and user bubbles have distinct alignment and styling:

```typescript
interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}
```

**Agent bubble:**
- Left-aligned (`alignSelf: "flex-start"`)
- Light background (`#F5F5F5`)
- Dark text (`#1A1A1A`)
- Max width ~80% of screen
- Border radius: 12 (top-left: 4 for speech-bubble effect)

**User bubble:**
- Right-aligned (`alignSelf: "flex-end"`)
- Accent background (`#B5451B`)
- White text (`#FFFFFF`)
- Max width ~80% of screen
- Border radius: 12 (top-right: 4 for speech-bubble effect)

**Streaming indicator:** When `isStreaming` is true on an agent bubble, show a blinking cursor or trailing `▊` character. This helps the user see that the agent is still generating.

Note: Greek text visual distinction is story 15.2. This story renders all text the same way.

### Critical: ChatInput Component

Follow the existing input+button pattern from `recipe-comments.tsx`:

```typescript
// Pattern from recipe-comments.tsx lines 202-222
<View style={s.addRow}>
  <TextInput
    style={s.addInput}
    value={text}
    onChangeText={setText}
    placeholder="Escrever mensagem..."
    placeholderTextColor="#CCCCCC"
    multiline
    editable={!disabled}
  />
  <TouchableOpacity
    style={[s.addBtn, (!text.trim() || disabled) && s.addBtnDisabled]}
    onPress={handleSend}
    disabled={!text.trim() || disabled}
  >
    <Text style={s.addBtnText}>Enviar</Text>
  </TouchableOpacity>
</View>
```

Styles from the established pattern:
```typescript
addRow: { flexDirection: "row", gap: 8, alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F0F0F0" },
addInput: { flex: 1, borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 100, backgroundColor: "#FFFFFF" },
addBtn: { backgroundColor: "#B5451B", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
addBtnDisabled: { opacity: 0.5 },
addBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
```

Note: Mic button is story 15.3. This story has text input only. The `ChatInput` component should accept an `onSend` prop so the mic button can be added later without refactoring.

### Critical: sendMessage Integration

The `sendMessage` function from `useSession()` (story 14.4) handles the full flow:
1. Adds user message to store
2. Adds empty agent message to store
3. Calls `ISessionRepository.sendMessage(content)`
4. Iterates SSE stream, dispatching `token`/`speak`/`skill-complete`/`done` events to store
5. Sets `isStreaming` true/false

The chat screen just needs to call `sendMessage(text)` and the store updates drive the UI re-render. The `ChatBubble` for the last agent message will automatically update as `updateLastAgentMessage` appends tokens.

### Critical: Handling the "streaming" Agent Bubble

When `sendMessage` is called, it adds an empty agent message to the store. The `ChatBubble` rendering the last agent message should know it's the one being streamed. Determine this by:

```typescript
const isLastAgent = message.role === "agent" && isStreaming &&
  messages[messages.length - 1]?.id === message.id;
```

Pass `isStreaming={isLastAgent}` to `ChatBubble`.

### Error Handling

- `sendMessage` fails (network error, SSE error event) → Portuguese error displayed (handled by `useSession` hook, not by chat screen)
- No active session → shouldn't happen (user navigated here from skill selection), but show Portuguese error and navigate back
- Empty state (no messages yet) → Show a centered Portuguese prompt like "Inicie a conversa..."

### What This Story Does NOT Include

- Greek text styling (larger font, distinct color) → Story 15.2
- Mic button (STT voice input) → Story 15.3
- TTS playback (double-speak queue) → Story 15.1
- Skill selection screen → Story 14.5
- SSE client / session hooks → Story 14.4
- Connection status bar → Story 13.3

### Project Structure Notes

New files:
- `src/components/language-learning/chat-bubble.tsx` — Agent/user chat bubble
- `src/components/language-learning/chat-input.tsx` — Text input + send button

Modified files:
- `src/app/(app)/(language-learning)/session.tsx` — Replace placeholder with chat UI
- `src/components/language-learning/index.ts` — Export new components

### References

- [Source: epics-v4-language-learning.md — Story 14.6 acceptance criteria, FR105]
- [Source: architecture-v4-language-learning.md — Chat bubble interface spec, FR-to-directory mapping]
- [Source: architecture-v4-language-learning.md — Enforcement summary]
- [Source: src/app/(app)/(language-learning)/session.tsx — Current placeholder to replace]
- [Source: src/stores/language-learning.store.ts — All store actions: messages, addMessage, updateLastAgentMessage, isStreaming, activeSession]
- [Source: src/types/language-learning.types.ts — ChatMessage type]
- [Source: src/hooks/use-session.ts — sendMessage function that drives the chat]
- [Source: src/constants/language-learning-defaults.ts — SKILL_LABELS]
- [Source: src/components/recipes/recipe-comments.tsx — Input+button row pattern to follow (lines 202-222, styles lines 332-362)]
- [Source: src/components/language-learning/connection-status-bar.tsx — Component pattern (named export, StyleSheet, store subscription)]
- [Source: src/components/leftovers/leftover-item-card.tsx — Floating card style reference (borderRadius, elevation)]

## Dev Agent Record

### Agent Model Used

glm-5.1

### Debug Log References

### Completion Notes List

- ChatBubble component: agent bubbles (left-aligned, #F5F5F5 bg) and user bubbles (right-aligned, #B5451B bg) with speech-bubble border radii and streaming cursor indicator (▊)
- ChatInput component: multiline TextInput + "Enviar" button following recipe-comments.tsx pattern, disabled during streaming, clears after send
- Session screen: FlatList with auto-scroll (onContentSizeChange + onLayout), ChatInput pinned at bottom, empty/loading/error states, streams last agent message via isStreaming prop
- All new components exported from index.ts

### File List

- src/components/language-learning/chat-bubble.tsx (new)
- src/components/language-learning/chat-input.tsx (new)
- src/components/language-learning/index.ts (modified — added exports)
- src/app/(app)/(language-learning)/session.tsx (modified — replaced placeholder with chat UI)

### Review Findings

- [x] [Review][Patch] Missing `extraData={isStreaming}` on FlatList [session.tsx] — Fixed: added `extraData={isStreaming}`.
- [x] [Review][Patch] Unused `scrollToEnd` function [session.tsx] — Dismissed: function IS used at `onContentSizeChange={scrollToEnd}`.
- [x] [Review][Patch] Missing error display for sendMessage failure [session.tsx] — Fixed: reads `authError` from store, renders error banner below header.
- [x] [Review][Patch] Keyboard stays visible when input becomes disabled [chat-input.tsx] — Fixed: added `Keyboard.dismiss()` in handleSend.
- [x] [Review][Defer] Excessive scrollToEnd calls during streaming [session.tsx] — deferred, performance optimization for later
- [x] [Review][Defer] Missing KeyboardAvoidingView [session.tsx] — deferred, out of scope for this story
- [x] [Review][Defer] skill-complete navigation race in use-session.ts — deferred, pre-existing issue
- [x] [Review][Defer] Empty agent bubble persists on stream error — deferred, pre-existing in use-session.ts
- [x] [Review][Defer] User message optimistic add without rollback on failure — deferred, pre-existing in use-session.ts
- [x] [Review][Defer] useSession() subscribes to entire store — deferred, pre-existing in use-session.ts
- [x] [Review][Defer] updateLastAgentMessage no-op array copy — deferred, pre-existing in store
- [x] [Review][Defer] No accessibility labels — deferred, out of scope for this story

# Story 15.2: Greek Text Styling

Status: review
branch: feature/15-2-greek-text-styling

## ARCHITECTURE MANDATES — NON-NEGOTIABLE

1. **Zero Supabase footprint** — No learning data in Supabase. All data lives in the harness container filesystem.
2. **`languageLearningStore` for all learning UI state** — `currentTtsPhrase` for TTS highlight comes from the store.
3. **All user-facing strings in Portuguese** — never show technical error codes or English messages.
4. **No React Native Paper `Card` component** — custom `TouchableOpacity`/`View` for all UI.

## Story

As an admin,
I want Greek text in the chat to look visually distinct from other text,
so that I can easily identify the language content I need to focus on.

## Acceptance Criteria

1. **AC-1: Greek text distinct styling** — Given an agent chat bubble contains Greek text, When the bubble is rendered, Then the Greek text is displayed with a larger font size and distinct color compared to other text in the bubble.

2. **AC-2: Mixed content styling** — Given the agent's response contains both Greek and non-Greek text, When the bubble is rendered, Then the Greek portion is visually distinct while the non-Greek portion uses standard styling.

3. **AC-3: TTS highlight** — Given TTS is currently speaking a phrase, When the phrase corresponds to text in a chat bubble, Then the spoken text is highlighted or indicated in the bubble (FR107).

## Tasks / Subtasks

- [x] Create a Greek text detection utility (AC: #1, #2)
  - [x] Function to split a string into segments of `{ text, isGreek }` parts
  - [x] Use Unicode range detection for Greek characters (U+0370–U+03FF, U+1F00–U+1FFF)
  - [x] Handle mixed content: "Here is Καλημέρα for you" → `[{ text: "Here is ", isGreek: false }, { text: "Καλημέρα", isGreek: true }, { text: " for you", isGreek: false }]`
- [x] Update `src/components/language-learning/chat-bubble.tsx` — render Greek text with distinct styling (AC: #1, #2)
  - [x] Replace single `<Text>` with a `<Text>` containing nested `<Text>` segments
  - [x] Greek segments: larger font size (e.g., 18), distinct color (e.g., `#B5451B` accent or `#1565C0` blue)
  - [x] Non-Greek segments: standard agent text styling (fontSize 15, color `#1A1A1A`)
  - [x] Only apply to agent bubbles — user bubbles render all text the same
- [x] Add TTS phrase highlight to chat bubble (AC: #3)
  - [x] Accept `currentTtsPhrase?: string | null` prop
  - [x] When the currently spoken phrase appears in the bubble's content, highlight it (e.g., bold + underline, or background highlight)
  - [x] Only highlight in agent bubbles where TTS is relevant
- [x] Update `session.tsx` to pass `currentTtsPhrase` to `ChatBubble` (AC: #3)
  - [x] Pass the store's `currentTtsPhrase` to the relevant chat bubble
- [x] Verify Greek text rendering and TTS highlight in chat (AC: #1–#3)

## Dev Notes

### Existing Code

This story modifies the existing `ChatBubble` component. Key files:

| File | What Exists | What This Story Changes |
|---|---|---|
| `src/components/language-learning/chat-bubble.tsx` | Renders `message.content` as a single `<Text>` with uniform styling. Agent bubbles: `#F5F5F5` bg, `#1A1A1A` text, fontSize 15. User bubbles: `#B5451B` bg, `#FFFFFF` text. | Replace single `<Text>` with segmented Greek/non-Greek `<Text>` spans. Add TTS highlight. |
| `src/app/(app)/(language-learning)/session.tsx` | Renders `ChatBubble` with `message` and `isStreaming` props. Has `currentTtsPhrase` from store (for the TTS indicator below chat). | Pass `currentTtsPhrase` to `ChatBubble` for inline highlight. |
| `src/stores/language-learning.store.ts` | `currentTtsPhrase: string | null` already exists (added in story 15.1) | No changes |

### Critical: Greek Text Detection

Greek characters fall in these Unicode ranges:
- **Greek and Coptic**: U+0370–U+03FF (main Greek alphabet)
- **Greek Extended**: U+1F00–U+1FFF (polytonic Greek with accents)
- **Combined Greek**: includes accented forms like ά, έ, ή, ί, ό, ύ, ώ

Detection function:

```typescript
const GREEK_REGEX = /[\u0370-\u03FF\u1F00-\u1FFF]/;

function isGreekChar(char: string): boolean {
  const code = char.codePointAt(0);
  if (!code) return false;
  return (code >= 0x0370 && code <= 0x03FF) || (code >= 0x1F00 && code <= 0x1FFF);
}

interface TextSegment {
  text: string;
  isGreek: boolean;
}

function segmentText(content: string): TextSegment[] {
  if (!content) return [];
  const segments: TextSegment[] = [];
  let current = "";
  let currentIsGreek = false;

  for (const char of content) {
    const greek = isGreekChar(char);
    if (greek !== currentIsGreek && current.length > 0) {
      segments.push({ text: current, isGreek: currentIsGreek });
      current = "";
    }
    currentIsGreek = greek;
    current += char;
  }

  if (current.length > 0) {
    segments.push({ text: current, isGreek: currentIsGreek });
  }

  return segments;
}
```

Keep this function in `chat-bubble.tsx` or in a small utility file. It's only used by this component, so inlining is fine.

### Critical: Segmented Text Rendering in React Native

React Native supports nested `<Text>` elements for inline styling:

```tsx
<Text style={s.agentText}>
  {segments.map((seg, i) => (
    <Text
      key={i}
      style={seg.isGreek ? s.greekText : undefined}
    >
      {seg.text}
    </Text>
  ))}
  {isStreaming && <Text style={s.cursor}>▊</Text>}
</Text>
```

This renders a single text block with inline style changes — no layout breaks between Greek and non-Greek segments.

### Critical: Greek Text Visual Styling

The Greek text must be **visually distinct** from surrounding text. Options:

| Approach | Pros | Cons |
|---|---|---|
| Larger font + accent color | Clear distinction, easy to read | May look uneven if Greek and non-Greek alternate frequently |
| Bold + accent color | Strong distinction, same size | Bold may not look different enough in some fonts |
| Background highlight | Very prominent | Can look cluttered in chat bubbles |

**Recommended:** Larger font (18px vs 15px standard) + accent color (`#B5451B` burnt orange, matching the app's primary accent). This gives a clear visual difference without being overwhelming.

```typescript
greekText: {
  fontSize: 18,
  color: "#B5451B",
  fontWeight: "600",
  lineHeight: 25,
},
```

### Critical: TTS Phrase Highlight (AC-3)

When `currentTtsPhrase` is set (TTS is speaking a phrase), highlight that phrase in the chat bubble. The simplest approach:

1. Check if `currentTtsPhrase` appears in `message.content`
2. If yes, render the phrase portion with a highlight style (e.g., underline + bold)

This requires combining the Greek segmentation with TTS highlight detection. The TTS phrase may span multiple segments. Approach:

```tsx
function isTtsActive(text: string, ttsPhrase: string | null): boolean {
  return !!ttsPhrase && text.includes(ttsPhrase);
}
```

For the highlight style:
```typescript
ttsHighlight: {
  backgroundColor: "rgba(181, 69, 27, 0.12)",
  borderRadius: 3,
},
```

Or simpler — just bold the Greek text when TTS is active for that bubble:
```typescript
ttsActive: {
  fontWeight: "700",
  textDecorationLine: "underline",
},
```

**Recommendation:** Use a subtle background highlight. It's visually clear and doesn't interfere with the text styling. Only apply to agent bubbles where the TTS phrase matches.

### Component Props Update

`ChatBubble` needs a new prop for the TTS phrase:

```typescript
interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  currentTtsPhrase?: string | null;
}
```

### Session Screen Update

In `session.tsx`, pass `currentTtsPhrase` to the `ChatBubble`:

```tsx
<ChatBubble
  message={item}
  isStreaming={isLastAgent}
  currentTtsPhrase={currentTtsPhrase}
/>
```

`currentTtsPhrase` is already subscribed in `session.tsx` (line 26).

### Edge Cases

- **Empty content**: `segmentText("")` returns `[]` — render nothing
- **All Greek**: Single segment with `isGreek: true`
- **All non-Greek**: Single segment with `isGreek: false`
- **Very long mixed text**: Many small segments — should be fine with nested `<Text>`
- **Greek punctuation**: Characters like `;` (Greek question mark U+037E) should be detected as Greek
- **Streaming**: As tokens arrive, the content grows. Greek detection runs on every render — this is fine for chat-scale text
- **TTS phrase not in bubble**: Highlight simply doesn't apply — no visual change

### What This Story Does NOT Include

- TTS playback (double-speak queue) → Story 15.1 (already done)
- STT voice input (mic button) → Story 15.3
- Chat interface structure → Story 14.6 (already done)
- Any Supabase migrations

### Project Structure Notes

Modified files:
- `src/components/language-learning/chat-bubble.tsx` — Add Greek text segmentation + distinct styling + TTS highlight
- `src/app/(app)/(language-learning)/session.tsx` — Pass `currentTtsPhrase` to `ChatBubble`

### References

- [Source: epics-v4-language-learning.md — Story 15.2 acceptance criteria, FR107]
- [Source: architecture-v4-language-learning.md — Greek text display spec, TTS indicator spec]
- [Source: src/components/language-learning/chat-bubble.tsx — Current single-Text rendering to replace with segmented spans]
- [Source: src/app/(app)/(language-learning)/session.tsx — Session screen, `currentTtsPhrase` already subscribed (line 26)]
- [Source: src/stores/language-learning.store.ts — `currentTtsPhrase` already exists]
- [Source: src/types/language-learning.types.ts — ChatMessage type]

## Dev Agent Record

### Agent Model Used

GLM-5.1 (zai-coding-plan/glm-5.1)

### Debug Log References

### Completion Notes List

- Implemented `segmentText()` and `isGreekChar()` utilities in chat-bubble.tsx using Unicode range detection (U+0370–U+03FF, U+1F00–U+1FFF)
- Agent bubbles now render Greek text with distinct styling: fontSize 18, color #B5451B, fontWeight 600
- Non-Greek segments retain standard agent text styling (fontSize 15, color #1A1A1A)
- User bubbles render all text uniformly (no Greek styling applied)
- Added `currentTtsPhrase` prop to ChatBubble; when active, matching segments get a subtle background highlight (rgba(181, 69, 27, 0.12))
- Updated session.tsx to pass `currentTtsPhrase` from the store to ChatBubble
- Lint passes cleanly on changed files; no new type-check errors introduced

### File List

- `src/components/language-learning/chat-bubble.tsx` — Modified: Added Greek text segmentation, distinct Greek styling, TTS highlight
- `src/app/(app)/(language-learning)/session.tsx` — Modified: Pass `currentTtsPhrase` to ChatBubble

### Change Log

- 2026-05-04: Story 15.2 implemented — Greek text detection + distinct styling + TTS highlight in agent chat bubbles

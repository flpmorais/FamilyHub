# Deferred Work

## Deferred from: code review of 13-1-harness-api-foundation.md (2026-05-03)

- `/auth/status` response shape is a placeholder (`{"user_id": ..., "email": ...}`) — story 13.2 will implement the real endpoint returning `{ configured: bool, setupComplete: bool }`
- `UserContext` is a dataclass rather than a Pydantic model — the placeholder auth endpoint uses `dict` return type; story 13.2 will revisit if a typed response model is needed

## Deferred from: code review of 13-2-api-key-configuration-and-user-provisioning.md (2026-05-03)

- Wildcard CORS (`allow_origins=["*"]`) on authenticated API — pre-existing from 13-1 skeleton. Containerized behind Cloudflare Tunnel mitigates risk.
- No JWT audience/issuer validation in `dependencies.py` — pre-existing from 13-1 skeleton. Story 13-2 explicitly noted "No changes needed" for dependencies.py.
- Race condition on concurrent `provision_user` for same user — at family scale (2 users) this is practically impossible.
- `FLUENT_DATA_DIR` missing/unwritable gives cryptic 500 — environment configuration issue, not code defect.

## Deferred from: code review of 13-3-mobile-language-learning-route-shell-and-connection-status.md (2026-05-03)

- No cleanup/abort for AsyncIterable<SSEEvent> from `sendMessage` — placeholder interface for stories 14.x, will need AbortSignal when implemented
- Unbounded `messages` array in language-learning store — no eviction policy; will need cap or pruning when chat is fully implemented (stories 14.x)
- Unbounded `ttsQueue` in language-learning store — no max size guard; will need bounds when TTS is implemented (Epic 15)
- `SessionInfo.skill` typed as `string` instead of `LearningSkill` — matches spec interface definition; can tighten later when skill values are validated server-side
- Architecture Mandate #12 ("All harness API calls require JWT") should be updated to exempt `GET /health` — health check is intentionally unauthenticated per code review decision

## Deferred from: code review of 13-4-mobile-api-key-setup-screen.md (2026-05-03)

- Relative navigation path `router.replace("../")` is fragile — maintainability concern, not a bug. If route hierarchy changes, navigation breaks silently.
- Stale `authStatus` persists in store across disconnection/reconnection — self-corrects when useFocusEffect re-fires on reconnection
- No cancellation guard on api-key-setup.tsx async flow — router.replace is global so safe, but store state updates fire after potential unmount
- Transient state inconsistency when connectionStatus changes mid-flight in index.tsx — self-corrects on next useFocusEffect cycle
- Navigation useEffect in index.tsx doesn't guard on connectionStatus — authStatus is only set when connected via useFocusEffect, so the race is theoretical

## Deferred from: code review of 14-1-langgraph-agent-and-fluent-skill-integration.md (2026-05-03)

- Model and base_url hardcoded in `create_agent` — `glm-4-flash` and `https://open.bigmodel.cn/api/paas/v4` are hardcoded; not specified as configurable in this story. Future enhancement.
- `sys.path` thread-safety during `_import_fluent_update_functions` — theoretical race condition in async server; GIL makes this practically impossible. No action needed at family scale.

## Deferred from: code review of 14-2-session-lifecycle-endpoints.md (2026-05-03)

- TOCTOU race condition between session state check and action in session router — theoretical at family scale (2 users). Would need locking for multi-user scale.
- SQLite connection shared across threads (main event loop + worker threads via asyncio.to_thread) — needs verification with langgraph-checkpoint-sqlite version for `check_same_thread` setting.
- `load_user_fluent_data` dead code in session_manager — utility method not called by any code path; may be useful for future stories that need eager data loading.
- Skill validation in router — already handled by `session_manager.create_agent` raising `ValueError` on unknown skills. Router-level validation would be redundant.

## Deferred from: code review round 2 of 14-2-session-lifecycle-endpoints.md (2026-05-03)

- `end_session` pop-before-write trades stuck-user for data loss — acceptable tradeoff at family scale. Pop-first avoids stuck user (worse UX); data loss on write failure is unlikely in containerized deployment.

## Deferred from: code review of 14-3-sse-streaming-and-event-emission.md (2026-05-04)

- TOCTOU race between `get_session_info` and `get_agent` in `/session/message` — pre-existing pattern across all session.py endpoints, not introduced by this change
- Concurrent messages can corrupt SqliteSaver checkpoints — systemic issue with session_manager design; needs per-user stream lock
- Session end while stream active causes data loss — needs coordination layer between session_manager and active streams
- No input length validation on `body.content` — not specified in AC, out of scope for this story
- SkillCompleteEvent emitted unconditionally — deferred to story 14.4+. Fluent has no explicit completion signal yet; acceptable simplification.
- `/session/start` SSE greeting — unchecking task. Keep JSON response; mobile client handles post-start streaming via /message endpoint.

## Deferred from: code review of 14-4-mobile-sse-client-and-session-hooks.md (2026-05-04)

- **setAuthError used for non-auth errors** (`src/hooks/use-session.ts:39`) — naming issue only, works functionally. Store has no separate error field for SSE/session errors.
- **router.replace("../") navigation target** (`src/hooks/use-session.ts:37`) — depends on route structure from story 14.5. May need updating when skill menu is implemented.
- **No retry mechanism on network failure** (`src/hooks/use-session.ts:46-48`) — AC-5 requires "user can retry" but retry UI is story 14.6's responsibility.

## Deferred from: code review of 14-5-skill-selection-screen.md (2026-05-04)

- **Unsafe `as LearningSkill` type assertion** (`session.tsx:15`) — placeholder file to be replaced in story 14.6. No action needed now.
- **No error boundary for async errors in skill press handler** (`index.tsx:122-144`) — pre-existing architectural concern. Not specific to this story; applies to all async handlers project-wide.

## Deferred from: code review of 14-6-chat-interface.md (2026-05-04)

- Excessive `scrollToEnd` calls during streaming — `onContentSizeChange` fires per token; debounce or remove `onLayout` scroll for performance (not a bug)
- Missing `KeyboardAvoidingView` — out of scope for this story; Android handles keyboard via `adjustResize` by default
- `skill-complete` navigation race in `use-session.ts:39-40` — pre-existing; `router.replace("../")` may resolve to wrong route if user navigates away during streaming
- Empty agent bubble persists on stream error — pre-existing in `use-session.ts`; agent message added before stream starts, no cleanup on failure
- User message optimistic add without rollback — pre-existing in `use-session.ts`; message added to store before network call, no removal on failure
- `useSession()` subscribes to entire store — pre-existing in `use-session.ts:7`; causes unnecessary re-renders during streaming
- `updateLastAgentMessage` creates new array on no-op — pre-existing in store; wasteful during streaming but not a correctness issue
- No accessibility labels on chat components — out of scope for this story; project-wide concern

## Deferred from: code review of 15-1-tts-double-speak-queue.md (2026-05-04)

- Date.now() message ID collisions in `use-session.ts` — rapid sends may produce duplicate IDs; pre-existing
- updateLastAgentMessage appends to wrong message if last message isn't agent — pre-existing race condition in store
- router.replace post-navigation state write in `use-session.ts` — finally block writes to cleared store; pre-existing

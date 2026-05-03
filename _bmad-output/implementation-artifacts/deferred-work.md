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

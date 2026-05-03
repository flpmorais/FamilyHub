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

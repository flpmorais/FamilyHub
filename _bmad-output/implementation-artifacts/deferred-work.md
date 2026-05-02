# Deferred Work

## Deferred from: code review of 13-1-harness-api-foundation.md (2026-05-03)

- `/auth/status` response shape is a placeholder (`{"user_id": ..., "email": ...}`) — story 13.2 will implement the real endpoint returning `{ configured: bool, setupComplete: bool }`
- `UserContext` is a dataclass rather than a Pydantic model — the placeholder auth endpoint uses `dict` return type; story 13.2 will revisit if a typed response model is needed

## Deferred from: code review of 13-2-api-key-configuration-and-user-provisioning.md (2026-05-03)

- Wildcard CORS (`allow_origins=["*"]`) on authenticated API — pre-existing from 13-1 skeleton. Containerized behind Cloudflare Tunnel mitigates risk.
- No JWT audience/issuer validation in `dependencies.py` — pre-existing from 13-1 skeleton. Story 13-2 explicitly noted "No changes needed" for dependencies.py.
- Race condition on concurrent `provision_user` for same user — at family scale (2 users) this is practically impossible.
- `FLUENT_DATA_DIR` missing/unwritable gives cryptic 500 — environment configuration issue, not code defect.

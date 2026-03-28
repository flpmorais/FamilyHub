# Story 5.2: OTA Update — Silent Auto-Apply

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want the app to silently download and apply any available update on launch,
so that I'm always on the latest version without any prompts or interruptions.

## Acceptance Criteria

1. **Given** the app launches
   **When** `OtaRepository.checkForUpdate()` is called in the background
   **Then** if a new JS bundle is available, it is fetched and applied immediately via `expo-updates` `fetchUpdateAsync()` + `reloadAsync()`
   **And** the reload happens before the user has interacted with any content — no visible transition or prompt
   **And** if no update is available, nothing happens and nothing is shown

2. **Given** the OTA check or fetch fails (network error, EAS Update unavailable)
   **When** the error is caught in `OtaRepository`
   **Then** the failure is silently swallowed — no error message, no crash, no impact on app launch (NFR20)
   **And** the app continues to run on the currently installed bundle

## Tasks / Subtasks

- [x] Task 1: Implement OtaRepository (AC: #1, #2)
  - [x] 1.1 Replace stub `checkForUpdate()` with real implementation using `Updates.checkForUpdateAsync()` from `expo-updates`
  - [x] 1.2 If update is available, call `Updates.fetchUpdateAsync()` to download the bundle
  - [x] 1.3 After successful fetch, call `Updates.reloadAsync()` to apply and reload
  - [x] 1.4 Return `true` if update was found and applied, `false` otherwise
  - [x] 1.5 Replace stub `applyUpdate()` — delegates to checkForUpdate as manual trigger
  - [x] 1.6 Wrap entire flow in try-catch: on ANY error, log with `logger.info` (not error — this is expected in dev) and return `false`

- [x] Task 2: Integrate OTA check on app launch (AC: #1)
  - [x] 2.1 In `AppInitializer` component (src/app/_layout.tsx), after existing initialization, call `otaRepo.checkForUpdate()` in the background
  - [x] 2.2 Do NOT await the OTA check — run it with `void` so it doesn't block app startup
  - [x] 2.3 Only run in non-development builds (`__DEV__` early return in checkForUpdate)

- [x] Task 3: Type-check and lint verification (AC: all)
  - [x] 3.1 Run `npx tsc --noEmit` — zero errors
  - [x] 3.2 Run linter if configured — zero errors

## Dev Notes

### Architecture Requirements

- **Silent and non-blocking**: OTA check must NEVER block app launch, show UI, or throw errors to the user. NFR20 mandates this.
- **Repository pattern**: `IOtaRepository` interface and `SupabaseOtaRepository` implementation already exist as stubs. Just replace the stub implementations.
- **Already wired up**: The OTA repository is already registered in `repository.context.tsx` and accessible via `useRepository('ota')`.

### Existing Code to Reuse (DO NOT Reinvent)

- **OTA repository stub** (`src/repositories/supabase/ota.repository.ts`): Has `checkForUpdate()` and `applyUpdate()` stubs — replace with real implementations.
- **OTA interface** (`src/repositories/interfaces/ota.repository.interface.ts`): Already defines the contract — no changes needed.
- **AppInitializer** (`src/app/_layout.tsx`): Already runs async initialization on mount with error handling. Add OTA check here.
- **Logger** (`src/utils/logger.ts`): Use `logger.info('OTA', ...)` for successful checks and `logger.warn('OTA', ...)` for failures — NOT `logger.error` since network failures are expected.
- **expo-updates** (v55.0.15): Already installed. Use `Updates.checkForUpdateAsync()`, `Updates.fetchUpdateAsync()`, `Updates.reloadAsync()`.

### Implementation Pattern

```typescript
import * as Updates from 'expo-updates';

async checkForUpdate(): Promise<boolean> {
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true; // won't actually reach here due to reload
  } catch {
    // Silently swallow — network errors, dev mode, etc.
    return false;
  }
}
```

### Dev Mode Consideration

`expo-updates` throws in development builds (`__DEV__ === true`). The try-catch handles this gracefully. Optionally, add an early return: `if (__DEV__) return false;` to skip the check entirely in dev.

### Project Structure Notes

- MODIFY: `src/repositories/supabase/ota.repository.ts` — replace stubs
- MODIFY: `src/app/_layout.tsx` — add OTA check in AppInitializer
- No new files needed
- No migration needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5-Story-5.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR40-NFR20]
- [Source: _bmad-output/planning-artifacts/architecture.md#OTA-EAS-Update]
- [Source: src/repositories/supabase/ota.repository.ts — current stub]
- [Source: src/app/_layout.tsx — AppInitializer pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- No issues — clean implementation

### Completion Notes List

- Replaced OTA repository stubs with real expo-updates implementation: checkForUpdateAsync → fetchUpdateAsync → reloadAsync
- Added __DEV__ guard to skip OTA in development builds
- All errors silently swallowed with info-level logging (non-fatal per NFR20)
- Removed supabaseClient dependency from SupabaseOtaRepository constructor
- Integrated OTA check in AppInitializer with fire-and-forget pattern (void, never blocks)
- TypeScript zero errors

### File List

- MODIFY: src/repositories/supabase/ota.repository.ts
- MODIFY: src/repositories/repository.context.tsx
- MODIFY: src/app/_layout.tsx

### Change Log

- 2026-03-27: Story 5.2 implementation complete — silent OTA auto-apply on app launch

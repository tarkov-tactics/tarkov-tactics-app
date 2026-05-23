# Feature Spec: TarkovTracker Connection

> Status: `done`
> Priority: `P0`
> Feature: `shared`

## Overview
Enable the player to connect their TarkovTracker account by entering an API token. The app stores the token client-side, validates it against the TarkovTracker API, fetches the player's full progression state, and makes it available app-wide via a React context/hook. This is the data lifeline — without it, the app can only show static content.

## User Stories
- As a Tarkov player, I want to paste my TarkovTracker API token in Settings so the app can read my progression.
- As a Tarkov player, I want to see a confirmation that my token is valid (showing my name, level, faction) before leaving Settings.
- As a Tarkov player, I want my token to persist across browser sessions so I don't have to re-enter it.
- As a Tarkov player, I want to disconnect (clear my token) at any time.

## Data Requirements
### From TarkovTracker (Player State)
- `GET /token` — validate token, returns permissions and game mode
- `GET /progress` — full player state: tasks, objectives, hideout, level, faction, display name

### From tarkov.dev (Game Data)
- None for this spec.

### Computed/Derived
- `isConnected` — token exists AND has been validated
- `isValid` — token validation succeeded (GP permission present)
- `gameMode` — derived from token prefix (`PVP_` or `PVE_`)
- `connectionStatus` — `'disconnected' | 'validating' | 'connected' | 'error'`

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `TokenInput` | `features/settings/components/token-input.tsx` | Client | Masked input with paste, validate, and clear actions |
| `ConnectionStatus` | `features/settings/components/connection-status.tsx` | Client | Shows validation result: player name, level, faction, permissions |
| `GameModeSelector` | `features/settings/components/game-mode-selector.tsx` | Client | PVP/PVE toggle (auto-detected from token prefix) |

## Requirements
### Functional
- [ ] Settings page has a token input field (masked by default, toggle to reveal)
- [ ] "Validate" button sends token to `/api/tracker` BFF endpoint
- [ ] On success: show player name, level, faction, game mode, permissions
- [ ] On failure: show clear error message (invalid token, rate limited, network error)
- [ ] Token is stored in `localStorage` (key: `tarkov-tracker-token`)
- [ ] Token persists across page reloads and browser restarts
- [ ] "Disconnect" button clears token from storage and resets app state
- [ ] `PlayerStateProvider` context wraps the app, exposing `usePlayerState()` globally
- [ ] Auto-fetch progress on app load if token exists in storage
- [ ] BFF route (`/api/tracker`) proxies requests — token never leaves the client→server boundary in plain text

### Non-Functional
- [ ] Token input should not be auto-completed by browsers (autocomplete="off")
- [ ] Rate limit awareness: show remaining requests from `X-RateLimit-Remaining` header
- [ ] Debounce validation to prevent rapid re-clicks

## Success Criteria
- [ ] Can paste a valid PVP/PVE token and see player info
- [ ] Token persists after page reload
- [ ] Disconnecting clears all player state
- [ ] Invalid token shows a clear error
- [ ] `usePlayerState()` returns live data anywhere in the app

## Edge Cases
- Token with wrong permissions (no GP) → show "Missing read permission" error
- Token for PVE mode used in PVP context → show game mode mismatch warning
- API rate limited (429) → show retry timer from `Retry-After` header
- Network failure → show "Unable to reach TarkovTracker" with retry button
- Token is valid but progress endpoint returns empty data → handle gracefully
- localStorage unavailable (incognito, disabled) → fall back to in-memory storage with warning

## Dependencies
- Depends on: `spec-001` (App Shell — Settings page renders inside the shell)

## Open Questions
- ❓ Should the BFF proxy cache progress responses to reduce TarkovTracker API load? (Recommend: yes, short TTL like 60s)
- ❓ Should we support multiple tokens (e.g. PVP and PVE accounts)? (Recommend: not for MVP, single token)

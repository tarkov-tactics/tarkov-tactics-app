# Feature Spec: Offline & Error Resilience

> Status: `in-progress` (error boundary only — caching and resilience patterns pending)
> Priority: `P1`
> Feature: `shared`

## Overview
Make the app resilient to API failures, network issues, and rate limiting. When either TarkovTracker or tarkov.dev is unavailable, the app should degrade gracefully — serving cached data, showing clear error states, and allowing retry. The player should never see a blank screen or cryptic error.

## User Stories
- As a Tarkov player, I want the app to still show my last-known progress if TarkovTracker is temporarily down.
- As a Tarkov player, I want clear error messages telling me what's wrong and what I can do about it.
- As a Tarkov player, I want a retry button when something fails instead of having to reload the page.
- As a Tarkov player, I want to know when I'm viewing stale data vs fresh data.

## Data Requirements
### Computed/Derived
- `dataFreshness` — timestamp of last successful fetch per data source
- `isStale` — boolean, true if data is older than threshold (e.g., 10 min for tracker, 1 hour for game data)
- `errorState` — per-source error tracking with retry capability

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `ErrorBoundary` | `components/error-boundary.tsx` | Client | Catches render errors, shows recovery UI ✅ |
| `RetryPanel` | `components/retry-panel.tsx` | Client | Retry button with timestamp ✅ (not yet integrated into error flows) |
| `GlobalError` | `app/global-error.tsx` | Client | Fallback error page ✅ |
| `DataFreshnessIndicator` | `components/shared/data-freshness.tsx` | Client | Shows "Updated X ago" with stale warning — **not yet implemented** |
| `RateLimitNotice` | `components/shared/rate-limit-notice.tsx` | Client | Shows countdown timer when rate limited — **not yet implemented** |
| `EmptyState` | `components/shared/empty-state.tsx` | Client | Generic empty state with icon, message, action — **not yet implemented** |

## Requirements
### Functional
- [ ] Cache TarkovTracker progress in `localStorage` as fallback — not yet implemented
- [ ] Cache tarkov.dev game data in Next.js server-side cache (revalidation-based) — not yet implemented
- [ ] On API failure: serve cached data + show staleness indicator — not yet implemented
- [ ] On rate limit (429): show countdown timer from `Retry-After` header — not yet implemented
- [ ] On network error: show "No connection" banner with retry button — RetryPanel exists but not integrated
- [ ] On TarkovTracker auth error: prompt to re-enter token — not yet implemented
- [x] Global error boundary catches unexpected render crashes (`error-boundary.tsx` + `global-error.tsx`)
- [ ] Per-page error boundaries — not yet implemented (only global exists)
- [ ] Error boundaries show link to report issue — not yet implemented
- [ ] Data freshness indicator in header or footer: "Player data updated 3m ago" — not yet implemented
- [ ] Stale data (>10 min) shows warning badge — not yet implemented

### Non-Functional
- [ ] Cached data should survive browser restarts
- [ ] Cache size should be bounded (don't store unlimited game data)
- [ ] Error UI should match the app's dark military theme
- [ ] Retry logic should use exponential backoff (not spam the API)

## Success Criteria
- [ ] App remains functional (shows cached data) when TarkovTracker is unreachable
- [ ] Rate limit is handled with visible countdown
- [ ] No blank/white screens on any error path
- [ ] Data freshness is always visible to the player

## Edge Cases
- Both APIs down simultaneously → show fully cached state with "offline mode" banner
- Cache is empty AND API is down → show "Unable to load data" with setup instructions
- Browser clears localStorage → graceful reset to "not connected" state
- Extremely old cached data (>24 hours) → show strong warning, suggest refresh

## Dependencies
- Depends on: `spec-002` (TarkovTracker Connection — error states for that flow)
- Depends on: `spec-003` (Game Data Service — caching layer)

## Open Questions
- ❓ Should we implement a Service Worker for true offline support? Recommend: not for MVP, localStorage caching is sufficient.
- ❓ Should stale cache auto-refresh when connection is restored? Recommend: yes, with a visible "Refreshing..." indicator.

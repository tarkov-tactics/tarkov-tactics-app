# Feature Spec: App Shell & Navigation

> Status: `in-progress` (stitch design adoption)
> Priority: `P0`
> Feature: `shared`

## Overview
The app shell provides the persistent layout frame that wraps every page: a collapsible sidebar for navigation, a top header bar with branding and status, and a responsive content area. This is the visual skeleton — every other feature renders inside it.

The shell adopts the **Tarkov Tactical Interface (TTI)** visual language: the sidebar leads with an **Operator identity block** (avatar + name + level), nav links live below, and Settings/Logout sit in the footer. Page-level chrome is provided by a shared **`PageHeader`** component that renders the "INTEL BRIEFING" tactical title lockup with an optional `actions` slot for inline selectors (used by Dashboard for Vibe + Directive switching).

## User Stories
- As a Tarkov player, I want a clear navigation sidebar so that I can quickly switch between Dashboard, Goals, Vibes, and Settings.
- As a Tarkov player, I want to see my player name and level in the header so I know which account is connected.
- As a Tarkov player on mobile, I want the sidebar to collapse into a hamburger menu so the app is usable on smaller screens.

## Data Requirements
### From TarkovTracker (Player State)
- `displayName` — shown in header when connected
- `playerLevel` — shown in header as badge
- `pmcFaction` — USEC/BEAR indicator

### From tarkov.dev (Game Data)
- None for this spec.

### Computed/Derived
- `isConnected` — boolean derived from whether a valid token exists and progress has been fetched

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `AppShell` | `components/layout/app-shell.tsx` | Server | Wrapper that composes sidebar + header + content area |
| `Sidebar` | `components/layout/sidebar.tsx` | Client | Operator identity (top) → nav links → settings/logout footer. Collapsible to icon-only at 64px on tablet, drawer on mobile. |
| `OperatorIdentity` | `components/layout/operator-identity.tsx` | Client | Avatar + display name + "PMC LEVEL XX" telemetry label. Lives at the top of the sidebar. Falls back to "NOT CONNECTED" state when disconnected. |
| `Header` | `components/layout/header.tsx` | Client | Sticky top bar. **Mobile**: menu trigger + branding + compact connection chip. **Desktop**: empty (sidebar carries identity + nav; the page's `PageHeader` carries the title). No global refresh button — manual refresh lives in Settings; data auto-refreshes on app load. |
| `PageHeader` | `components/layout/page-header.tsx` | Server | Shared page chrome: tactical title (uppercase, tracking-tight, `text-2xl lg:text-3xl`) + optional subtitle pill (e.g., "DIRECTIVES") + sentence-case subtitle line + right-aligned `actions` slot. Used by every primary page. Renders inside the page's outer padding container; stacks vertically on mobile. |
| `MobileNav` | `components/layout/mobile-nav.tsx` | Client | Sheet/drawer navigation for small screens |

## Requirements
### Functional
- [x] Sidebar displays primary nav items: **Dashboard, Directives (Goals), Team** (from `siteConfig.primaryNav`). Settings + Log Out are in the sidebar footer. Vibes was removed from primary nav — switching happens inline on the Dashboard (see spec-005).
- [x] Active route is visually highlighted in sidebar
- [ ] Sidebar **leads with `OperatorIdentity`** — avatar (placeholder for now), `displayName`, and `PMC LEVEL XX` telemetry label, separated by a 1px border from the nav list
- [ ] `Settings` and `Log Out` live in a dedicated **sidebar footer block**, separated by a 1px border from the main nav (matches Stitch reference)
- [x] Sidebar collapses to icons-only on medium screens (64px wide)
- [x] Sidebar becomes a slide-out drawer on mobile (<768px)
- [ ] Header de-emphasized on desktop — no duplicate branding, no player chip, **no refresh button**. The page's `PageHeader` provides identity. Desktop header is visually empty (sticky structure preserved for layout).
- [ ] Mobile header carries: menu trigger, "TT" branding, compact connection chip (linked to Settings)
- [ ] No global refresh control on any page header. Player + team data **auto-refresh on app load** via the provider mount effect (already implemented in `PlayerStateProvider` / `TeamStateProvider`). Manual refresh lives on the Settings page — see spec-002.
- [ ] `PageHeader` component renders: uppercase tactical title (e.g., "INTEL BRIEFING"), optional subtitle pill (e.g., "DIRECTIVES" on the Goals page), telemetry subtitle line, and right-aligned `actions` slot for inline selectors / CTAs
- [ ] **`PageHeader.actions` usage** per page:
  - **Dashboard** (`/`): `LabeledSelector` ×2 → "SELECT VIBE" + "ACTIVE DIRECTIVE" (see spec-005 / spec-006).
  - **Directives** (`/goals`): single primary-styled `TarkovTrackerProfileLink` ("View Profile on TarkovTracker.org"). The `DirectiveScopeFilter` is rendered **inside** the right side column, not in the header (see spec-004).
  - **Team** (`/team`), **Settings** (`/settings`): no `actions` slot content.
- [x] Content area fills remaining space and scrolls independently
- [ ] App uses **Hanken Grotesk** as the primary UI font and **Geist** as the telemetry/mono font (via `next/font/google`)
- [ ] Telemetry label utility class available globally (10px Geist, weight 600, uppercase, `tracking-widest`)

### Non-Functional
- [x] Responsive across mobile, tablet, desktop
- [x] Smooth transition animations on sidebar collapse
- [ ] Loading skeleton for `OperatorIdentity` while player state is fetching

## Success Criteria
- [x] All 5 routes are navigable from the sidebar (Dashboard, Goals/Directives, Vibes, Team, Settings)
- [x] Active route is visually distinct
- [x] Mobile drawer opens/closes cleanly
- [x] Build passes with no TypeScript errors
- [ ] Sidebar matches Stitch reference: identity block → nav → settings/logout footer
- [ ] Every page renders inside a `PageHeader` lockup matching the Stitch typographic style
- [ ] No remaining references to Red Hat Text in code or fonts (Hanken Grotesk only)

## Edge Cases
- No TarkovTracker token → `OperatorIdentity` shows "OPERATOR — / NOT CONNECTED" with link to Settings
- API error fetching player info → identity block shows error indicator with retry
- Very long player names → truncate with ellipsis
- Sidebar in 64px icon-only mode → identity block collapses to avatar only (name/level hidden)

## Dependencies
- None — this is the foundation spec.

## Open Questions
- ❓ Should the sidebar support keyboard navigation (arrow keys) for a11y? (Recommend: yes, use Radix primitives) - YES
- ❓ Avatar image source for `OperatorIdentity` — Stitch uses a placeholder PMC portrait. **Resolved**: ship a Discord/Slack-style **initials monogram** derived from `displayName` (e.g., "OP" for "OPERATOR-01"). Functional + personal + no extra asset to ship. When disconnected, fall back to a Lucide `Shield` glyph. Custom avatars can be a Settings option later.

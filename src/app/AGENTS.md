# App Router Conventions

## Pages
- `page.tsx` — Route page component (default export, Server Component)
- `layout.tsx` — Shared layout wrapper
- `loading.tsx` — Loading UI (Suspense boundary)
- `error.tsx` — Error boundary (must be Client Component)

## Route Structure
- `/` — Next Raid Dashboard (primary view)
- `/goals` — Goal selection and progress overview
- `/vibes` — Vibe selection (Loot Run / PvP / Boss Rush)
- `/settings` — TarkovTracker token configuration
- `/api/tarkov/` — BFF proxy to tarkov.dev GraphQL
- `/api/tracker/` — BFF proxy to TarkovTracker REST API

## API Routes
- Use Route Handlers (`route.ts`) for BFF proxy endpoints
- Never expose API tokens to the client directly
- Respect rate limits: TarkovTracker ~60/min read, ~30/min write

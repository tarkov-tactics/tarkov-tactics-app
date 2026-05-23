# Source Code Organization

## Directory Structure
- `app/` — Next.js App Router pages and API routes
- `components/` — Shared UI components (shadcn/ui in `ui/`, layout in `layout/`, shared in `shared/`)
- `features/` — Domain feature modules (goals, vibes, dashboard) with co-located components/hooks/lib
- `lib/` — Shared utilities, API clients, constants
- `hooks/` — Shared custom React hooks
- `types/` — Shared TypeScript type definitions
- `config/` — App configuration (site metadata, navigation)

## Import Conventions
- Use `@/` alias for all imports (maps to `src/`)
- Prefer named exports over default exports (except pages)
- Group imports: React → Next.js → third-party → @/ aliases → relative

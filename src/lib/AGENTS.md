# Shared Libraries

## API Clients (`api/`)
- `tarkov-dev/` — GraphQL client for tarkov.dev (items, quests, maps, etc.)
- `tarkov-tracker/` — REST client for TarkovTracker (player progression)
- Each client has: `client.ts` (connection), `queries.ts` or `endpoints.ts` (operations), `types.ts` (data types)

## Utilities
- `utils.ts` — `cn()` class merger, formatters, general helpers
- `constants.ts` — API URLs, rate limit configs, game constants

## Rules
- No React imports in `lib/` (pure TypeScript utilities)
- API clients should handle errors gracefully and return typed results
- Rate limiting logic should be built into API clients

# Tarkov Tactics

Personalized raid recommendations for Escape from Tarkov — powered by [TarkovTracker](https://tarkovtracker.org) and [tarkov.dev](https://tarkov.dev).

## What is this?

Tarkov Tactics is a companion app that sits on top of existing Tarkov community tools to answer one question: **"What should I do in my next raid?"**

It combines your live progression state (from TarkovTracker) with game reference data (from tarkov.dev) to generate:

- 🗺️ **Map Recommendation** — Where to go and why
- 🔫 **Loadout Suggestion** — What to bring based on your budget and vibe
- 📍 **Prioritized POIs** — Where to go on the map
- 🎯 **Item Watchlist** — What to pick up
- ⚠️ **Risk Indicators** — What to watch out for

## Core Concepts

- **Goals** — Long-term progression paths (Prestige, Kappa, Story Endings, Lightkeeper)
- **Vibes** — Short-term raid intent (Loot Run, PvP/Mixed, Boss Rush)
- **Dashboard** — The Next Raid output combining your Goal + Vibe

## Tech Stack

- [Next.js 15](https://nextjs.org) App Router with TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [TarkovTracker API](https://api.tarkovtracker.org/docs) — Player progression
- [tarkov.dev API](https://tarkov.dev) — Game reference data

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
# Build
docker build -t tarkov-tactics .

# Run
docker run -p 3000:3000 tarkov-tactics
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages & API routes
├── components/    # Shared UI (shadcn/ui, layout, shared)
├── features/      # Domain modules (goals, vibes, dashboard)
├── lib/           # API clients, utilities, constants
├── hooks/         # Shared React hooks
├── types/         # Shared type definitions
└── config/        # App configuration
```

## Contributing

See the [Core Concepts wiki](https://github.com/tarkov-tactics/tarkov-tactics-app/wiki/Core-Concepts) for architecture details.

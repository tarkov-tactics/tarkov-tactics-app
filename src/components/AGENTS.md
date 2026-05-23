# Component Conventions

## shadcn/ui (`ui/`)
- Managed by shadcn CLI — add components via `npx shadcn@latest add <name>`
- Do NOT manually edit files in `ui/` unless customizing behavior
- Use `cn()` from `@/lib/utils` for conditional class merging

## Layout Components (`layout/`)
- `app-shell.tsx` — Main application shell with sidebar and header
- `sidebar.tsx` — Navigation sidebar
- `header.tsx` — Top header bar

## Shared Components (`shared/`)
- Reusable across features
- Must not import from `features/` (no circular deps)
- Keep components focused and composable

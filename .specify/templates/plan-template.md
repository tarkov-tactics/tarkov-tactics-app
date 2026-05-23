# Implementation Plan: [Feature Name]

> Spec: `spec-XXX`
> Status: `draft` | `approved` | `in-progress` | `done`

## Summary
<!-- What are we building, referencing the spec -->

## Architecture Decisions
<!-- Key technical choices and why -->
| Decision | Choice | Rationale |
|----------|--------|-----------|
| ... | ... | ... |

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/features/<name>/components/example.tsx` | ... |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/page.tsx` | ... |

## Data Flow
<!-- How data moves: API → client → hook → component → UI -->
```
TarkovTracker API ──→ /api/tracker (BFF) ──→ usePlayerState() ──→ Component
tarkov.dev API   ──→ /api/tarkov (BFF)   ──→ feature hook      ──→ Component
```

## API Changes
<!-- New queries, endpoint usage, or BFF route modifications -->

## State Management
<!-- What state lives where: server vs client, local vs shared -->

## Dependencies
<!-- New npm packages needed (if any) -->

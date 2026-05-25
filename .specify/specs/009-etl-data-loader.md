# Feature Spec: ETL Data Loader

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

The ETL Data Loader is the bridge between the pre-computed data artifacts published by the companion ETL pipeline and the ranking system. It fetches, integrity-checks, and caches a set of static data files from a configurable remote URL, making them available to downstream ranking stages via a typed accessor API. Each data file is independently consumable — the loader must never block the app when some files are available and others are not. When any file is unavailable, mismatched, or stale, the consuming feature falls back to a defined degraded behavior. The loader is the single authority on data provenance: it surfaces the ETL version, game patch, and source timestamps so the user always knows what data version they're operating on.

## User Stories

- As a Tarkov player, I want the app to automatically load pre-computed game data so that my raid recommendations are accurate without noticeable delay.
- As a Tarkov player, I want to see what game patch and data version the recommendations are based on so I can trust the output.
- As a Tarkov player, I want the app to still work (with reduced accuracy) if the pre-computed data is unavailable, rather than showing an error screen.
- As a Tarkov player, I want a warning when the pre-computed data is outdated so I know the recommendations may be less accurate.

## Data Requirements

### From TarkovTracker (Player State)

- None.

### From tarkov.dev (Game Data)

- None directly. Downstream fallbacks (when ETL files are unavailable) may query the game-data API at runtime — those fallbacks are specified per-file below and in the consuming feature specs.

### From ETL Pipeline (Pre-Computed Data)

The loader reads from a configurable base URL. All files use a declared schema version.

| File | Content | Consuming Feature Specs |
|------|---------|------------------------|
| `manifest.json` | Schema version, game patch, source provenance (commit hashes, query timestamps), SHA-256 hashes of all data files | All — the loader reads this first |
| `spawn-clusters.json` | Pre-computed PMC spawn clusters per map (centroids, members, radii, zone names) | 014 (Map Scoring) |
| `named-pois.json` | Human-readable names for every spawn cluster and POI, derived from extract/switch positions with directional proximity fallback | 012 (POI Clusters) |
| `loot-probabilities.json` | Per-map, per-container-type item probability distributions (normalized to sum to 1), with confidence flags per row | 012 (POI Clusters) |
| `quest-enhancements.json` | Structured constraint extraction per quest objective: maps, zone, body parts, weapon class, weapon specific item, weapon mods required, wearing required, not wearing, distance min/max, time of day, shot type, health state, required keys | 010 (Requirement Impact) |

### Computed/Derived

- **Validation status per file** — whether the file was loaded, its SHA-256 matched, and its schema version is compatible
- **Provenance record** — ETL version, game patch, source timestamps, surfaced to the user
- **Staleness indicator** — whether any loaded file is older than a configurable freshness threshold

## Requirements

### Functional

- [ ] The loader must read the manifest file from `{base_url}/latest/manifest.json` on initialization
- [ ] The manifest must declare a `schema_version`; the loader must validate it against the version the app expects and refuse all ETL data if the version is incompatible
- [ ] For each data file listed in the manifest, the loader must fetch the file and validate its SHA-256 hash against the hash declared in the manifest
- [ ] If a file's SHA-256 does not match, the loader must discard that file and treat it as unavailable — it must not use integrity-failed data
- [ ] Successfully loaded and validated files must be cached for the app's lifetime — no re-fetching per page navigation or dashboard recomputation
- [ ] The loader must expose a typed accessor API where each data file is retrievable independently; each accessor must return either the validated data or a null/fallback indicator
- [ ] The loader must log and surface provenance to the user: ETL version, game patch, and source timestamps from the manifest
- [ ] When a file is unavailable (fetch failure, missing from manifest, or integrity failure), the loader must emit a structured status indicating which file failed and why
- [ ] The loader must support partial data: if some files load successfully and others fail, the successfully loaded files must still be usable
- [ ] When the entire manifest is unavailable or fails integrity, the loader must refuse all ETL data and the app must fall back to all-runtime behavior as specified in each consuming feature spec
- [ ] A non-blocking warning must be surfaced to the user when any ETL data file is unavailable, indicating which data is missing and the impact on recommendation quality
- [ ] A non-blocking warning must be surfaced when loaded data is older than a configurable staleness threshold
- [ ] The loader must not block app startup — if the ETL endpoint is unreachable, the app must proceed with fallback behavior after a configurable timeout
- [ ] When one or more files fail to load (network error, integrity failure, or timeout), the loader must retry failed files in the background on a 5-minute interval
- [ ] Background retries must not block the UI or interrupt the user; when a retry succeeds, the newly loaded data must be seamlessly integrated and downstream ranking stages must recompute on the next dashboard request
- [ ] Background retries must stop once all files are successfully loaded or the app is closed

### Non-Functional

- [ ] Data fetch must occur once on app initialization, not per ranking computation
- [ ] The loader must handle network errors, timeouts, and malformed responses without crashing
- [ ] Provenance information must be accessible from a "data version" affordance in the user interface

## Per-File Fallback Behavior

Each consuming feature spec defines its own fallback in detail. The loader's contract is:

| File | When unavailable, the consuming feature must... |
|------|--------------------------------------------------|
| `spawn-clusters.json` | Fetch spawn data from the game-data API at runtime, filter to PMC player spawns, and cluster on-the-fly. Cache the result for the session. |
| `named-pois.json` | Use synthetic identifiers (e.g., `{map-name}-spawn-{index}`) for cluster names. Ranking still functions; only user-facing labels degrade. |
| `loot-probabilities.json` | Use uniform probability priors (`1 / item_count_per_container_type`) for all loot scoring. Surface a warning that loot scoring accuracy is reduced. |
| `quest-enhancements.json` | Use only the structured fields from the game-data API's task objective type (map restriction and objective type). Objectives with missing constraint data contribute zero to location-based matching and rely on map-level matching only. |
| `manifest.json` | Refuse all ETL data. Fall back to all-runtime behavior. Surface a non-blocking warning. |

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| ETL base URL | Root URL for fetching ETL data files |
| Expected schema version | The schema version the app is built to consume |
| Fetch timeout | Maximum time to wait for ETL endpoint before proceeding with fallbacks |
| Staleness threshold | Age beyond which loaded ETL data triggers a staleness warning to the user |
| Background retry interval | Interval for retrying failed file fetches in the background (default: 5 minutes) |

## Success Criteria

- [ ] App loads and functions when all ETL data files are available and valid
- [ ] App loads and functions (with degraded quality) when all ETL data files are unavailable
- [ ] App loads and functions when some ETL data files are available and others are not
- [ ] Provenance information (game patch, ETL version) is visible to the user
- [ ] Staleness warning appears when data exceeds the configured threshold
- [ ] SHA-256 mismatch causes the affected file to be treated as unavailable (not silently used)
- [ ] Schema version mismatch causes all ETL data to be refused

## Edge Cases

- ETL endpoint is completely unreachable → app proceeds with all-runtime fallbacks after timeout; non-blocking warning surfaced
- Manifest loads but one or more data files fail to fetch → partial data mode; available files used, unavailable files fall back
- Manifest's SHA-256 hash for a file does not match the fetched file's computed hash → that file is discarded; treated as unavailable
- Manifest declares a schema version the app does not support → all ETL data refused; full fallback mode
- Manifest is valid but lists zero data files → effectively empty ETL; all features use fallbacks
- ETL data is very old (e.g., from a previous game patch) → staleness warning surfaced; data is still used (stale data is better than no data) unless the schema version has changed
- Background retry succeeds after initial failure → newly loaded file is integrated seamlessly; downstream stages recompute on next dashboard request; staleness warning (if any) is cleared for that file
- Two browser tabs open simultaneously → each tab loads ETL data independently; no cross-tab coordination required

## Dependencies

- None — this is the foundation spec for the ranking system.
- Enhanced by: `spec-008` (Error Resilience — patterns for fallback behavior and warning surfacing)

## Open Questions

- ✅ Resolved: The loader retries failed files in the background every 5 minutes until all files succeed or the app is closed. No manual reload required.

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified, including all ETL-specific scenarios
- [x] Scope bounded — loader fetches and validates; consuming features own their fallbacks
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)

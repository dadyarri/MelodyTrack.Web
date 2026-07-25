# Frontend Refactor Baseline

Captured on 2026-07-25 at the start of the Feature-Sliced Design v2.1
migration.

## Toolchain

- Node.js: 25
- npm: 11
- React: 19
- Vite: 8
- TypeScript native preview (`tsgo`): 7
- Vitest: 4
- Steiger with the Feature-Sliced Design plugin

The CI baseline is `npm run verify`, which runs:

1. Biome formatting
2. ESLint auto-fix
3. Biome lint
4. Steiger architecture validation
5. strict TypeScript checking
6. Vitest
7. the Vite production build

CI also runs `npm audit --omit=dev` before verification.

## Architecture Baseline

Steiger passes with narrowly scoped exceptions for architecture that predates
the migration:

- 24 existing ungrouped page slices exceed Steiger's default recommendation;
- 19 named legacy feature slices do not yet have FSD segments.

The exact exceptions live in `steiger.config.js`. They are intentionally tied
to existing paths so that new slices do not inherit them. Each exception should
be removed when that area is migrated.

## Automated Behavior Baseline

The current suite contains 20 tests covering:

- normalization and rejection rules for public API configuration;
- complete and partial authentication session persistence;
- allowed and denied protected-route behavior;
- injected HTTP authentication and basic API error normalization.

The next migration stages must expand this baseline before moving HTTP refresh,
offline replay, conflict resolution, or other business-critical behavior.

## Stage 2 Foundation

The app layer is divided by purpose into `config`, `entrypoint`, `router`, and
`styles`. Portal theming is composed at the router boundary, so pages no longer
import from the app layer.

Business-agnostic infrastructure now has stable shared public APIs:

- `shared/api` owns HTTP transport, error normalization, and generic conflict
  parsing; authentication injects its session adapter from above;
- `shared/config` owns validated public environment configuration;
- `shared/lib` owns generic date, money, download, draft, polling, pluralization,
  and keyboard helpers;
- `shared/ui` owns generic icons, charts, BBCode UI, summaries, and existing
  reusable primitives.

The remaining top-level `api`, `components`, and `utils` modules contain domain
contracts or feature behavior and are intentionally deferred to the entity and
feature migration stages.

## Production Bundle Baseline

The production build succeeds with route-level code splitting. The largest
generated JavaScript assets at the start of the migration are:

| Asset group | Raw size | Gzip size |
| --- | ---: | ---: |
| main index chunk | 383.10 kB | 119.84 kB |
| courses route | 342.71 kB | 111.97 kB |
| date utilities | 246.17 kB | 64.77 kB |
| React runtime | 189.64 kB | 59.65 kB |
| date picker | 167.46 kB | 36.41 kB |

These figures are a comparison point, not permanent budgets. Stage 6 should
inspect bundle composition and prevent course graph, rich-text editor, chart,
and other route-specific dependencies from leaking into unrelated navigation
paths.

## Configuration Baseline

`VITE_API_BASE_URL` is validated before the HTTP client is created. It accepts
an HTTP(S) URL for a separate API origin or a root-relative path for same-origin
deployments.

Real `.env` variants are ignored. Copy `.env.example` to an appropriate local
Vite environment file and configure the deployed value through the build
environment. The test runner supplies `/api` without relying on an ignored
file.

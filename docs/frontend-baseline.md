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
- `pages/portal-access` has one existing upward import from `app`;
- 19 named legacy feature slices do not yet have FSD segments.

The exact exceptions live in `steiger.config.js`. They are intentionally tied
to existing paths so that new slices do not inherit them. Each exception should
be removed when that area is migrated.

## Automated Behavior Baseline

The initial suite contains 15 tests covering:

- normalization and rejection rules for public API configuration;
- complete and partial authentication session persistence;
- allowed and denied protected-route behavior.

The next migration stages must expand this baseline before moving HTTP refresh,
offline replay, conflict resolution, or other business-critical behavior.

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

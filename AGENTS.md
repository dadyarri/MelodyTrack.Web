# Frontend Repository Guidelines

## Architecture

The frontend follows
[Feature-Sliced Design v2.1](https://feature-sliced.design/docs/get-started/overview).
All new code must follow FSD. Do not recreate the removed top-level `api`,
`components`, `layout`, or `utils` groupings.

Use these layers, from highest to lowest:

1. `app`: entrypoints, providers, routing, global configuration and styles.
2. `pages`: route-level composition.
3. `widgets`: large self-contained page sections.
4. `features`: reusable user actions that provide business value.
5. `entities`: business models and reusable domain representations.
6. `shared`: business-agnostic UI, API infrastructure, configuration and
   utilities.

The deprecated `processes` layer must not be introduced.

Imports may only point downward through the layer list. Slices must not import
other slices on the same layer. If two slices need orchestration, compose them
in a higher layer or move the genuinely shared concept lower. The FSD `@x`
notation is allowed only for an unavoidable entity-to-entity relationship and
must remain narrow.

`app` and `shared` contain technical segments directly. Every other layer
contains business slices, and each slice contains purpose-based segments such
as `ui`, `model`, `api`, `lib`, and `config`.

Every slice has a deliberate root `index.ts` public API. Cross-slice imports
must use that public API; files inside the same slice use explicit relative
imports. Avoid wildcard re-exports.

See [`docs/fsd-development-guide.md`](docs/fsd-development-guide.md) for
concrete placement and import examples.

Put code in the lowest layer that truthfully describes it:

- passive reusable domain display belongs to an entity, not a feature;
- an action such as creating a client or rescheduling an appointment belongs
  to a feature;
- route-specific composition stays in a page;
- business-agnostic primitives belong in shared.

Do not create empty layers, speculative abstractions, or single-file slices
just to make the directory tree resemble an example.

## Architecture Maintenance

The scoped exceptions in `steiger.config.js` document intentional page
granularity and focused single-consumer slices, not legacy import violations.
Do not broaden them to silence a layer, sibling-slice, public-API, or
segmentless-slice violation.

Preserve behavior while relocating code. Keep query keys and persisted storage
formats stable unless the change includes an explicit migration and tests.

## Browser Persistence

Follow [`docs/browser-storage-policy.md`](docs/browser-storage-policy.md).
New code must not use browser persistence APIs ad hoc.

- Keep access tokens and transient query/UI state in memory.
- Use `sessionStorage` only for small, non-sensitive tab recovery markers.
- Use `localStorage` only for small, non-sensitive device preferences.
- Put durable user work behind the user-scoped, versioned,
  runtime-validated `useDurableForm` adapter backed by IndexedDB.
- Never persist credentials or secret-bearing URLs outside a Secure, HttpOnly
  cookie.

Business storage schemas belong to the entity or feature that owns the data.
Shared code may provide storage mechanics but must not become a global
business-data cache.

## Mobile Browser Support

Follow [`docs/mobile-browser-support.md`](docs/mobile-browser-support.md).
The supported baseline is iOS Safari and Safari 16.4+, Chrome and Edge 109+,
and Firefox 115+. Keep Browserslist, Vite JavaScript/CSS targets, PostCSS, and
the Lightning CSS compatibility check aligned when changing that baseline.

Mobile fixes shared by multiple routes belong in
`src/app/styles/mobile-compatibility.css` or the visual-viewport hook. Prefer
standards-based fallbacks and capability queries; do not add user-agent checks
or scatter WebKit workarounds across route styles. At compact widths, preserve
16px form-control text, 44px primary touch targets, bounded internal scrollers,
safe-area padding, and zero document-level horizontal overflow.

## Verification

Run `npm run verify` before handing off frontend changes. It checks formatting,
Biome, ESLint, FSD architecture boundaries, browser-targeted CSS, strict
TypeScript, unit tests, Chromium viewport/visual tests, WebKit interaction
tests, and the production build. Chromium uses a system executable when
available; otherwise install it with `npx playwright install chromium` or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. On Arch-based hosts, the WebKit command
runs the exact matching official Playwright container because upstream WebKit
binaries target supported Linux distributions.

Use `npm run test:watch` while developing tests. New business rules, storage
migrations, auth/session behavior, and durable-form behavior require tests.

Architecture violations are checked with Steiger. A new violation must be fixed
in code, not silenced in configuration.

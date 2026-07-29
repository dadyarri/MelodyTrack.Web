# Mobile Browser Support

## Support baseline

The frontend supports these minimum browser versions:

- iOS Safari 16.4 and Safari 16.4;
- Chrome and Edge 109;
- Firefox 115.

`package.json` is the source of truth for the browser matrix. Vite uses an
aligned JavaScript target and Lightning CSS production minification target,
PostCSS runs Autoprefixer, and `npm run check:css-compat` compiles every source
stylesheet against the matrix. A baseline change must update and verify all of
those settings together.

## Shared mobile mechanics

`src/app/styles/mobile-compatibility.css` owns cross-route compact layout and
overlay behavior. It provides safe-area variables, dynamic viewport fallbacks,
contained modal/drawer/picker scrolling, 16px compact form text, 44px primary
touch targets, long-text wrapping, and bounded table overflow. Route styles
should contain only route-specific responsive composition.

`useVisualViewportCssVariables` publishes the live visual viewport dimensions
and offsets as CSS variables. Modals use them to stay within the visible area
when browser chrome or the software keyboard changes the viewport. The HTML
viewport keeps user zoom enabled and opts into safe-area coordinates with
`viewport-fit=cover`.

At compact widths, selection and date/time controls expose read-only inputs
with `inputmode=none`. Opening them first dismisses any active text keyboard,
then presents the options as a fixed visual-viewport sheet. Date-time panels
stack the calendar and shortened time columns vertically, with scrolling kept
inside the sheet. Desktop widths retain normal searchable and editable picker
behavior.

Do not use user-agent detection for layout. Prefer CSS fallbacks, `@supports`,
and the Visual Viewport API. Any remaining WebKit-specific declaration belongs
in the shared compatibility stylesheet with a regression test.

## Route audit inventory

Every application route is represented by one of the automated responsive
families:

| Family | Routes and workflows |
| --- | --- |
| Authentication | `/login`, `/restore`, `/portal/access`, `/portal/access/:token`, and the `/invite/:inviteCode` redirect |
| Lists and management | `/clients`, `/audit`, `/services`, `/payments`, `/expenses`, `/expense-categories`, `/client-sources`, `/tasks`, and `/users` |
| Dashboard and analytics | `/`, `/revenue`, `/price-changes`, `/appointments-stats`, `/clients-stats`, `/payments-stats`, and `/expenses-dashboard` |
| Schedule | `/schedule` and `/portal/schedule` |
| Course workspace | `/courses` |
| Profile | `/profile` |
| Client portal shell | `/portal` |

The responsive browser suite exercises every family at 320, 375, 390, and 430
CSS pixels in portrait and at 568 by 320 in landscape. The 320px case asserts
that the document scroll width never exceeds its viewport. Wide tables retain
bounded horizontal scrolling, but grow with their content so the page remains
the only vertical scroller. OTP and recovery-code controls keep usable touch
targets and wrap long codes instead of squeezing their fields.

## Automated verification

- `npm run check:css-compat` checks development-source CSS against the declared
  browser matrix.
- `npm run test:browser` runs responsive families, long Russian labels,
  increased text size, validation errors, reduced motion, dark mode, visual
  snapshots, and document-overflow assertions in Chromium.
- `npm run test:webkit` runs compact modal, form, select, date-picker, dropdown,
  and drawer interactions in WebKit in portrait and landscape.
- `npm run build` verifies the aligned production JavaScript and Lightning CSS
  transforms.
- `npm run verify` runs the complete frontend gate.

## Real iPhone release check

Desktop emulation and Playwright WebKit cannot reproduce every iPhone keyboard,
safe-area, or browser-chrome behavior. Before a release that changes navigation,
forms, overlays, schedules, tables, or viewport code, verify on a supported
physical iPhone in portrait and landscape:

For local testing, run Vite with `--host` and keep `VITE_API_BASE_URL=/api`.
Vite forwards those same-origin requests to the locally bound backend through
`MELODY_TRACK_API_PROXY_TARGET`; do not point the phone directly at localhost
or a development-only API port.

1. Open login, password recovery, a list page, schedule, course workspace,
   profile, and client portal at native page scale.
2. Focus each input type and confirm Safari does not zoom or leave the page
   shifted after the keyboard closes.
3. Open and operate a modal, drawer, select, date/time picker, menu, and
   validation-error state with the keyboard visible.
4. Confirm browser chrome, a display cutout, and the home indicator do not cover
   primary content or actions.
5. Increase system text size, enable dark mode and reduced motion, rotate the
   device, and repeat the document-overflow check.

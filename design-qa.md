# Dashboard design QA

- Source visual truth: `dashboard.png`
- Implementation: `http://127.0.0.1:4321/company/dashboard`
- Implementation screenshot: not captured
- Viewport: source image is 1680 × 943 px; intended desktop viewport is 1680 × 943 CSS px
- Source and implementation pixels: implementation evidence unavailable; no density normalization performed
- State: company dashboard, authenticated company-admin data state, desktop layout

## Full-view comparison evidence

The source image was opened and used to align the dashboard composition: 276 px sidebar, 84 px top bar, four KPI cards, and the chart plus Today’s Focus row. Per the latest user instruction, the lower three-card row was removed so the two primary panels remain fully visible without clipped outlines. The local implementation could not be opened in the required in-app browser, so a rendered side-by-side comparison was not possible.

## Focused-region comparison evidence

Not performed because the implementation screenshot could not be captured.

## Findings

- [P1] Rendered visual comparison is blocked.
  Location: local dashboard route.
  Evidence: the source visual is available, but the required in-app browser returned `Browser is not available: iab`, so no implementation screenshot was produced.
  Impact: exact typography, wrapping, icon fidelity, spacing, and viewport fit cannot be visually certified from this environment.
  Fix: open the local route in the user’s browser and compare at 1680 × 943 before final live release.

## Comparison history

- Initial source inspection: target composition identified; no browser-rendered implementation evidence available.
- Revised layout: shell width, desktop rows, KPI grid, chart/focus row, and compact-height scrolling were aligned in code; post-fix screenshot remains unavailable because the in-app browser is unavailable.

## Implementation checklist

- [x] Match the supplied dashboard composition in the local implementation.
- [x] Remove the lower cards and preserve complete Revenue vs Expenses and Today’s Focus outlines.
- [x] Keep Supabase and live deployment unchanged.
- [x] Build and automated tests pass.
- [ ] Capture and compare the rendered local dashboard at 1680 × 943.

## Follow-up polish

- Validate the final dashboard with the real authenticated data state, especially long project names and invoice totals.

final result: blocked

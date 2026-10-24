---
version: alpha
colors:
  financeInk: '#10274b'
  primary: '#175de8'
  financeBackground: '#f5f8fd'
  financeLine: '#e5eaf3'
  financeWhite: '#ffffff'
typography:
  finance:
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif'
rounded:
  financePanel: '15px'
  financeControl: '8px'
omitted:
  - section: spacing
    reason: Preserve the supplied standalone document's established spacing.
  - section: components
    reason: Existing Astro components and standalone HTML remain the runtime owners.
---

# TechMigos design context

## Overview
The marketing site retains its Astro/Tailwind identity. The finance workspace is
the user-supplied `Techmigos_Finance_Standalone.html`, preserved as the accepted
design for Vinay and Vishal. Its ledger density, blue controls, white panels and
existing financial colors remain authoritative. No redesign is requested.

## Colors
The standalone document's `:root` owns finance CSS tokens. Login is the entry
surface and follows those values through its scoped styles. Marketing tokens
remain owned by `src/styles/global.css` and existing shared components.
The public `/pay` handoff follows the finance entry palette and compact white
card, with readable recipient/amount details, a high-contrast QR and blue action.

## Typography
Preserve the standalone system/Inter stack and the marketing site's fonts.
Login uses the inherited website stack, with 16px inputs for phone usability.
Invoice documents follow the user's `TM_INV21-1.pdf`: landscape white paper,
Arial type, black grid borders, grey service/total rows, centered business header,
logo, bill-to and invoice metadata, received/balance, notes, terms, UPI QR and
signature area. Both projects use this layout with independent saved details.

## Layout
`Navbar.astro` owns the compact Login link, visible on desktop and mobile.
`login.astro` owns the single-column sign-in form. `finance.astro` renders the
supplied complete HTML without the marketing shell or an iframe.

## Elevation & Depth
Finance panels retain the source document's subtle shadow and bordered panels.

## Shapes
Preserve 15px panels and 8px input/button corners on the finance entry screen.

## Components
The source document owns finance navigation, dialogs, forms, tables and toasts.
`src/scripts/finance-runtime.js` owns Firebase authentication and persistence.
`src/features/finance/cloud-ui.js` extends the original UI with Teams and scoped
member views. Team project access is separate from financial share percentages.
Login errors stay inline; controls have keyboard focus and pending states.

## Do's and Don'ts
Preserve the source finance calculations. Finance records now use Firebase;
server authorization owns access. Keep permission and mutation errors visible,
and acknowledge saves only after the backend accepts them.

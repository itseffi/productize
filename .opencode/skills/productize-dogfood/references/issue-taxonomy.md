# Dogfood Issue Taxonomy

Use this taxonomy for browser-driven exploratory QA of web apps.

## Severity

### P0: Release Blocker

The issue makes a core feature unusable, causes data loss, exposes sensitive
data, blocks authentication, prevents payment or critical completion, or creates
a blank/crashing app state.

Examples:

- blank page, crash loop, or fatal runtime error on a primary route
- form submission loses data or silently fails on a core flow
- users cannot log in, sign up, purchase, save, or complete the primary task
- security-sensitive data appears in page content, network output, or console logs

### P1: High Impact

The issue significantly impairs a key flow, but a workaround may exist.

Examples:

- primary button or navigation action does nothing
- valid input is rejected or valid results are missing
- critical content is absent, stale, or garbled
- uncaught JavaScript exception appears on a core page or after a core interaction
- key route links to a 404 or wrong destination

### P2: Medium Impact

The issue is noticeable and affects user experience, confidence, or reliability
without blocking the main flow.

Examples:

- layout misalignment, overlapping text, or responsive breakage
- images or media fail to load
- loading takes more than 3 seconds without feedback
- invalid input lacks useful validation feedback
- console warnings suggest deprecated, misconfigured, or unreliable behavior

### P3: Low Impact

The issue is polish-level and does not materially affect task completion.

Examples:

- typo, grammar issue, or inconsistent label
- minor spacing or alignment inconsistency
- placeholder text appears in a non-critical area
- favicon or secondary asset is missing
- non-sensitive debug logging remains in the console

## Categories

### Functional

Features do not work as expected: broken buttons, bad navigation, failed forms,
incorrect data, or incomplete flows.

### Visual

Presentation defects: broken layouts, overlapping elements, missing media,
z-index issues, truncation, or responsive failures.

### Accessibility

Access barriers: missing labels, keyboard traps, weak focus indicators, poor
contrast cues, missing meaningful alt text, or screen-reader incompatible
structure.

### Console

Browser console and runtime problems: uncaught exceptions, unhandled promise
rejections, failed requests, CORS errors, mixed content warnings, deprecations,
or production debug output.

### UX

The feature works but the experience is unclear: confusing navigation, missing
loading state, no action feedback, inconsistent interaction patterns, missing
confirmation, or poor recovery guidance.

### Content

Text, media, or information problems: typos, placeholder content, outdated
information, missing sections, broken external links, or misleading labels.

### Performance

Slow or unstable behavior: long loading without feedback, jank, repeated
requests, hydration delays, or interactions that feel blocked.

### Data

Data correctness or integrity concerns: stale values, inconsistent state,
incorrect calculations, missing records, duplicate submissions, or mismatched
backend/frontend data.

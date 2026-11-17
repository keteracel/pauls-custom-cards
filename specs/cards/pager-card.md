# Paul's Pager Card — Reference Spec

Reference spec for what `paul-pager-card` (`src/cards/pager-card/`) is supposed to do, so behavior isn't lost across sessions. This describes current, already-implemented behavior — not a plan.

## Purpose
Page-style navigation for wall touchscreens: a tall, thin arrow button on each screen edge (and horizontal swipes) step through an ordered set of views, e.g. a Weather section split into several screens that each fit without scrolling.

## Config Schema
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `pages` | string[] | one of `pages` / `previous` / `next` | — | Ordered navigation paths. The current page is found by matching `location.pathname` (query/hash and trailing slashes ignored) |
| `previous` | string | no | page before the current one | Overrides `pages` for the left arrow / swipe right |
| `next` | string | no | page after the current one | Overrides `pages` for the right arrow / swipe left |
| `swipe` | boolean | no | `true` | Horizontal swipe navigation |
| `offset_top` | number | no | `var(--header-height, 56px)` | Top of the arrows, in px from the top of the screen |

## Editor (`pager-card-editor.ts`)
`ha-form`: grid of `previous` + `next` (text), `swipe` toggle, `offset_top` (number box, px). Empty values are removed from the config. A hint says to use the code editor for `pages`.

## Rendering Behavior
- The card draws nothing in its grid cell (`getGridOptions`: full width, rows `auto`; `getCardSize` 0). In the card editor's preview (`preview` property) it shows a small `ha-card` summarising previous / next / swipe.
- The arrows are a separate element, `paul-pager-overlay`, appended to `document.body` so `position: fixed` is relative to the screen regardless of the dashboard's containers. It's removed when the card disconnects.
- Each arrow: 28px wide, from `offset_top + 12px` (plus safe-area inset) to 12px above the bottom, flush with the screen edge, rounded on the inner side, 85% card background, chevron icon in the secondary text colour; primary-colour tint on hover/press; focus outline. `aria-label` "Previous page" / "Next page".
- No left arrow without a previous page; no right arrow without a next page (no wrap-around).
- The overlay only shows while the card's own view is on screen: the path at connect time must match the current path (and be in `pages` when set). It re-checks on `location-changed` and `popstate`, so a view HA keeps attached in the background doesn't leave arrows behind.
- Navigation uses `custom-card-helpers`' `navigate` (in-app, pushes history).

## Swipe
- Window-level passive `touchstart` / `touchend` listeners, active only while the overlay is shown.
- A swipe counts when it's one finger, at least 60px horizontally, under 800ms, and more horizontal than vertical (|dx| ≥ 1.5 × |dy|). Left → next, right → previous.
- Ignored when it starts on or inside: `input`, `textarea`, `ha-slider`, `ha-control-slider`, `ha-chart-base`, dialogs (`ha-dialog`, `ha-adaptive-dialog`, `ha-more-info-dialog`), `ha-code-editor`, the arrows themselves, or anything with `role="slider"`.

## Validation (`setConfig()`)
- Needs `pages` (non-empty) or at least one of `previous` / `next`.
- `pages` must be a list of strings; `previous` / `next` strings; `offset_top` a number ≥ 0.

## Source files
- `src/cards/pager-card/pager-card.ts` (card + overlay, exports `computeTargets`)
- `src/cards/pager-card/pager-card-editor.ts`
- `src/cards/pager-card/types.ts`

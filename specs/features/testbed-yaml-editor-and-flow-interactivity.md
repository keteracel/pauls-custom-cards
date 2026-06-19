# Testbed YAML Editor & Flow Card Interactivity — Product Spec

## Problem & Goal
`testbed.html` is the local dev page used to preview `paul-gauge-card` and `paul-flow-card` outside Home Assistant. Today, checking how a card responds to a different config or entity state means editing JavaScript inside `testbed.html` and reloading the page. The Gauge Card has one interactive section (a slider), but the Flow Card has none — its entity states are hardcoded in a shared `flowHass` mock, so trying a different system state requires hand-editing that object.

Goal: every interactive section in the testbed lets you change a card's config and entity states live, in the browser, without touching source — config via an inline YAML editor, entity state via direct UI controls (for the Flow Card). This speeds up manual QA when changing card behavior.

## Users
Paul (repo owner/maintainer), the sole user of this dev-only tool, testing card changes locally before committing.

## Scope

### In scope
- A YAML editor panel to the right of the existing Gauge Card "Interactive — drag to change value" section, live-editing that section's card config.
- A new Flow Card interactive section with per-entity controls (toggles for binary/switch entities, number inputs for temperature sensors) that drive a live `paul-flow-card` instance.
- A YAML editor panel to the right of that new Flow Card section, kept in sync with the per-entity controls (editing either updates the other and the rendered card).
- Inline error display when typed YAML is invalid, without breaking the currently rendered card.

### Out of scope
- YAML editors on the *static* example sections (the five static gauge values, "Simple"/"Full system" flow examples) — those stay hardcoded.
- Persisting edited YAML/config across page reloads.
- Any changes to the actual card source (`src/cards/...`) — this is testbed-only tooling.
- Shipping CodeMirror (or any editor library) as a project dependency — it's loaded via CDN in `testbed.html` only.

## User Stories
1. As Paul, I want to edit a gauge card's YAML config in the testbed and see both live gauge cards update immediately, so I can try color/level changes without touching JS.
2. As Paul, I want a Flow Card section where I can toggle pump/valve switches and adjust temperature values, so I can see the pipe animation and node displays react to different system states.
3. As Paul, I want the Flow Card section's YAML editor and its toggle controls to stay in sync, so I can use whichever input method is faster for a given change and trust the other reflects it.

## Acceptance Criteria
- [ ] Editing the YAML next to the Gauge Card interactive section (e.g. changing a level's `color` or `min`/`max`) updates both live gauge cards within ~300ms, without a page reload.
- [ ] Typing invalid YAML in either editor shows an inline error message and the affected card keeps rendering its last valid state (does not blank out or throw).
- [ ] A new Flow Card interactive section exists, separate from the existing static "Simple"/"Full system" examples, with its own live `paul-flow-card` instance.
- [ ] Toggling a binary_sensor/switch control (e.g. pump running, a zone valve) immediately changes that pipe's animated/grey state on the live flow card.
- [ ] Adjusting a temperature number input immediately updates the displayed temperature on the corresponding node.
- [ ] Changing a toggle/number control updates the displayed text in the adjacent YAML editor to reflect the new state.
- [ ] Editing the YAML editor's `nodes`/`edges` content directly updates the rendered flow diagram.
- [ ] Changing a node's `entities` mapping in the YAML editor (e.g. pointing `state` at a different entity id) regenerates the toggle/number controls to match the new mapping.
- [ ] No infinite update loop occurs when a YAML config edit triggers control regeneration.
- [ ] `npm run build` and `npm run typecheck` are unaffected — `testbed.html` is not part of the build pipeline.

## Open Questions
Resolved:
- Flow Card YAML editor shows **config only** (`nodes`/`edges`) — matches what a real HA user edits; entity state changes stay driven by the toggle/slider controls, not the YAML editor.
- Gauge Card interactive section gets **two separate YAML editors**, one per live card (distinct vs gradient), so each can be tweaked independently.

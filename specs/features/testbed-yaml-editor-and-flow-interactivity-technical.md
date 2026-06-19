# Testbed YAML Editor & Flow Card Interactivity — Technical Spec

> Product spec: specs/features/testbed-yaml-editor-and-flow-interactivity.md
> Card reference: specs/cards/gauge-card.md, specs/cards/flow-card.md
> Tracking issues: GitHub #12 (gauge YAML editors), #13 (flow controls section), #14 (flow YAML editor)

## Architecture Overview
Everything lives in `testbed.html`, a dependency-free static file (no bundler). The only new external dependency is CodeMirror 5, loaded via CDN `<script>`/`<link>` tags in `<head>`, the same pattern already used for the MDI font.

```
testbed.html
├── <head>: existing HA element stubs + MDI font + CodeMirror 5 (mode/yaml) — all CDN
├── Gauge Card section (existing)
│   ├── slider (existing) ──┐
│   ├── live-distinct card ◄┤── two independent CodeMirror instances,
│   ├── live-gradient card ◄┤   one per card, each YAML = that card's full config
│   └── YAML editor × 2 ────┘
├── Flow Card interactive section (new)
│   ├── per-entity controls (toggles + number inputs)
│   ├── local hass mock (not the shared static flowHass)
│   ├── live paul-flow-card instance
│   └── one CodeMirror instance — YAML = config only (nodes/edges)
└── existing static sections (gauge grids, Flow "Simple"/"Full system") — untouched
```

Shared helper: a single `createYamlEditor(container, initialObj, onApply)` function used by all three editors (2 gauge + 1 flow), so debounce/parse/error-display logic isn't duplicated.

```
createYamlEditor(container, initialObj, onApply):
  - instantiate CodeMirror(container, { mode: 'yaml', theme matching dark testbed bg })
  - dump initialObj to YAML text via js-yaml (also CDN) to seed the editor
  - on CodeMirror 'change', debounce 300ms:
      try: parsed = yaml.load(editorText)
           onApply(parsed)        // caller's setConfig()/state-mutation logic
           clear error
      catch (e): show inline error text under editor, do NOT call onApply
  - returns { setText(obj) }      // used to push external changes (e.g. from a toggle) into the editor
```

This gives every consumer the same contract: feed it a JS object, get a callback when the user produces a valid one, and a `setText` escape hatch for the reverse direction (control → editor).

## Data Model

No persistent data model — everything is in-memory DOM/JS state, scoped per section:

| Section | Card instance(s) | Source of truth for entity state | YAML editor content |
|---|---|---|---|
| Gauge "Interactive" (existing) | `live-distinct`, `live-gradient` | slider value → shared `LIVE_ENTITY` hass object (existing `updateLive()`) | Each card's full `GaugeCardConfig` (entity, levels, color_mode, etc.) — independently editable per card |
| Flow "Interactive — toggle entity states" (new) | one `paul-flow-card` | new local `flowControlsHass` object, mutated by toggle/number controls | The card's `FlowCardConfig` (`nodes`/`edges`) only — **not** entity states, per resolved open question |

Flow section's local entity set (mirrors a trimmed version of the existing "Simple" example so labels/types are already familiar):
```
binary_sensor.heat_pump_running   (toggle)
binary_sensor.pump_running        (toggle)
binary_sensor.tank1_valve         (toggle)
switch.zone1_valve                (toggle)
sensor.hp_flow_temp               (number input, °C)
sensor.hp_return_temp             (number input, °C)
sensor.tank1_temp                 (number input, °C)
climate.zone1                     (toggle: off/heat, since climate.state drives zone "on")
```

## API / Interface Contract

**`createYamlEditor(container: HTMLElement, initialObj: object, onApply: (obj: object) => void): { setText(obj: object): void }`**
- `container`: a `<div>` placed in the new layout (see below) that CodeMirror attaches to.
- `onApply`: called only with successfully-parsed YAML; caller decides what to do (`card.setConfig(obj)` for gauge/flow config editors).
- `setText`: caller invokes this when state changes via a non-editor control, so the editor's displayed text stays current. Must not itself trigger `onApply` (no feedback loop) — implemented by setting a flag that the 'change' handler checks and skips if the change originated from `setText`.

**Per-entity control → card update (Flow section)**
- Each toggle/number input has a `data-entity` attribute and an `oninput`/`onchange` handler that:
  1. Mutates `flowControlsHass.states[entityId].state` (and `.attributes` for climate's `current_temperature`).
  2. Reassigns `card.hass = flowControlsHass` (new object reference, since the card likely does a reference/shallow-diff check per `specs/cards/flow-card.md`'s "skip re-render if no watched entity state changed").

**Config YAML → control regeneration (Flow section)**
- `renderFlowControls(config: FlowCardConfig)` — derives the control list purely from `config.nodes[].entities` (one control per mapped entity, deduped by entity id), clears and rebuilds the controls container, and rebinds each control's `data-entity`/`oninput` to read/write `flowControlsHass`.
- Called from the YAML editor's `onApply` after `card.setConfig()` succeeds.
- Must NOT call `yamlEditor.setText()` — control regeneration only changes which DOM controls exist, never the YAML text itself, so there's nothing to feed back. The reentrancy guard exists for defense-in-depth (so a future change to this function calling `setText` doesn't silently introduce a loop) — see Risks.

**Layout (CSS)**
- New `.interactive-row` flex/grid container: card+controls on the left, YAML editor (`.yaml-editor` div, fixed width ~360px, monospace, dark theme matching CodeMirror's available dark theme e.g. `material-darker`) on the right. Applied to both the existing Gauge interactive section (restyled) and the new Flow interactive section.

## Implementation Plan
1. **CDN includes + shared YAML helper** (~S) — add CodeMirror 5 + yaml mode + js-yaml CDN tags to `<head>`; write `createYamlEditor()` as an inline `<script>` module-level function reusable by later sections. No visible UI change yet.
2. **Gauge Card section: two YAML editors** (~M, maps to issue #12) — restyle the existing "Interactive" section into the left/right layout; instantiate two `createYamlEditor()` calls (one per live card) seeded with each card's current config; wire `onApply` to that card's `setConfig()`. Keep the existing slider working alongside (slider still drives entity value; YAML still drives levels/color_mode/etc — both apply to the same live cards).
3. **Flow Card interactive section: markup + controls + local hass** (~M, issue #13) — new `<section>`, trimmed node/edge set, toggle/number controls per entity listed above, wired to mutate `flowControlsHass` and reassign `card.hass`.
4. **Flow Card section: YAML editor for config** (~M, depends on #3, issue #14) — `createYamlEditor()` seeded with the section's `FlowCardConfig`; `onApply` calls `card.setConfig()` **and** regenerates the toggle/number controls from the new config's `nodes[].entities` mappings (control set and `data-entity` bindings must follow whatever entities the YAML now references). Regenerating controls must not itself call `editor.setText()` or otherwise re-trigger `onApply` — guard with a reentrancy flag (see Risks) so an apply-driven control rebuild can't loop back into another apply.

   Two-way sync is *not* needed for entity **state** (toggles still only mutate `flowControlsHass`, the editor never shows state) — the guard is specifically about config-driven control regeneration, not state sync.
5. **Manual verification pass** — open `testbed.html` directly in a browser (file:// is fine, no server needed) and walk every acceptance criterion in the product spec.

Note: "config only" for the Flow YAML editor means controls and the editor don't write to the *same* data (state vs. config), but they're not fully independent — editing a node's `entities` mapping in YAML changes which entity the corresponding control should bind to. So control regeneration on `onApply` is still required, and still needs a reentrancy guard to avoid looping back into the editor.

## Technical Risks & Trade-offs
- **CodeMirror 5 via CDN, no version-pinned local copy**: acceptable for a local dev-only tool; pin to an exact CDN version (not `@latest`) to avoid the testbed silently breaking on an upstream release.
- **Two YAML editors for Gauge vs. one for Flow**: slight inconsistency in editor count per section, but matches the actual UI shape (gauge section already shows two cards side by side; flow section shows one). Considered a single merged gauge editor (rejected by user — wanted independent tweaking per card).
- **Flow YAML editor is config-only, not state**: means you still can't drive entity states from YAML in this section — only from the toggle controls. Accepted trade-off (resolved open question) since it mirrors real HA usage (YAML edits config, not live state) and avoids the two-way-sync complexity entirely.
- **Reference equality re-render checks**: both cards reportedly skip re-render when watched entity state is unchanged (per `specs/cards/*.md`). Control handlers must always assign a *new* hass object (or new nested state object) rather than mutating in place and reassigning the same reference, or updates may not visibly apply.
- **Config-driven control regeneration loop**: editing a node's `entities` mapping in the Flow YAML editor changes which entity a control should bind to, so `onApply` must rebuild the controls. If a future change makes that rebuild call back into the editor (e.g. to reformat/normalize the YAML text), it must go through `setText`'s reentrancy flag — otherwise a rebuild-triggered `setText` could re-fire the CodeMirror `change` listener and re-invoke `onApply`, looping. Guard this even though the current design doesn't call `setText` from the rebuild path, since it's an easy mistake to introduce later.

## Out of Scope (Technical)
- No build-step / bundler changes — `testbed.html` is not part of `rollup.config.js` and stays that way.
- No persistence (localStorage, URL state) of edited YAML across reloads.
- No changes to `src/cards/**` card source — this work is testbed-only.
- No YAML editors added to the static example sections.

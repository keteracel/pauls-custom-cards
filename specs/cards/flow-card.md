# Paul's Flow Card — Reference Spec

Reference spec for what `paul-flow-card` (`src/cards/flow-card/`) is supposed to do, so behavior isn't lost across sessions. This describes current, already-implemented behavior — not a plan.

## Purpose
Visualizes a heating/cooling system as a pipe-network diagram: nodes (heat pump, pump, tank, zone, valve, junction) connected by pipes ("edges"). Node fill color and pipe animation reflect live entity state; temperature overlays show real-time readings. Used to diagram multi-zone heating circuits with a live system visualization, e.g. ground-source heat pump → buffer tank → zone radiators.

## Config Schema
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | string | no | — | Card header |
| `url` | string | no | unset | When set, the card becomes clickable and tapping/activating it navigates here; `/`-prefixed paths use in-app HA navigation (no reload), other values are treated as a full URL (`window.location.assign`) |
| `height` | number | no | `300` | SVG container height (px); must be > 0, finite |
| `cell_size` | number | no | `120` | **Deprecated** — fallback for either axis when `cell_width`/`cell_height` are unset; must be > 0, finite |
| `cell_width` | number | no | `cell_size` ?? `120` | Grid column width (px) for node layout; must be > 0, finite |
| `cell_height` | number | no | `cell_size` ?? `120` | Grid row height (px) for node layout; must be > 0, finite |
| `nodes` | `FlowNode[]` | yes, ≥1 | — | See below |
| `edges` | `FlowEdge[]` | yes (array, may be empty) | — | See below |

`FlowNode`:
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Must be unique — duplicate throws at `setConfig()` |
| `type` | enum | yes | One of `heat_pump`, `pump`, `tank`, `zone`, `valve`, `junction`; invalid type throws |
| `label` | string | no | Rendered below the node shape |
| `position` | `[col, row]` or `{col, row}` | yes | Grid coordinates; both forms normalized internally |
| `entities` | `NodeEntities` | no | See below |

`NodeEntities` (all optional, semantic role → entity id):
| Field | Role |
|---|---|
| `state` | binary_sensor — on/off for pump/valve/heat_pump; ignored for `tank` (always rendered active) |
| `temperature` | sensor — numeric temp display (tank/generic) |
| `temp_in` / `temp_out` | sensor — heat pump inlet/outlet, rendered as "in→out°" |
| `climate` | climate entity — zone target; `state` in `heat`/`cool`/`heat_cool` marks zone active |
| `valve` | switch/binary_sensor — zone valve on/off |

`FlowEdge`:
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `from` / `to` | string | yes | — | Must reference existing node ids — orphan edges throw |
| `active_entity` | string | no | — | binary_sensor that directly overrides edge active/inactive state |
| `color` | string | no | `'#ff6600'` | Hex pipe color when active |
| `anchor_start` | `'N' \| 'S' \| 'E' \| 'W'` | no | auto-picked | Overrides which side of the `from` node the pipe leaves from; invalid value throws |
| `anchor_end` | `'N' \| 'S' \| 'E' \| 'W'` | no | auto-picked | Overrides which side of the `to` node the pipe enters; invalid value throws |

## Editor (`flow-card-editor.ts`)
Only exposes `title` (text), `url` (text), and `height` (number, 100–1000px slider) via `ha-form`. **Nodes and edges must be hand-edited in the card's YAML** — this is intentional; no UI form exists for grid layout or entity mapping.

## Rendering Behavior
- SVG viewBox sized to `(maxCol+1) × cell_width` by `(maxRow+1) × cell_height`.
- **Node shapes**: heat_pump = rounded rect, tank = tall rect, pump = circle, valve = diamond, zone = pentagon, junction = tiny dot.
- **Node fill**: `primary-color` if "on", else `card-background-color`.
- **Node on/off logic**:
  - `junction` → always on (passthrough).
  - `tank` → always on/active — renders with the active style regardless of `entities.state`; tanks have no on/off concept and are always present, displaying their temperature.
  - `zone` → valve state if defined, else `climate.state` in `heat`/`cool`/`heat_cool`, else off.
  - everything else → `entities.state` entity's state === `'on'`.
- **Temperature display**: heat_pump shows "in→out°" if both available else whichever is present; zone shows climate `current_temperature` or its `temperature` sensor; other nodes show their `temperature` sensor if set.
- **Edges**: orthogonal (Manhattan-style) path with soft curved corners, not full right angles. Each end anchors to whichever side (N/S/E/W) of the node faces the other node, auto-picked from relative `(col, row)` position by default — override per edge with `anchor_start`/`anchor_end`. When both ends are on the same axis (e.g. both E/W) the path bows through a midpoint; when they're on perpendicular axes (only possible via an explicit override) it's a single-corner path. No automatic conflict avoidance: if two edges would naturally share the same `(node, side)` anchor and overlap, resolve it manually via `anchor_start`/`anchor_end` (see #25). Active = dashed (12px/8px), animated 0.8s CSS keyframe loop, colored per `edge.color`. Inactive = solid gray `#444`, no animation.
- **Edge z-order**: inactive edges render first, active edges last (stable-sorted, preserving config order within each group), so active pipes always paint on top where they cross inactive ones (#33). Nodes render above all edges.
- **Edge active logic**:
  - If `active_entity` set → active iff that entity's state === `'on'`.
  - Else → active iff both `from` and `to` are "passable" (on, or a `tank`/`junction`, which are always passable) AND the path either ends at `to` (no outgoing edges — a terminus, e.g. a tank with no modeled outflow) or reaches an active node downstream — recursing through chains of tanks/junctions.
  - `tank`/`junction` passthrough: pipe animation through a tank or junction depends on it leading somewhere active downstream, or being a dead-end (still counts as active if fed), not on any on/off state of the tank/junction itself.
- Skips re-render if no watched entity state changed (perf).
- **Click-through**: if `url` is set, `ha-card` gets `role="button"`, `tabindex="0"`, a pointer cursor, and responds to click/tap or `Enter` keypress by navigating — in-app (`navigate()`, no reload) for `/`-prefixed paths, otherwise `window.location.assign()`. If `url` is unset (the default), the card has none of this — no click handler, no `role`/`tabindex`, no pointer cursor; it's inert, identical to pre-#36 behavior.

## Validation (`setConfig()`)
- ≥1 node; `edges` array present (can be empty).
- Node ids required and unique.
- Node types must be in the valid set.
- Every edge's `from`/`to` must reference an existing node id.
- `anchor_start`/`anchor_end`, if set, must be one of `N`, `S`, `E`, `W`.
- `cell_size`/`cell_width`/`cell_height`/`height` positive and finite; node `position` coordinates finite.
- `url`, if set, must be a string; empty string and `null` are treated as unset (card not clickable) so a cleared editor field can't break the card.

## Source files
- `src/cards/flow-card/flow-card.ts`
- `src/cards/flow-card/flow-card-editor.ts`
- `src/cards/flow-card/types.ts`

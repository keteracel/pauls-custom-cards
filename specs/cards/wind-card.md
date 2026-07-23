# Paul's Wind Card — Reference Spec

Reference spec for what `paul-wind-card` (`src/cards/wind-card/`) is supposed to do, so behavior isn't lost across sessions. This describes current, already-implemented behavior — not a plan.

## Purpose
Displays wind as a compass: a rotating needle for **direction** with the current **speed** in the centre, plus optional secondary readouts for gust (max) speed, average speed, and average direction. Designed for weather dashboards where a single linear gauge can't represent a heading + magnitude together. Implemented with inline SVG (like the flow card).

## Config Schema
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | string | no | — | Card header (rendered by `ha-card`) |
| `speed_entity` | string | yes | — | Numeric wind-speed sensor |
| `direction_entity` | string | yes | — | Direction sensor: degrees (0–360) **or** a cardinal string (`N`, `NNE`, …) |
| `gust_entity` | string | no | — | Max / gust speed; shown as a "Gust" readout |
| `average_speed_entity` | string | no | — | Shown as an "Avg" readout |
| `average_direction_entity` | string | no | — | Drawn as a second, dimmed/dashed needle + an "Avg dir" readout |
| `unit` | string | no | speed entity's `unit_of_measurement` | Override the speed unit label |
| `decimals` | number | no | `1` | Speed decimal places; integer 0–10 |
| `show_cardinal` | boolean | no | `true` | Show N/E/S/W labels on the rose |
| `direction_from` | boolean | no | `true` | `true` = needle points where wind comes **from** (meteorological); `false` = points downwind |

## Editor (`wind-card-editor.ts`)
Visual `ha-form` editor in three grouped sections:
- **Required** — title, plus a two-column grid of `speed_entity` / `direction_entity` (entity selectors, `sensor` domain).
- **Optional entities** — grid of gust / average-speed / average-direction pickers.
- **Display** — unit + decimals (grid), `show_cardinal`, `direction_from` toggles.

Entity selectors use `ha-form`'s `entity` selector (renders in custom card editors on HA Frontend ≥20260325.7; a standalone `ha-entity-picker` does not). `type: 'grid'` schema entries are layout-only and keep data flat. No hand-editing of YAML is required for normal use.

## Rendering Behavior
- **Direction parsing** (`_parseDirection`): tries `Number()` first, normalising to 0–360 (`((n % 360) + 360) % 360`, so negatives and >360 wrap). Falls back to a 16-point cardinal lookup (case-insensitive). Anything else → `null` (needle hidden, cardinal shown as `—`).
- **Cardinal readout** (`_degToCardinal`): rounds the bearing to the nearest of 16 points (22.5° each).
- **Needle bearing** (`_needleBearing`): honours `direction_from` — when `false` the drawn bearing is `bearing + 180`.
- **Compass**: SVG `viewBox 0 0 200 200`; outer ring, tick marks every 30° (major at N/E/S/W), optional cardinal labels (N highlighted in the error/accent colour). Main needle = accent (`--primary-color`) arrow + muted counterweight tail; average needle = dashed/dimmed accent. A central hub disc sits over the needle pivot, behind the readout text.
- **Centre readout**: current speed (large) + unit + `cardinal · degrees°`.
- **Secondary readouts**: only rendered for configured optional entities — Avg (speed), Avg dir, Gust — each `—` when the entity is missing/non-numeric.
- **Colours** come from HA theme CSS vars, so the card adapts to light/dark themes.
- Speeds are formatted with `toFixed(decimals)`; non-numeric speed shows `—`.

## Validation (`setConfig()`)
- `speed_entity` and `direction_entity` are required.
- `decimals`, when set, must be an integer 0–10; `null`/`undefined` (cleared editor field) falls back to `1`.
- Missing `speed_entity` or `direction_entity` state → error card listing the missing entity IDs.

## Performance
- `_watched` holds all configured entity IDs; `shouldUpdate` skips re-renders unless one of them changed.

## Source files
- `src/cards/wind-card/wind-card.ts`
- `src/cards/wind-card/wind-card-editor.ts`
- `src/cards/wind-card/types.ts`

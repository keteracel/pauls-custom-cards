# Paul's Gauge Card — Reference Spec

Reference spec for what `paul-gauge-card` (`src/cards/gauge-card/`) is supposed to do, so behavior isn't lost across sessions. This describes current, already-implemented behavior — not a plan.

## Purpose
Displays a single numeric sensor value with a full-bleed background card whose color dynamically changes based on configurable value ranges ("levels"). Used for at-a-glance temperature/humidity/etc. monitoring with visual thresholds. Renders as a centered vertical stack: icon → large value → optional name, all on a colored background.

## Config Schema
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `entity` | string | yes | — | Sensor entity ID |
| `name` | string | no | entity friendly name | Override display name |
| `unit` | string | no | entity's `unit_of_measurement` | Override unit suffix |
| `decimals` | number | no | `2` | Decimal places shown; always padded, e.g. 21.50 |
| `show_name` | boolean | no | `true` | Show name below value |
| `show_unit` | boolean | no | `true` | Show unit suffix |
| `color_mode` | `'distinct' \| 'gradient'` | no | `'distinct'` | distinct = flat color per level; gradient = interpolate between consecutive level colors based on value position |
| `levels` | `GaugeLevelConfig[]` | yes, ≥1 | — | See below |

`GaugeLevelConfig`:
| Field | Type | Required | Notes |
|---|---|---|---|
| `min` | number | yes | Lower bound, inclusive |
| `max` | number | yes | Upper bound, exclusive |
| `icon` | string | yes | MDI icon name |
| `color` | string | yes | Hex color (`#RGB` or `#RRGGBB`); must be valid hex for gradient mode |
| `label` | string | no | Not currently rendered anywhere |

## Editor (`gauge-card-editor.ts`)
Exposes via `ha-form`: entity selector, name text input, color_mode dropdown, show_name/show_unit toggles, plus a per-level editor (min/max/icon/color/label with add/remove). Nothing requires hand-editing YAML for normal use — this card's editor is comprehensive, unlike Flow Card's.

## Rendering Behavior
- Levels sorted ascending by `min` once at `setConfig()` and cached.
- Value lookup: level where `value >= min && value < max`; if the value falls in a gap between levels, returns the level with the highest `max` below the value (avoids unintuitive jumps to the wrong level).
- Color: `distinct` → level's static color. `gradient` → RGB-interpolate between current level's color and the next level's color, normalized by `(value - min) / (max - min)`.
- Numeric values are formatted with metric suffix notation: `k`/`M`/`B`/`T` at 1e3/1e6/1e9/1e12, using the largest tier whose threshold is ≤ the absolute value. If rounding the scaled value to `decimals` places pushes it up to the next tier (e.g. 999999.999 → "1000.00k"), the value is promoted to the next larger tier and reformatted. Sign is preserved (e.g. "-45.60k"). Level matching and color computation always use the raw, unformatted value. Non-numeric states are shown raw, unformatted.
- Missing/non-numeric entity state → shows a help icon with "Entity not found".
- Skips re-render if the watched entity's state hasn't changed (perf).

## Validation (`setConfig()`)
- `entity` required; `levels` must have ≥1 entry; every level's `min`/`max` must be finite numbers with `min < max`.
- Hex color validated (3 or 6 char); invalid hex in gradient mode falls back to the level's flat color with a console warning.

## Source files
- `src/cards/gauge-card/gauge-card.ts`
- `src/cards/gauge-card/gauge-card-editor.ts`
- `src/cards/gauge-card/types.ts`

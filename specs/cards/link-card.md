# Paul's Link Card — Reference Spec

Reference spec for what `paul-link-card` (`src/cards/link-card/`) is supposed to do, so behavior isn't lost across sessions. This describes current, already-implemented behavior — not a plan.

## Purpose
A compact "go to" card: an icon and a title on one row that runs a tap action — usually navigating to another dashboard or view. Used to build menus of links between dashboards.

## Config Schema
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | string | yes | — | Shown next to the icon; cut off with an ellipsis when too long |
| `icon` | string | no | `mdi:link-variant` | MDI icon |
| `color` | string | no | `--primary-color` | Icon colour; any CSS colour incl. `var(--…)`. The icon's circle is the same colour at 20% |
| `show_arrow` | boolean | no | `true` | Chevron on the right; only drawn when the card is clickable |
| `tap_action` | ActionConfig | no | `{ action: 'none' }` | Standard HA action, run via `custom-card-helpers`' `handleAction` |

## Editor (`link-card-editor.ts`)
Single `ha-form`: title, a grid of icon (icon selector) + colour (text), `show_arrow` toggle, `tap_action` (`ui_action` selector). A hint explains using **Navigate** with a path.

## Rendering Behavior
- `ha-card` → row of icon badge (36px circle), title, optional chevron.
- Clickable when `tap_action.action !== 'none'`: `role="button"`, `tabindex="0"`, pointer cursor, hover tint, focus outline. Enter/Space activate it (Space's scroll is prevented).
- Not clickable: no role, no tabindex, no arrow.
- Colours come from HA theme CSS vars.
- **Sections dashboards** (`getGridOptions`): 6 columns, 1 row by default; minimum 3 columns, 1 row. Content is vertically centred if given more rows.

## Validation (`setConfig()`)
- `title` is required.
- `tap_action`, when set, must be an object with a string `action`.

## Performance
- Shows no entity state, so `shouldUpdate` ignores `hass` changes after the first one. `handleAction` reads `this.hass` at tap time.

## Source files
- `src/cards/link-card/link-card.ts`
- `src/cards/link-card/link-card-editor.ts`
- `src/cards/link-card/types.ts`

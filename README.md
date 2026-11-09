# Paul's Custom Cards

Custom Lovelace cards for Home Assistant.

## Cards

### Paul's Gauge Card (`paul-gauge-card`)

A full-bleed background colour card that reflects the current state of a sensor. The entire card background changes colour based on configurable value levels, each with its own icon and colour. Supports both discrete (flat colour per level) and gradient (colour interpolated from the sensor's actual value) modes.

### Paul's Wind Card (`paul-wind-card`)

A compass card showing wind **direction** (a rotating needle) and **speed** (in the centre), with optional secondary readouts for gust/maximum speed, average speed, and average direction (drawn as a second, dimmed needle). Direction can be driven by a degrees sensor or a cardinal string (`N`, `NNE`, …).

## Installation

Install from Home Assistant's built-in [Marketplace](https://www.home-assistant.io/integrations/marketplace/) (Home Assistant 2026.11 or later). Go to **Settings → Marketplace → Add from link**, enter `keteracel/pauls-custom-cards` (type **Dashboard**), install **Paul's Custom Cards**, and hard-reload your browser. Updates then appear under **Settings → Updates**.

For manual installs, updating, rolling back, troubleshooting and removal, see the **[Installation and update guide](INSTALL.md)**.

## Dashboard layout

All cards work in sections dashboards (Home Assistant's default) and can be resized in the editor like built-in cards. Default sizes:

| Card | Width (of 12 columns) | Height |
|---|---|---|
| Gauge | 6 (minimum 4) | 3 rows |
| Wind | 12 (minimum 6) | fits the compass |
| Flow | full width (minimum 6) | fits the diagram |

To change a card's size in YAML, add `grid_options`, for example `grid_options: { columns: 4 }`.

## Usage

### Gauge Card

```yaml
type: custom:paul-gauge-card
entity: sensor.living_room_temperature
color_mode: gradient   # or 'distinct'
show_name: true
show_unit: true
levels:
  - min: 0
    max: 18
    icon: mdi:thermometer-low
    color: "#2196f3"
    label: Cold
  - min: 18
    max: 25
    icon: mdi:thermometer
    color: "#4caf50"
    label: Comfortable
  - min: 25
    max: 50
    icon: mdi:thermometer-high
    color: "#f44336"
    label: Hot
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Entity ID of a numeric sensor |
| `levels` | list | **required** | One or more level definitions (see below) |
| `color_mode` | `distinct` \| `gradient` | `distinct` | `distinct` shows a flat colour per level; `gradient` interpolates between level colours based on the exact sensor value |
| `name` | string | entity friendly name | Override the display name |
| `unit` | string | entity unit | Override the unit of measurement |
| `invert` | boolean | `false` | Flip the value's sign, e.g. `-1` → `1` and `1` → `-1`. Useful for sensors where negative means export or discharge. Levels and colours use the inverted value |
| `show_name` | boolean | `true` | Show the name below the value |
| `show_unit` | boolean | `true` | Show the unit next to the value |
| `tap_action` | [action](https://www.home-assistant.io/dashboards/actions/#tap-action) | `{ action: more-info }` | What a tap does. Defaults to opening the entity's more-info dialog (with its history graph). Set `{ action: none }` for a passive, non-clickable gauge. Also supports `navigate`, `url`, etc. |

#### Level options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `min` | number | yes | Lower bound of this level (inclusive) |
| `max` | number | yes | Upper bound of this level (exclusive) |
| `icon` | string | yes | MDI icon name, e.g. `mdi:thermometer-high` |
| `color` | string | yes | CSS colour. Theme colours work too, e.g. `var(--success-color, #4caf50)`, so the gauge follows your Home Assistant theme. In `gradient` mode use hex, `rgb()`, or a theme variable that resolves to one of those |
| `label` | string | no | Optional label (not currently displayed) |

> **Tip:** Levels do not need to be contiguous. Values in a gap between levels will display using the level immediately below the gap.

#### Tap to see history

By default, tapping the gauge opens Home Assistant's more-info dialog for the entity — which includes its history graph. Customise or disable it with `tap_action`:

```yaml
type: custom:paul-gauge-card
entity: sensor.living_room_temperature
tap_action:
  action: more-info      # the default; or 'navigate' / 'url' / 'none'
levels: [...]
```

#### Preset library

Don't want to hand-craft levels? See the **[gauge preset library](specs/cards/gauge-presets.md)** for ready-made, copy-paste `levels` configs covering common sensors — ambient temperature, humidity, CO₂, illuminance, solar production, battery, UV index, tank level, Wi-Fi signal, and more.

### Wind Card

```yaml
type: custom:paul-wind-card
title: Wind
speed_entity: sensor.wind_speed
direction_entity: sensor.wind_bearing   # degrees (0–360) or a cardinal string (N, NNE, …)
gust_entity: sensor.wind_gust                    # optional
average_speed_entity: sensor.wind_speed_avg      # optional
average_direction_entity: sensor.wind_bearing_avg # optional
```

The card has a visual editor — no YAML editing needed for normal use.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `speed_entity` | string | **required** | Numeric wind-speed sensor |
| `direction_entity` | string | **required** | Direction in degrees (0–360) or a cardinal string (`N`, `NNE`, …) |
| `gust_entity` | string | — | Max / gust speed — shown as a "Gust" readout |
| `average_speed_entity` | string | — | Shown as an "Avg" readout |
| `average_direction_entity` | string | — | Drawn as a second, dimmed needle plus an "Avg dir" readout |
| `title` | string | — | Card header |
| `unit` | string | speed entity's unit | Override the speed unit label |
| `decimals` | number | `1` | Speed decimal places (0–10) |
| `show_cardinal` | boolean | `true` | Show N/E/S/W labels on the compass |
| `direction_from` | boolean | `true` | `true` = needle points where the wind comes **from** (meteorological); `false` = points downwind |

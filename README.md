# Paul's Custom Cards

Custom Lovelace cards for Home Assistant.

## Cards

### Paul's Gauge Card (`paul-gauge-card`)

A full-bleed background colour card that reflects the current state of a sensor. The entire card background changes colour based on configurable value levels, each with its own icon and colour. Supports both discrete (flat colour per level) and gradient (colour interpolated from the sensor's actual value) modes.

### Paul's Wind Card (`paul-wind-card`)

A compass card showing wind **direction** (a rotating needle) and **speed** (in the centre), with optional secondary readouts for gust/maximum speed, average speed, and average direction (drawn as a second, dimmed needle). Direction can be driven by a degrees sensor or a cardinal string (`N`, `NNE`, …).

## Installation

### Via HACS (recommended)

1. Open HACS in your Home Assistant sidebar.
2. Go to **Frontend**.
3. Click the three-dot menu (⋮) in the top right and choose **Custom repositories**.
4. Add `https://github.com/keteracel/pauls-custom-cards` with category **Dashboard**.
5. Close the dialog, then search for **Paul's Custom Cards** and click **Download**.
6. Reload your browser.

### Manual

1. Download `pauls-cards.js` from the [latest release](https://github.com/keteracel/pauls-custom-cards/releases/latest).
2. Copy it to `config/www/pauls-cards.js` in your Home Assistant installation.
3. Go to **Settings → Dashboards → Resources** and add `/local/pauls-cards.js` as a **JavaScript module**.
4. Reload your browser.

## Updating

### Via HACS

1. Open HACS in your Home Assistant sidebar.
2. Go to **Frontend**.
3. Find **Paul's Custom Cards** in the list — if an update is available it will be highlighted.
4. Click on it and then click **Download** (HACS will fetch the new version).
5. Reload your browser.

### Manual

1. Download the new `pauls-cards.js` from the [latest release](https://github.com/keteracel/pauls-custom-cards/releases/latest).
2. Overwrite your existing `config/www/pauls-cards.js` with the new file.
3. Hard-reload your browser (Ctrl+Shift+R / Cmd+Shift+R) to clear the cached script.

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
| `show_name` | boolean | `true` | Show the name below the value |
| `show_unit` | boolean | `true` | Show the unit next to the value |

#### Level options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `min` | number | yes | Lower bound of this level (inclusive) |
| `max` | number | yes | Upper bound of this level (exclusive) |
| `icon` | string | yes | MDI icon name, e.g. `mdi:thermometer-high` |
| `color` | string | yes | CSS colour. Must be a hex value (`#RGB` or `#RRGGBB`) when using `gradient` mode |
| `label` | string | no | Optional label (not currently displayed) |

> **Tip:** Levels do not need to be contiguous. Values in a gap between levels will display using the level immediately below the gap.

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

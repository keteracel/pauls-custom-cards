# Paul's Custom Cards

Custom Lovelace cards for Home Assistant.

## Cards

### Paul's Gauge Card (`paul-gauge-card`)

A full-bleed background colour card that reflects the current state of a sensor. The entire card background changes colour based on configurable value levels, each with its own icon and colour. Supports both discrete (flat colour per level) and gradient (colour interpolated from the sensor's actual value) modes.

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

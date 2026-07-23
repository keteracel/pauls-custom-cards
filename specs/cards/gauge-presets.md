# Paul's Gauge Card — Preset Library

A copy-paste library of ready-made `levels` configurations for `paul-gauge-card`, covering common home-automation sensors. Each preset is a sensible starting point — adjust the thresholds, unit, and `entity` to match your setup.

## How to use

Every preset below is a `levels:` block. Drop it into a full card config:

```yaml
type: custom:paul-gauge-card
entity: sensor.your_entity_here
color_mode: gradient   # or 'distinct' — see each preset's recommendation
levels:
  # ← paste a preset's levels here
```

Notes:

- **Units** — Presets assume the unit shown in each heading (°C, %, lux, ppm, dBm …). If your sensor reports a different unit (e.g. °F, or RSSI as a percentage), adjust the `min`/`max` bounds accordingly.
- **`color_mode`** — `gradient` gives a smooth colour transition as the value moves through a level; `distinct` gives one flat colour per band. Each preset notes which reads best. Gradient mode requires hex colours (all presets use hex).
- **Bands need not be contiguous**, but these presets are, so gradient mode interpolates cleanly across the whole range.
- **`label`** is not currently rendered, but is included for readability and forward-compatibility.

## House palette

Presets share a consistent palette so multiple gauges on one dashboard read as a set:

| Meaning | Hex | Swatch name |
|---|---|---|
| Cold / very low / critical-low | `#2196f3` | blue |
| Cool / low | `#00bcd4` | cyan |
| Good / comfortable / nominal | `#4caf50` | green |
| Fair / mild-high | `#cddc39` → `#ffc107` | lime → amber |
| Warm / elevated | `#ff9800` | orange |
| Hot / high / warning | `#f44336` | red |
| Extreme / danger | `#b71c1c` / `#9c27b0` | deep red / purple |
| Off / inactive / unknown | `#607d8b` | blue-grey |

---

## Comfort & climate

### Ambient temperature (°C)

Bidirectional — both cold and hot are "bad". Recommended: `gradient`.

```yaml
levels:
  - { min: -10, max: 5,  icon: mdi:snowflake,          color: "#2196f3", label: Freezing }
  - { min: 5,   max: 16, icon: mdi:thermometer-low,    color: "#00bcd4", label: Cold }
  - { min: 16,  max: 20, icon: mdi:thermometer,        color: "#4caf50", label: Cool }
  - { min: 20,  max: 24, icon: mdi:thermometer,        color: "#8bc34a", label: Comfortable }
  - { min: 24,  max: 28, icon: mdi:thermometer-high,   color: "#ff9800", label: Warm }
  - { min: 28,  max: 45, icon: mdi:fire,               color: "#f44336", label: Hot }
```

### Humidity (% RH)

Bidirectional — too dry and too damp are both undesirable (mould risk above ~65%). Recommended: `gradient`.

```yaml
levels:
  - { min: 0,   max: 30,  icon: mdi:water-off,     color: "#ff9800", label: Dry }
  - { min: 30,  max: 40,  icon: mdi:water-percent, color: "#cddc39", label: Low }
  - { min: 40,  max: 60,  icon: mdi:water-percent, color: "#4caf50", label: Ideal }
  - { min: 60,  max: 70,  icon: mdi:water,         color: "#ff9800", label: Humid }
  - { min: 70,  max: 100, icon: mdi:water-alert,   color: "#f44336", label: Damp }
```

### CO₂ (ppm)

Higher is worse — ventilation cue. Recommended: `gradient`.

```yaml
levels:
  - { min: 400,  max: 800,  icon: mdi:molecule-co2, color: "#4caf50", label: Fresh }
  - { min: 800,  max: 1000, icon: mdi:molecule-co2, color: "#cddc39", label: Acceptable }
  - { min: 1000, max: 1500, icon: mdi:molecule-co2, color: "#ff9800", label: Stuffy }
  - { min: 1500, max: 2000, icon: mdi:molecule-co2, color: "#f44336", label: Poor }
  - { min: 2000, max: 5000, icon: mdi:molecule-co2, color: "#b71c1c", label: Ventilate }
```

### Air quality — PM2.5 (µg/m³)

Based on common AQI breakpoints. Higher is worse. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,   max: 12,  icon: mdi:air-filter,    color: "#4caf50", label: Good }
  - { min: 12,  max: 35,  icon: mdi:air-filter,    color: "#cddc39", label: Moderate }
  - { min: 35,  max: 55,  icon: mdi:weather-hazy,  color: "#ff9800", label: "Unhealthy (sensitive)" }
  - { min: 55,  max: 150, icon: mdi:weather-hazy,  color: "#f44336", label: Unhealthy }
  - { min: 150, max: 500, icon: mdi:smog,          color: "#9c27b0", label: Hazardous }
```

### Dewpoint (°C)

"Muggy" comfort proxy — higher dewpoint feels stickier. Recommended: `gradient`.

```yaml
levels:
  - { min: -5, max: 10, icon: mdi:water-thermometer, color: "#2196f3", label: Dry }
  - { min: 10, max: 16, icon: mdi:water-thermometer, color: "#4caf50", label: Comfortable }
  - { min: 16, max: 18, icon: mdi:water-thermometer, color: "#cddc39", label: Sticky }
  - { min: 18, max: 21, icon: mdi:water-thermometer, color: "#ff9800", label: Muggy }
  - { min: 21, max: 30, icon: mdi:water-thermometer, color: "#f44336", label: Oppressive }
```

---

## Light & solar

### Illuminance / sunlight intensity (lux)

Log-ish scale — indoor dim to full daylight. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,     max: 50,     icon: mdi:weather-night,         color: "#37474f", label: Dark }
  - { min: 50,    max: 200,    icon: mdi:weather-sunset,        color: "#607d8b", label: Dim }
  - { min: 200,   max: 1000,   icon: mdi:weather-partly-cloudy, color: "#cddc39", label: Indoor bright }
  - { min: 1000,  max: 10000,  icon: mdi:weather-sunny,         color: "#ffc107", label: Overcast day }
  - { min: 10000, max: 100000, icon: mdi:white-balance-sunny,   color: "#ff9800", label: Full daylight }
```

### Solar production (W)

Zero to peak generation. Assumes a ~5 kW array — scale `max` bounds to your system size. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,    max: 100,  icon: mdi:solar-power-variant-outline, color: "#607d8b", label: Idle }
  - { min: 100,  max: 1000, icon: mdi:solar-power-variant,         color: "#cddc39", label: Low }
  - { min: 1000, max: 3000, icon: mdi:solar-power,                 color: "#ffc107", label: Generating }
  - { min: 3000, max: 5000, icon: mdi:solar-power,                 color: "#ff9800", label: Strong }
  - { min: 5000, max: 8000, icon: mdi:white-balance-sunny,         color: "#4caf50", label: Peak }
```

### UV index

Standardised WHO bands — colours match the official scale. Recommended: `distinct` (bands are officially defined) or `gradient`.

```yaml
levels:
  - { min: 0,  max: 3,  icon: mdi:shield-sun,        color: "#4caf50", label: Low }
  - { min: 3,  max: 6,  icon: mdi:weather-sunny,     color: "#ffc107", label: Moderate }
  - { min: 6,  max: 8,  icon: mdi:weather-sunny-alert, color: "#ff9800", label: High }
  - { min: 8,  max: 11, icon: mdi:weather-sunny-alert, color: "#f44336", label: Very high }
  - { min: 11, max: 16, icon: mdi:weather-sunny-alert, color: "#9c27b0", label: Extreme }
```

---

## Power & utilities

### Battery level (%)

Charge state — low is bad. Recommended: `distinct` (matches the MDI battery icon steps) or `gradient`.

```yaml
levels:
  - { min: 0,   max: 10,  icon: mdi:battery-alert-variant-outline, color: "#f44336", label: Critical }
  - { min: 10,  max: 30,  icon: mdi:battery-20,                    color: "#ff9800", label: Low }
  - { min: 30,  max: 60,  icon: mdi:battery-50,                    color: "#ffc107", label: Medium }
  - { min: 60,  max: 90,  icon: mdi:battery-80,                    color: "#8bc34a", label: Good }
  - { min: 90,  max: 101, icon: mdi:battery,                       color: "#4caf50", label: Full }
```

> Note `max: 101` on the top band so a reading of exactly `100` matches (bounds are upper-exclusive).

### Battery voltage — Li-ion cell (V)

Raw volts for a single Li-ion / LiPo cell. Recommended: `gradient`.

```yaml
levels:
  - { min: 3.0, max: 3.3, icon: mdi:battery-alert, color: "#f44336", label: Critical }
  - { min: 3.3, max: 3.6, icon: mdi:battery-30,    color: "#ff9800", label: Low }
  - { min: 3.6, max: 3.9, icon: mdi:battery-60,    color: "#ffc107", label: Medium }
  - { min: 3.9, max: 4.1, icon: mdi:battery-80,    color: "#8bc34a", label: Good }
  - { min: 4.1, max: 4.3, icon: mdi:battery,       color: "#4caf50", label: Full }
```

### Grid power / whole-home load (W)

Zero to heavy draw — assumes a domestic supply. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,    max: 300,   icon: mdi:transmission-tower, color: "#4caf50", label: Idle }
  - { min: 300,  max: 1500,  icon: mdi:transmission-tower, color: "#cddc39", label: Light }
  - { min: 1500, max: 3000,  icon: mdi:transmission-tower, color: "#ffc107", label: Moderate }
  - { min: 3000, max: 5000,  icon: mdi:flash,              color: "#ff9800", label: Heavy }
  - { min: 5000, max: 10000, icon: mdi:flash-alert,        color: "#f44336", label: Peak }
```

### Water tank / cistern / oil level (%)

Empty is bad — pairs with the flow card's tank concept. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,   max: 15,  icon: mdi:gauge-empty, color: "#f44336", label: Empty }
  - { min: 15,  max: 35,  icon: mdi:gauge-low,   color: "#ff9800", label: Low }
  - { min: 35,  max: 65,  icon: mdi:gauge,       color: "#ffc107", label: Half }
  - { min: 65,  max: 90,  icon: mdi:gauge,       color: "#8bc34a", label: Good }
  - { min: 90,  max: 101, icon: mdi:gauge-full,  color: "#4caf50", label: Full }
```

### Water flow rate (L/min)

Idle to high draw — a spike can flag a leak. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,  max: 1,  icon: mdi:water-off, color: "#607d8b", label: Idle }
  - { min: 1,  max: 6,  icon: mdi:water,     color: "#4caf50", label: Normal }
  - { min: 6,  max: 12, icon: mdi:water-pump, color: "#ffc107", label: High }
  - { min: 12, max: 30, icon: mdi:water-alert, color: "#f44336", label: Very high }
```

---

## Outdoors

### Wind speed (km/h)

Beaufort-ish calm to gale. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,  max: 6,   icon: mdi:weather-windy-variant, color: "#4caf50", label: Calm }
  - { min: 6,  max: 20,  icon: mdi:weather-windy,         color: "#cddc39", label: Breeze }
  - { min: 20, max: 39,  icon: mdi:weather-windy,         color: "#ffc107", label: Windy }
  - { min: 39, max: 62,  icon: mdi:windsock,              color: "#ff9800", label: Strong }
  - { min: 62, max: 120, icon: mdi:weather-hurricane,     color: "#f44336", label: Gale }
```

### Rainfall rate (mm/h)

Dry to torrential. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,   max: 0.1, icon: mdi:weather-sunny,     color: "#607d8b", label: Dry }
  - { min: 0.1, max: 2.5, icon: mdi:weather-rainy,     color: "#00bcd4", label: Light }
  - { min: 2.5, max: 7.6, icon: mdi:weather-pouring,   color: "#2196f3", label: Moderate }
  - { min: 7.6, max: 50,  icon: mdi:weather-pouring,   color: "#9c27b0", label: Heavy }
```

### Soil moisture (%)

Dry is bad — irrigation cue. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,  max: 20,  icon: mdi:water-off,     color: "#f44336", label: Dry }
  - { min: 20, max: 40,  icon: mdi:water-percent, color: "#ff9800", label: Low }
  - { min: 40, max: 70,  icon: mdi:sprout,        color: "#4caf50", label: Ideal }
  - { min: 70, max: 100, icon: mdi:water,         color: "#2196f3", label: Wet }
```

---

## Connectivity & system health

### Wi-Fi / Zigbee signal — RSSI (dBm)

Negative scale — closer to zero is stronger. Recommended: `gradient`.

```yaml
levels:
  - { min: -100, max: -80, icon: mdi:wifi-strength-1, color: "#f44336", label: Poor }
  - { min: -80,  max: -70, icon: mdi:wifi-strength-2, color: "#ff9800", label: Fair }
  - { min: -70,  max: -60, icon: mdi:wifi-strength-3, color: "#cddc39", label: Good }
  - { min: -60,  max: -30, icon: mdi:wifi-strength-4, color: "#4caf50", label: Excellent }
```

> If your integration reports signal as a **percentage** instead, use the Battery level bands above with Wi-Fi icons.

### CPU / memory / disk usage (%)

Higher is worse — host-health gauge. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,  max: 50,  icon: mdi:chip,       color: "#4caf50", label: Idle }
  - { min: 50, max: 75,  icon: mdi:chip,       color: "#cddc39", label: Busy }
  - { min: 75, max: 90,  icon: mdi:chip,       color: "#ff9800", label: High }
  - { min: 90, max: 101, icon: mdi:chip-alert, color: "#f44336", label: Maxed }
```

> Swap the icon for `mdi:memory` (RAM) or `mdi:harddisk` (disk) as appropriate.

### CPU / server temperature (°C)

Higher bands than ambient temperature — thermal-throttle warning for a Pi or NAS. Recommended: `gradient`.

```yaml
levels:
  - { min: 20, max: 50, icon: mdi:thermometer,      color: "#4caf50", label: Cool }
  - { min: 50, max: 65, icon: mdi:thermometer,      color: "#cddc39", label: Warm }
  - { min: 65, max: 80, icon: mdi:thermometer-high, color: "#ff9800", label: Hot }
  - { min: 80, max: 95, icon: mdi:fire,             color: "#f44336", label: Throttling }
```

---

## Misc

### Noise level (dB)

Quiet to loud. Recommended: `gradient`.

```yaml
levels:
  - { min: 0,  max: 35,  icon: mdi:volume-low,    color: "#4caf50", label: Quiet }
  - { min: 35, max: 55,  icon: mdi:volume-medium, color: "#cddc39", label: Moderate }
  - { min: 55, max: 70,  icon: mdi:volume-high,   color: "#ff9800", label: Loud }
  - { min: 70, max: 120, icon: mdi:ear-hearing,   color: "#f44336", label: Very loud }
```

### Pool / aquarium temperature (°C)

Narrow comfortable band, distinct from room temperature. Recommended: `gradient`.

```yaml
levels:
  - { min: 10, max: 22, icon: mdi:pool,             color: "#2196f3", label: Cold }
  - { min: 22, max: 26, icon: mdi:pool,             color: "#00bcd4", label: Cool }
  - { min: 26, max: 30, icon: mdi:pool,             color: "#4caf50", label: Comfortable }
  - { min: 30, max: 40, icon: mdi:pool-thermometer, color: "#ff9800", label: Warm }
```

---

## Contributing a preset

Presets are intentionally opinionated defaults, not a standard. If you have better thresholds or icons for a sensor type — or a category not listed here — open a PR against this file. Keep to the house palette above so gauges stay visually consistent across a dashboard.

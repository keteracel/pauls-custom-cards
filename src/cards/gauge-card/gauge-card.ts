import { LitElement, html, css, type CSSResultGroup, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GaugeCardConfig, GaugeLevelConfig } from './types.js';

@customElement('paul-gauge-card')
export class GaugeCard extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @state()
  private _config!: GaugeCardConfig;

  // Sorted once at setConfig time — never re-sorted during renders
  private _cachedLevels: GaugeLevelConfig[] = [];

  // Fix #4: wrap dynamic import so a load failure doesn't propagate to HA's card picker
  public static async getConfigElement(): Promise<HTMLElement> {
    try {
      await import('./gauge-card-editor.js');
    } catch (err) {
      console.error('[paul-gauge-card] Failed to load config editor:', err);
    }
    return document.createElement('paul-gauge-card-editor');
  }

  public static getStubConfig(): GaugeCardConfig {
    return {
      type: 'custom:paul-gauge-card',
      entity: 'sensor.temperature',
      color_mode: 'distinct',
      show_name: true,
      show_unit: true,
      levels: [
        { min: 0,  max: 20, icon: 'mdi:thermometer-low',  color: '#2196f3', label: 'Low'    },
        { min: 20, max: 30, icon: 'mdi:thermometer',       color: '#4caf50', label: 'Medium' },
        { min: 30, max: 50, icon: 'mdi:thermometer-high',  color: '#f44336', label: 'High'   },
      ],
    };
  }

  // Fix #7 + #6: validate per-level fields at config time; sort once and cache
  public setConfig(config: GaugeCardConfig): void {
    if (!config.entity) throw new Error('You must define an entity.');
    if (!config.levels || config.levels.length === 0) throw new Error('You must define at least one level.');
    for (const level of config.levels) {
      if (typeof level.min !== 'number' || isNaN(level.min) ||
          typeof level.max !== 'number' || isNaN(level.max)) {
        throw new Error(`Level min/max must be numbers (got min=${level.min}, max=${level.max}).`);
      }
      if (level.min >= level.max) {
        throw new Error(`Level min must be less than max (got min=${level.min}, max=${level.max}).`);
      }
    }
    this._config = { color_mode: 'distinct', show_name: true, show_unit: true, ...config };
    this._cachedLevels = [...this._config.levels].sort((a, b) => a.min - b.min);
  }

  // Fix #3: skip re-renders when the watched entity hasn't changed
  protected override shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.has('hass') && !changedProperties.has('_config')) {
      if (!this._config) return false;
      const oldHass = changedProperties.get('hass') as HomeAssistant | undefined;
      return !oldHass || oldHass.states[this._config.entity] !== this.hass.states[this._config.entity];
    }
    return true;
  }

  // Fix #2: in-gap values now return the level immediately below instead of sorted[0]
  private _getCurrentLevel(value: number): GaugeLevelConfig {
    const sorted = this._cachedLevels;
    const matched = sorted.find(l => value >= l.min && value < l.max);
    if (matched) return matched;
    if (value >= sorted[sorted.length - 1].max) return sorted[sorted.length - 1];
    if (value < sorted[0].min) return sorted[0];
    // Value is in a gap — return the level whose range ends just below the value
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (value >= sorted[i].max) return sorted[i];
    }
    return sorted[0];
  }

  private _hexToRgb(hex: string): [number, number, number] | null {
    const clean = hex.replace('#', '');
    if (clean.length !== 6 && clean.length !== 3) return null;
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }

  // Fix #8: warn when a color can't be interpolated instead of silently degrading
  private _interpolateColor(colorA: string, colorB: string, t: number): string {
    const a = this._hexToRgb(colorA);
    const b = this._hexToRgb(colorB);
    if (!a || !b) {
      console.warn(
        `[paul-gauge-card] Gradient mode requires hex colors (#RGB or #RRGGBB). ` +
        `Got: '${!a ? colorA : colorB}'. Falling back to flat color.`
      );
      return colorA;
    }
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }

  // Fix #6: accepts pre-computed level so render() doesn't call _getCurrentLevel twice
  private _computeBackgroundColor(value: number, level: GaugeLevelConfig): string {
    if (this._config.color_mode !== 'gradient') return level.color;

    const range = level.max - level.min;
    if (range <= 0) return level.color;

    const t = Math.max(0, Math.min(1, (value - level.min) / range));
    const idx = this._cachedLevels.indexOf(level);
    const nextLevel = this._cachedLevels[idx + 1];

    return this._interpolateColor(level.color, nextLevel ? nextLevel.color : level.color, t);
  }

  protected render() {
    if (!this._config || !this.hass) return html``;

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <ha-card>
          <div class="error">Entity not found: ${this._config.entity}</div>
        </ha-card>
      `;
    }

    const rawValue = parseFloat(stateObj.state);
    const isNumeric = !isNaN(rawValue);

    // Fix #6: compute level once and pass to color function — no double resolution
    const level = isNumeric ? this._getCurrentLevel(rawValue) : undefined;
    const bgColor = isNumeric && level ? this._computeBackgroundColor(rawValue, level) : undefined;
    const icon = level?.icon ?? 'mdi:help-circle-outline';
    const friendlyName = this._config.name ?? stateObj.attributes.friendly_name ?? this._config.entity;
    const unit = this._config.unit ?? (stateObj.attributes.unit_of_measurement as string | undefined) ?? '';

    return html`
      <ha-card style=${styleMap(bgColor != null ? { backgroundColor: bgColor } : {})}>
        <div class="gauge-container">
          <div class="gauge-icon">
            <ha-icon icon="${icon}"></ha-icon>
          </div>
          <div class="gauge-value">
            ${stateObj.state}${this._config.show_unit && unit ? html`<span class="unit">${unit}</span>` : ''}
          </div>
          ${this._config.show_name ? html`<div class="gauge-name">${friendlyName}</div>` : ''}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      ha-card {
        display: block;
        background-color: var(--card-background-color, #fff);
        transition: background-color 0.5s ease;
        overflow: hidden;
      }
      .gauge-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        gap: 8px;
        color: white;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      }
      .gauge-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gauge-icon ha-icon {
        --mdc-icon-size: 48px;
        color: white;
      }
      .gauge-value {
        font-size: 2.5rem;
        font-weight: 600;
        line-height: 1;
      }
      .unit {
        font-size: 1.2rem;
        font-weight: 400;
        margin-left: 4px;
        opacity: 0.85;
      }
      .gauge-name {
        font-size: 0.9rem;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .error {
        padding: 16px;
        color: var(--error-color, red);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paul-gauge-card': GaugeCard;
  }
}

import { LitElement, html, svg, css, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { WindCardConfig } from './types.js';

// 16-point compass, each step 22.5°. Index * 22.5 = bearing in degrees.
const CARDINAL_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

const CARDINAL_TO_DEG: Record<string, number> = Object.fromEntries(
  CARDINAL_16.map((c, i) => [c, i * 22.5]),
);

// Compass geometry (SVG viewBox is 0 0 200 200)
const CX = 100;
const CY = 100;
const RING_R = 92;
const LABEL_R = 78;
const TICK_OUTER = 92;
const HUB_R = 48;

@customElement('paul-wind-card')
export class WindCard extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @state()
  private _config!: WindCardConfig;

  private _watched: string[] = [];

  public static async getConfigElement(): Promise<HTMLElement> {
    try {
      await import('./wind-card-editor.js');
    } catch (err) {
      console.error('[paul-wind-card] Failed to load config editor:', err);
    }
    return document.createElement('paul-wind-card-editor');
  }

  public static getStubConfig(): WindCardConfig {
    return {
      type: 'custom:paul-wind-card',
      title: 'Wind',
      speed_entity: 'sensor.wind_speed',
      direction_entity: 'sensor.wind_bearing',
      gust_entity: 'sensor.wind_gust',
      show_cardinal: true,
      direction_from: true,
    };
  }

  public setConfig(config: WindCardConfig): void {
    if (!config.speed_entity) throw new Error('[paul-wind-card] You must define a speed_entity.');
    if (!config.direction_entity) throw new Error('[paul-wind-card] You must define a direction_entity.');
    // != null: a cleared editor field emits `decimals: undefined` — treat as unset
    if (config.decimals != null &&
        (typeof config.decimals !== 'number' || !Number.isInteger(config.decimals) ||
         config.decimals < 0 || config.decimals > 10)) {
      throw new Error(`[paul-wind-card] decimals must be an integer between 0 and 10 (got ${config.decimals}).`);
    }

    this._config = { show_cardinal: true, direction_from: true, ...config, decimals: config.decimals ?? 1 };
    this._watched = [
      config.speed_entity,
      config.direction_entity,
      config.gust_entity,
      config.average_speed_entity,
      config.average_direction_entity,
    ].filter((e): e is string => !!e);
  }

  // Skip re-renders unless a watched entity actually changed
  protected override shouldUpdate(changedProperties: PropertyValues): boolean {
    if (changedProperties.has('hass') && !changedProperties.has('_config')) {
      if (!this._config) return false;
      const oldHass = changedProperties.get('hass') as HomeAssistant | undefined;
      if (!oldHass) return true;
      return this._watched.some(e => oldHass.states[e] !== this.hass.states[e]);
    }
    return true;
  }

  /** Parse a direction state (degrees or cardinal string) into a 0–360 bearing, or null. */
  private _parseDirection(entityId?: string): number | null {
    if (!entityId) return null;
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return null;
    const raw = stateObj.state?.trim();
    if (!raw) return null;

    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return ((numeric % 360) + 360) % 360;

    const deg = CARDINAL_TO_DEG[raw.toUpperCase()];
    return deg != null ? deg : null;
  }

  private _degToCardinal(deg: number): string {
    const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
    return CARDINAL_16[idx];
  }

  /** Numeric speed value for an entity, or null if missing/non-numeric. */
  private _speedValue(entityId?: string): number | null {
    if (!entityId) return null;
    const stateObj = this.hass.states[entityId];
    if (!stateObj) return null;
    const v = Number(stateObj.state);
    return Number.isFinite(v) ? v : null;
  }

  private _formatSpeed(value: number | null): string {
    if (value == null) return '—';
    return value.toFixed(this._config.decimals!);
  }

  /** Bearing at which the needle is drawn, honouring the from/to convention. */
  private _needleBearing(bearing: number): number {
    return this._config.direction_from ? bearing : (bearing + 180) % 360;
  }

  private _renderCompass(bearing: number | null, avgBearing: number | null): TemplateResult {
    const ticks = [];
    for (let a = 0; a < 360; a += 30) {
      const major = a % 90 === 0;
      const inner = major ? TICK_OUTER - 12 : TICK_OUTER - 7;
      const rad = (a * Math.PI) / 180;
      ticks.push(svg`
        <line
          x1=${CX + TICK_OUTER * Math.sin(rad)} y1=${CY - TICK_OUTER * Math.cos(rad)}
          x2=${CX + inner * Math.sin(rad)}       y2=${CY - inner * Math.cos(rad)}
          class=${major ? 'tick tick-major' : 'tick'} />
      `);
    }

    const labels = this._config.show_cardinal
      ? (['N', 'E', 'S', 'W'] as const).map((c, i) => {
          const rad = (i * 90 * Math.PI) / 180;
          return svg`
            <text
              x=${CX + LABEL_R * Math.sin(rad)}
              y=${CY - LABEL_R * Math.cos(rad)}
              class=${c === 'N' ? 'cardinal cardinal-n' : 'cardinal'}
              text-anchor="middle" dominant-baseline="central">${c}</text>
          `;
        })
      : [];

    return svg`
      <svg viewBox="0 0 200 200" class="compass" role="img"
           aria-label="Wind direction compass">
        <circle cx=${CX} cy=${CY} r=${RING_R} class="ring" />
        ${ticks}
        ${labels}

        ${avgBearing != null ? svg`
          <g transform="rotate(${this._needleBearing(avgBearing)} ${CX} ${CY})" class="needle-avg">
            <line x1=${CX} y1=${CY} x2=${CX} y2=${CY - (HUB_R + 14)} />
            <path d="M ${CX} ${CY - (HUB_R + 22)} L ${CX - 5} ${CY - (HUB_R + 10)} L ${CX + 5} ${CY - (HUB_R + 10)} Z" />
          </g>
        ` : ''}

        ${bearing != null ? svg`
          <g transform="rotate(${this._needleBearing(bearing)} ${CX} ${CY})">
            <path class="needle-main"
                  d="M ${CX} ${CY - 84} L ${CX - 9} ${CY - HUB_R + 6} L ${CX + 9} ${CY - HUB_R + 6} Z" />
            <path class="needle-tail"
                  d="M ${CX} ${CY + 70} L ${CX - 7} ${CY + HUB_R - 6} L ${CX + 7} ${CY + HUB_R - 6} Z" />
          </g>
        ` : ''}

        <circle cx=${CX} cy=${CY} r=${HUB_R} class="hub" />
      </svg>
    `;
  }

  protected render() {
    if (!this._config || !this.hass) return html``;

    const missing = this._watched.filter(e => !this.hass.states[e]);
    if (this.hass.states[this._config.speed_entity] === undefined ||
        this.hass.states[this._config.direction_entity] === undefined) {
      return html`
        <ha-card .header=${this._config.title}>
          <div class="error">Entity not found: ${missing.join(', ')}</div>
        </ha-card>
      `;
    }

    const speed = this._speedValue(this._config.speed_entity);
    const bearing = this._parseDirection(this._config.direction_entity);
    const gust = this._speedValue(this._config.gust_entity);
    const avgSpeed = this._speedValue(this._config.average_speed_entity);
    const avgBearing = this._parseDirection(this._config.average_direction_entity);

    const speedObj = this.hass.states[this._config.speed_entity];
    const unit = this._config.unit
      ?? (speedObj.attributes.unit_of_measurement as string | undefined)
      ?? '';

    const cardinal = bearing != null ? this._degToCardinal(bearing) : '—';

    const secondary: Array<{ label: string; value: string }> = [];
    if (this._config.average_speed_entity) {
      secondary.push({ label: 'Avg', value: `${this._formatSpeed(avgSpeed)} ${unit}`.trim() });
    }
    if (this._config.average_direction_entity) {
      secondary.push({ label: 'Avg dir', value: avgBearing != null ? this._degToCardinal(avgBearing) : '—' });
    }
    if (this._config.gust_entity) {
      secondary.push({ label: 'Gust', value: `${this._formatSpeed(gust)} ${unit}`.trim() });
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div class="content">
          <div class="compass-wrap">
            ${this._renderCompass(bearing, avgBearing)}
            <div class="readout">
              <div class="speed">${this._formatSpeed(speed)}</div>
              ${unit ? html`<div class="unit">${unit}</div>` : ''}
              <div class="cardinal-text">
                ${cardinal}${bearing != null ? html` · ${Math.round(bearing)}°` : ''}
              </div>
            </div>
          </div>

          ${secondary.length ? html`
            <div class="secondary">
              ${secondary.map(s => html`
                <div class="stat">
                  <span class="stat-label">${s.label}</span>
                  <span class="stat-value">${s.value}</span>
                </div>
              `)}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host { display: block; }
      ha-card { overflow: hidden; }
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 16px;
      }
      .compass-wrap {
        position: relative;
        width: 100%;
        max-width: 260px;
        aspect-ratio: 1 / 1;
      }
      .compass {
        width: 100%;
        height: 100%;
        display: block;
      }

      .ring {
        fill: var(--card-background-color, #fff);
        stroke: var(--divider-color, #e0e0e0);
        stroke-width: 2;
      }
      .tick {
        stroke: var(--secondary-text-color, #9e9e9e);
        stroke-width: 1.5;
        opacity: 0.5;
      }
      .tick-major {
        stroke-width: 2.5;
        opacity: 0.9;
      }
      .cardinal {
        fill: var(--secondary-text-color, #9e9e9e);
        font-size: 15px;
        font-weight: 600;
      }
      .cardinal-n {
        fill: var(--error-color, #f44336);
      }

      .needle-main {
        fill: var(--primary-color, #03a9f4);
      }
      .needle-tail {
        fill: var(--secondary-text-color, #9e9e9e);
        opacity: 0.65;
      }
      .needle-avg line {
        stroke: var(--primary-color, #03a9f4);
        stroke-width: 3;
        stroke-dasharray: 4 3;
        opacity: 0.55;
      }
      .needle-avg path {
        fill: var(--primary-color, #03a9f4);
        opacity: 0.55;
      }

      .hub {
        fill: var(--card-background-color, #fff);
        stroke: var(--divider-color, #e0e0e0);
        stroke-width: 1.5;
      }

      .readout {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .speed {
        font-size: 2.2rem;
        font-weight: 700;
        line-height: 1;
        color: var(--primary-text-color);
      }
      .unit {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }
      .cardinal-text {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--primary-text-color);
        margin-top: 6px;
      }

      .secondary {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px 24px;
        width: 100%;
      }
      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 56px;
      }
      .stat-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--secondary-text-color);
      }
      .stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: var(--primary-text-color);
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
    'paul-wind-card': WindCard;
  }
}

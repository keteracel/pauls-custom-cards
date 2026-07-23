import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { WindCardConfig } from './types.js';

// ha-form's entity selector renders inside custom card editors on HA Frontend
// ≥20260325.7 (a standalone ha-entity-picker does not) — same approach as the gauge card.
const REQUIRED_SCHEMA = [
  { name: 'title', selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'speed_entity',     required: true, selector: { entity: { domain: ['sensor'] } } },
      { name: 'direction_entity', required: true, selector: { entity: { domain: ['sensor'] } } },
    ],
  },
];

const OPTIONAL_ENTITY_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'gust_entity',              selector: { entity: { domain: ['sensor'] } } },
      { name: 'average_speed_entity',     selector: { entity: { domain: ['sensor'] } } },
      { name: 'average_direction_entity', selector: { entity: { domain: ['sensor'] } } },
    ],
  },
];

const DISPLAY_SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'unit',     selector: { text: {} } },
      { name: 'decimals', selector: { number: { mode: 'box', min: 0, max: 10, step: 1 } } },
    ],
  },
  { name: 'show_cardinal',  selector: { boolean: {} } },
  { name: 'direction_from', selector: { boolean: {} } },
];

const LABELS: Record<string, string> = {
  title:                    'Title',
  speed_entity:             'Wind speed',
  direction_entity:         'Wind direction',
  gust_entity:              'Gust / max speed',
  average_speed_entity:     'Average speed',
  average_direction_entity: 'Average direction',
  unit:                     'Unit (override)',
  decimals:                 'Decimal places',
  show_cardinal:            'Show N/E/S/W labels',
  direction_from:           'Needle points where wind comes from',
};

const computeLabel = (s: { name: string }) => LABELS[s.name] ?? s.name;

@customElement('paul-wind-card-editor')
export class WindCardEditor extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private _config!: WindCardConfig;

  public setConfig(config: WindCardConfig): void {
    this._config = config;
  }

  private _changed(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    fireEvent(this, 'config-changed', {
      config: { ...this._config, ...(ev.detail.value as Partial<WindCardConfig>) },
    });
  }

  protected render() {
    if (!this.hass || !this._config) return html``;

    const data = { show_cardinal: true, direction_from: true, decimals: 1, ...this._config };

    return html`
      <div class="card-config">
        <ha-form
          .schema=${REQUIRED_SCHEMA}
          .data=${data}
          .hass=${this.hass}
          .computeLabel=${computeLabel}
          @value-changed=${this._changed}
        ></ha-form>

        <div class="section-header">Optional entities</div>
        <p class="hint">Leave blank to hide the matching readout / average needle.</p>
        <ha-form
          .schema=${OPTIONAL_ENTITY_SCHEMA}
          .data=${data}
          .hass=${this.hass}
          .computeLabel=${computeLabel}
          @value-changed=${this._changed}
        ></ha-form>

        <div class="section-header">Display</div>
        <ha-form
          .schema=${DISPLAY_SCHEMA}
          .data=${data}
          .hass=${this.hass}
          .computeLabel=${computeLabel}
          @value-changed=${this._changed}
        ></ha-form>

        <p class="hint">
          <strong>Wind direction</strong> may be degrees (0–360) or a cardinal string
          (<code>N</code>, <code>NNE</code>, …). Turn off
          <em>“points where wind comes from”</em> to make the needle point downwind instead.
        </p>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }
      .section-header {
        font-weight: 500;
        font-size: 0.9rem;
        padding-bottom: 8px;
        margin-top: 4px;
        border-bottom: 1px solid var(--divider-color);
        color: var(--primary-text-color);
      }
      .hint {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        margin: 0;
      }
      code {
        background: var(--code-editor-background-color, #1e1e1e);
        color: var(--token-color-text-primary, #d4d4d4);
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 0.8rem;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paul-wind-card-editor': WindCardEditor;
  }
}

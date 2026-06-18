import { LitElement, html, css } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { customElement, property } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GaugeCardConfig, GaugeLevelConfig } from './types.js';

// Entity + scalar fields. Using ha-form's entity selector (supported HA Frontend ≥20260325.7)
// instead of a standalone ha-entity-picker, which does not render in custom card editors.
const MAIN_SCHEMA = [
  {
    name: 'entity',
    required: true,
    selector: { entity: { domain: ['sensor'] } },
  },
  { name: 'name', selector: { text: {} } },
  {
    name: 'color_mode',
    selector: {
      select: {
        options: [
          { value: 'distinct', label: 'Distinct (flat color per level)' },
          { value: 'gradient', label: 'Gradient (interpolate between levels)' },
        ],
      },
    },
  },
  { name: 'show_name', selector: { boolean: {} } },
  { name: 'show_unit', selector: { boolean: {} } },
];

const LEVEL_SCHEMA = [
  { name: 'min',   required: true, selector: { number: { mode: 'box', step: 0.1 } } },
  { name: 'max',   required: true, selector: { number: { mode: 'box', step: 0.1 } } },
  { name: 'icon',  required: true, selector: { icon: {} } },
  { name: 'color', required: true, selector: { text: {} } },
  { name: 'label',               selector: { text: {} } },
];

const MAIN_LABELS: Record<string, string> = {
  entity:     'Sensor entity',
  name:       'Name (override)',
  color_mode: 'Color mode',
  show_name:  'Show name',
  show_unit:  'Show unit',
};

const LEVEL_LABELS: Record<string, string> = {
  min:   'Minimum value (inclusive)',
  max:   'Maximum value (exclusive)',
  icon:  'Icon',
  color: 'Color (hex: #RGB or #RRGGBB)',
  label: 'Label (optional)',
};

const computeMainLabel  = (s: { name: string }) => MAIN_LABELS[s.name]  ?? s.name;
const computeLevelLabel = (s: { name: string }) => LEVEL_LABELS[s.name] ?? s.name;

@customElement('paul-gauge-card-editor')
export class GaugeCardEditor extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private _config!: GaugeCardConfig;

  public setConfig(config: GaugeCardConfig): void {
    this._config = config;
  }

  private _mainChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    fireEvent(this, 'config-changed', {
      config: { ...this._config, ...(ev.detail.value as Partial<GaugeCardConfig>) },
    });
  }

  private _levelChanged(ev: CustomEvent, idx: number): void {
    ev.stopPropagation();
    if (!this._config) return;
    const levels = this._config.levels;
    if (idx < 0 || idx >= levels.length) return;
    const merged = { ...levels[idx], ...(ev.detail.value as Partial<GaugeLevelConfig>) };
    if (typeof merged.min === 'number' && typeof merged.max === 'number' && merged.min >= merged.max) return;
    const newLevels = [...levels];
    newLevels[idx] = merged;
    fireEvent(this, 'config-changed', { config: { ...this._config, levels: newLevels } });
  }

  private _addLevel(): void {
    if (!this._config) return;
    const last = this._config.levels[this._config.levels.length - 1];
    const min = (last && isFinite(last.max)) ? last.max : 0;
    const levels: GaugeLevelConfig[] = [
      ...this._config.levels,
      { min, max: min + 10, icon: 'mdi:thermometer', color: '#9e9e9e' },
    ];
    fireEvent(this, 'config-changed', { config: { ...this._config, levels } });
  }

  private _removeLevel(idx: number): void {
    if (!this._config) return;
    const levels = this._config.levels.filter((_, i) => i !== idx);
    fireEvent(this, 'config-changed', { config: { ...this._config, levels } });
  }

  protected render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">

        <ha-form
          .schema=${MAIN_SCHEMA}
          .data=${{ color_mode: 'distinct', show_name: true, show_unit: true, ...this._config }}
          .hass=${this.hass}
          .computeLabel=${computeMainLabel}
          @value-changed=${this._mainChanged}
        ></ha-form>

        <div class="section-header">
          <span>Levels</span>
          <button class="add-btn" @click=${this._addLevel}>+ Add level</button>
        </div>

        ${this._config.levels.length === 0 ? html`
          <p class="hint">No levels yet — add at least one.</p>
        ` : ''}

        ${this._config.levels.map((level, idx) => html`
          <div class="level-card">
            <div class="level-header">
              <ha-icon .icon=${level.icon ?? 'mdi:circle-outline'}
                       style=${styleMap({ color: level.color ?? 'inherit' })}></ha-icon>
              <span class="level-name">${level.label ?? `Level ${idx + 1}`}</span>
              <span class="level-range">${level.min} – ${level.max}</span>
              <button class="remove-btn" @click=${() => this._removeLevel(idx)}>Remove</button>
            </div>
            <ha-form
              .schema=${LEVEL_SCHEMA}
              .data=${level}
              .hass=${this.hass}
              .computeLabel=${computeLevelLabel}
              @value-changed=${(ev: CustomEvent) => this._levelChanged(ev, idx)}
            ></ha-form>
          </div>
        `)}

        <p class="hint">
          <strong>Color</strong> must be a hex value (<code>#RGB</code> or <code>#RRGGBB</code>)
          when <em>gradient</em> mode is active.
        </p>

      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 500;
        font-size: 0.9rem;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--divider-color);
        color: var(--primary-text-color);
      }
      .level-card {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .level-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .level-name {
        font-weight: 500;
        flex: 1;
      }
      .level-range {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
      }
      .add-btn {
        background: var(--primary-color);
        color: var(--text-primary-color);
        border: none;
        border-radius: 4px;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 0.85rem;
      }
      .add-btn:hover {
        opacity: 0.85;
      }
      .remove-btn {
        background: none;
        border: 1px solid var(--error-color, red);
        border-radius: 4px;
        padding: 2px 8px;
        cursor: pointer;
        color: var(--error-color, red);
        font-size: 0.8rem;
      }
      .remove-btn:hover {
        background: var(--error-color, red);
        color: #fff;
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
    'paul-gauge-card-editor': GaugeCardEditor;
  }
}

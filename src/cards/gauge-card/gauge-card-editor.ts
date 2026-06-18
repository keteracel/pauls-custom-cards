import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { GaugeCardConfig } from './types.js';

@customElement('paul-gauge-card-editor')
export class GaugeCardEditor extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private _config!: GaugeCardConfig;

  public setConfig(config: GaugeCardConfig): void {
    this._config = config;
  }

  // Fix #1: handle ha-entity-picker (single field, has configValue) and
  // ha-form (full object in ev.detail.value, no configValue) separately
  private _valueChanged(ev: CustomEvent): void {
    if (!this._config || !this.hass) return;
    const target = ev.target as HTMLInputElement & { configValue?: string };
    let config: GaugeCardConfig;
    if (target.configValue) {
      config = { ...this._config, [target.configValue]: ev.detail?.value ?? target.value };
    } else if (ev.detail?.value !== null && typeof ev.detail?.value === 'object') {
      // ha-form emits the full set of managed fields — spread over config to preserve levels
      config = { ...this._config, ...(ev.detail.value as Partial<GaugeCardConfig>) };
    } else {
      return;
    }
    fireEvent(this, 'config-changed', { config });
  }

  protected render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._config.entity}
          .configValue=${'entity'}
          domain-filter="sensor"
          @value-changed=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>

        <ha-form
          .schema=${[
            { name: 'name',       selector: { text: {} } },
            { name: 'color_mode', selector: { select: { options: [
              { value: 'distinct', label: 'Distinct (flat color per level)' },
              { value: 'gradient', label: 'Gradient (interpolate between levels)' },
            ] } } },
            { name: 'show_name',  selector: { boolean: {} } },
            { name: 'show_unit',  selector: { boolean: {} } },
          ]}
          .data=${this._config}
          .hass=${this.hass}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <p class="hint">
          Configure <strong>levels</strong> (min, max, icon, color) via YAML.
          Example level: <code>{ min: 0, max: 20, icon: "mdi:thermometer-low", color: "#2196f3" }</code>
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

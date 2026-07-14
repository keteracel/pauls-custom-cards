import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { FlowCardConfig } from './types.js';

const SCHEMA = [
  { name: 'title',  selector: { text: {} } },
  { name: 'url',    selector: { text: {} } },
  { name: 'height', selector: { number: { mode: 'box', min: 100, max: 1000, step: 10 } } },
];

const LABELS: Record<string, string> = {
  title:  'Card title',
  url:    'Dashboard URL (optional — makes card clickable)',
  height: 'Card height (px)',
};

const computeLabel = (s: { name: string }) => LABELS[s.name] ?? s.name;

@customElement('paul-flow-card-editor')
export class FlowCardEditor extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private _config!: FlowCardConfig;

  public setConfig(config: FlowCardConfig): void {
    this._config = config;
  }

  private _changed(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass || !ev.detail?.value) return;
    fireEvent(this, 'config-changed', {
      config: { ...this._config, ...(ev.detail.value as Partial<FlowCardConfig>) },
    });
  }

  protected override render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <div class="flow-editor">
        <ha-form
          .schema=${SCHEMA}
          .data=${{ height: 300, ...this._config }}
          .hass=${this.hass}
          .computeLabel=${computeLabel}
          @value-changed=${this._changed}
        ></ha-form>
        <p class="hint">
          Configure <strong>nodes</strong> and <strong>edges</strong> in the card's
          YAML editor. See the
          <a href="https://github.com/keteracel/pauls-custom-cards" target="_blank">documentation</a>
          for the full schema.
        </p>
      </div>
    `;
  }

  static get styles() {
    return css`
      .flow-editor {
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
      a { color: var(--primary-color); }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paul-flow-card-editor': FlowCardEditor;
  }
}

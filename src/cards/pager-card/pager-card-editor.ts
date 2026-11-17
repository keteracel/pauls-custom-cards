import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { PagerCardConfig } from './types.js';

const SCHEMA = [
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'previous', selector: { text: {} } },
      { name: 'next', selector: { text: {} } },
    ],
  },
  { name: 'swipe', selector: { boolean: {} } },
  { name: 'offset_top', selector: { number: { min: 0, max: 400, mode: 'box', unit_of_measurement: 'px' } } },
];

const LABELS: Record<string, string> = {
  previous: 'Previous page path',
  next: 'Next page path',
  swipe: 'Swipe left/right to turn pages',
  offset_top: 'Distance from top of screen (blank: below the header)',
};

const computeLabel = (s: { name: string }) => LABELS[s.name] ?? s.name;

@customElement('paul-pager-card-editor')
export class PagerCardEditor extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private _config!: PagerCardConfig;

  public setConfig(config: PagerCardConfig): void {
    this._config = config;
  }

  private _changed(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...(ev.detail.value as Partial<PagerCardConfig>) };
    for (const key of ['previous', 'next', 'offset_top'] as const) {
      if (config[key] === '' || config[key] == null) delete config[key];
    }
    fireEvent(this, 'config-changed', { config });
  }

  protected render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-form
          .schema=${SCHEMA}
          .data=${{ swipe: true, ...this._config }}
          .hass=${this.hass}
          .computeLabel=${computeLabel}
          @value-changed=${this._changed}
        ></ha-form>
        <p class="hint">
          Paths look like <code>/dashboard-wall/weather-rain</code>. To use the same card on
          every page, switch to the code editor and list them in order under <code>pages:</code>.
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
    'paul-pager-card-editor': PagerCardEditor;
  }
}

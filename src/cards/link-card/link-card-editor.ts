import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fireEvent } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { LinkCardConfig } from './types.js';

const SCHEMA = [
  { name: 'title', required: true, selector: { text: {} } },
  {
    name: '',
    type: 'grid',
    schema: [
      { name: 'icon',  selector: { icon: {} } },
      { name: 'color', selector: { text: {} } },
    ],
  },
  { name: 'show_arrow', selector: { boolean: {} } },
  { name: 'tap_action', selector: { ui_action: { default_action: 'none' } } },
];

const LABELS: Record<string, string> = {
  title:      'Title',
  icon:       'Icon',
  color:      'Icon colour (e.g. #ff9800 or var(--accent-color))',
  show_arrow: 'Show arrow',
  tap_action: 'Tap action',
};

const computeLabel = (s: { name: string }) => LABELS[s.name] ?? s.name;

@customElement('paul-link-card-editor')
export class LinkCardEditor extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private _config!: LinkCardConfig;

  public setConfig(config: LinkCardConfig): void {
    this._config = config;
  }

  private _changed(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;
    fireEvent(this, 'config-changed', {
      config: { ...this._config, ...(ev.detail.value as Partial<LinkCardConfig>) },
    });
  }

  protected render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <div class="card-config">
        <ha-form
          .schema=${SCHEMA}
          .data=${{ show_arrow: true, ...this._config }}
          .hass=${this.hass}
          .computeLabel=${computeLabel}
          @value-changed=${this._changed}
        ></ha-form>
        <p class="hint">
          Pick <strong>Navigate</strong> as the tap action and enter a path such as
          <code>/lovelace/rooms</code> or <code>/dashboard-energy/0</code> to link to another
          dashboard or view.
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
    'paul-link-card-editor': LinkCardEditor;
  }
}

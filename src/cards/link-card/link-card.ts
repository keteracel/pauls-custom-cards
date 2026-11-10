import { LitElement, html, css, type CSSResultGroup, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { handleAction } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { LinkCardConfig } from './types.js';
import type { GridOptions } from '../../grid-options.js';

const DEFAULT_ICON = 'mdi:link-variant';

@customElement('paul-link-card')
export class LinkCard extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @state()
  private _config!: LinkCardConfig;

  public static async getConfigElement(): Promise<HTMLElement> {
    try {
      await import('./link-card-editor.js');
    } catch (err) {
      console.error('[paul-link-card] Failed to load config editor:', err);
    }
    return document.createElement('paul-link-card-editor');
  }

  public static getStubConfig(): LinkCardConfig {
    return {
      type: 'custom:paul-link-card',
      title: 'Living room',
      icon: 'mdi:sofa',
      tap_action: { action: 'navigate', navigation_path: '/lovelace/0' },
    };
  }

  // Size in a sections dashboard: one row, like a tile card. Below 3 columns the
  // title has no room next to the icon.
  public getGridOptions(): GridOptions {
    return { columns: 6, rows: 1, min_columns: 3, min_rows: 1 };
  }

  public setConfig(config: LinkCardConfig): void {
    if (!config.title) throw new Error('[paul-link-card] You must define a title.');
    if (config.tap_action != null &&
        (typeof config.tap_action !== 'object' || typeof config.tap_action.action !== 'string')) {
      throw new Error('[paul-link-card] tap_action must be an action object, e.g. { action: "navigate", navigation_path: "/lovelace/rooms" }.');
    }
    this._config = {
      show_arrow: true,
      ...config,
      icon: config.icon || DEFAULT_ICON,
      tap_action: config.tap_action ?? { action: 'none' },
    };
  }

  // The card shows no entity state, so hass updates never change what's drawn.
  // handleAction reads this.hass at tap time, so it still gets the latest one.
  protected override shouldUpdate(changedProperties: PropertyValues): boolean {
    if (!this._config) return false;
    return changedProperties.has('_config') || !changedProperties.get('hass');
  }

  private _onTap(): void {
    handleAction(this, this.hass, this._config, 'tap');
  }

  // Enter and Space activate the card like a button (Space also scrolls, so prevent that)
  private _onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this._onTap();
    }
  }

  protected render() {
    if (!this._config) return html``;

    const clickable = this._config.tap_action?.action !== 'none';
    const showArrow = clickable && this._config.show_arrow;

    return html`
      <ha-card
        class=${clickable ? 'clickable' : ''}
        role=${ifDefined(clickable ? 'button' : undefined)}
        tabindex=${ifDefined(clickable ? '0' : undefined)}
        @click=${clickable ? this._onTap : undefined}
        @keydown=${clickable ? this._onKeydown : undefined}
      >
        <div class="row">
          <div class="icon" style=${styleMap(this._config.color ? { '--link-color': this._config.color } : {})}>
            <ha-icon icon=${this._config.icon!}></ha-icon>
          </div>
          <div class="title">${this._config.title}</div>
          ${showArrow ? html`<ha-icon class="arrow" icon="mdi:chevron-right"></ha-icon>` : ''}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        height: 100%;
      }
      /* Fill the cell when a sections dashboard gives the card a fixed height */
      ha-card {
        display: flex;
        align-items: center;
        height: 100%;
        min-height: 56px;
        box-sizing: border-box;
        overflow: hidden;
      }
      ha-card.clickable {
        cursor: pointer;
      }
      ha-card.clickable:hover {
        background-color: color-mix(in srgb, var(--primary-text-color, #000) 4%, var(--card-background-color, #fff));
      }
      ha-card.clickable:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: 2px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-width: 0;
        padding: 0 12px 0 10px;
        box-sizing: border-box;
      }
      .icon {
        --link-color: var(--primary-color, #03a9f4);
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background-color: color-mix(in srgb, var(--link-color) 20%, transparent);
        color: var(--link-color);
      }
      .icon ha-icon {
        --mdc-icon-size: 20px;
      }
      .title {
        flex: 1;
        min-width: 0;
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--primary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .arrow {
        flex: none;
        --mdc-icon-size: 22px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paul-link-card': LinkCard;
  }
}

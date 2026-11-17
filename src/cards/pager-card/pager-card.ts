import { LitElement, html, css, nothing, type CSSResultGroup, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { navigate } from 'custom-card-helpers';
import type { HomeAssistant } from 'custom-card-helpers';
import type { PagerCardConfig } from './types.js';
import type { GridOptions } from '../../grid-options.js';

// Swipes that start on these (or inside them) belong to the element, not the pager.
const SWIPE_IGNORE = new Set([
  'INPUT', 'TEXTAREA', 'HA-SLIDER', 'HA-CONTROL-SLIDER', 'HA-CHART-BASE', 'HA-DIALOG',
  'HA-ADAPTIVE-DIALOG', 'HA-MORE-INFO-DIALOG', 'HA-CODE-EDITOR', 'PAUL-PAGER-OVERLAY',
]);
const SWIPE_MIN_PX = 60;
const SWIPE_MAX_MS = 800;

const normalise = (path: string) => path.replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';

/** Works out previous/next paths for `pathname` from the card config. */
export function computeTargets(config: PagerCardConfig, pathname: string): { previous?: string; next?: string; index: number } {
  const pages = (config.pages ?? []).map(normalise);
  const index = pages.indexOf(normalise(pathname));
  return {
    previous: config.previous ?? (index > 0 ? config.pages![index - 1] : undefined),
    next: config.next ?? (index >= 0 && index < pages.length - 1 ? config.pages![index + 1] : undefined),
    index,
  };
}

/**
 * The arrows. Lives in document.body rather than inside the card, so `position: fixed`
 * is relative to the screen whatever the dashboard's containers do.
 */
@customElement('paul-pager-overlay')
export class PagerOverlay extends LitElement {
  @property({ attribute: false }) public previous?: string;
  @property({ attribute: false }) public next?: string;
  @property({ attribute: false }) public topOffset?: number;
  /** Right edge of HA's docked sidebar, so the left arrow sits beside it, not over it. */
  @property({ attribute: false }) public leftOffset = 0;
  @property({ attribute: false }) public onGo!: (path: string) => void;

  protected render() {
    const top = this.topOffset != null ? `${this.topOffset}px` : 'var(--header-height, 56px)';
    return html`
      <style>:host { --pager-top: ${top}; --pager-left: ${this.leftOffset}px; }</style>
      ${this.previous ? html`
        <button class="arrow left" aria-label="Previous page" @click=${() => this.onGo(this.previous!)}>
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </button>` : nothing}
      ${this.next ? html`
        <button class="arrow right" aria-label="Next page" @click=${() => this.onGo(this.next!)}>
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </button>` : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .arrow {
        position: fixed;
        z-index: 4;
        top: calc(var(--pager-top) + env(safe-area-inset-top, 0px) + 12px);
        bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        width: 28px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ha-card-border-color, var(--divider-color, rgba(127, 127, 127, 0.2)));
        background: color-mix(in srgb, var(--card-background-color, #fff) 85%, transparent);
        color: var(--secondary-text-color, #727272);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: background-color 120ms, color 120ms;
      }
      .left { left: var(--pager-left, 0px); border-left: none; border-radius: 0 14px 14px 0; }
      .right { right: 0; border-right: none; border-radius: 14px 0 0 14px; }
      .arrow:hover, .arrow:active {
        color: var(--primary-color, #03a9f4);
        background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, var(--card-background-color, #fff));
      }
      .arrow:focus-visible {
        outline: 2px solid var(--primary-color, #03a9f4);
        outline-offset: -2px;
      }
      ha-icon { --mdc-icon-size: 24px; }
    `;
  }
}

@customElement('paul-pager-card')
export class PagerCard extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  /** Set by HA when the card is shown in the card editor's preview. */
  @property({ type: Boolean })
  public preview = false;

  @state()
  private _config!: PagerCardConfig;

  private _overlay?: PagerOverlay;
  private _ownPath?: string;
  private _touch?: { x: number; y: number; t: number };
  private _sidebarObserver?: ResizeObserver;

  public static async getConfigElement(): Promise<HTMLElement> {
    try {
      await import('./pager-card-editor.js');
    } catch (err) {
      console.error('[paul-pager-card] Failed to load config editor:', err);
    }
    return document.createElement('paul-pager-card-editor');
  }

  public static getStubConfig(): PagerCardConfig {
    return { type: 'custom:paul-pager-card', previous: '/lovelace/0', next: '/lovelace/1', swipe: true };
  }

  // Draws nothing in the grid itself; the arrows sit on the screen edges.
  public getGridOptions(): GridOptions {
    return { columns: 'full', rows: 'auto' };
  }

  public getCardSize(): number {
    return 0;
  }

  public setConfig(config: PagerCardConfig): void {
    if (config.pages != null && (!Array.isArray(config.pages) || config.pages.some((p) => typeof p !== 'string'))) {
      throw new Error('[paul-pager-card] pages must be a list of paths, e.g. ["/dashboard-wall/weather-now", "/dashboard-wall/weather-rain"].');
    }
    if (!config.pages?.length && !config.previous && !config.next) {
      throw new Error('[paul-pager-card] Set pages, or previous and/or next.');
    }
    for (const key of ['previous', 'next'] as const) {
      if (config[key] != null && typeof config[key] !== 'string') {
        throw new Error(`[paul-pager-card] ${key} must be a path, e.g. "/dashboard-wall/weather-rain".`);
      }
    }
    if (config.offset_top != null && (typeof config.offset_top !== 'number' || config.offset_top < 0)) {
      throw new Error('[paul-pager-card] offset_top must be a number of pixels, 0 or more.');
    }
    this._config = { swipe: true, ...config };
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this._ownPath = normalise(window.location.pathname);
    window.addEventListener('location-changed', this._sync);
    window.addEventListener('popstate', this._sync);
    window.addEventListener('touchstart', this._onTouchStart, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });
    window.addEventListener('resize', this._sync);
    this._sync();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('location-changed', this._sync);
    window.removeEventListener('popstate', this._sync);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('resize', this._sync);
    this._sidebarObserver?.disconnect();
    this._sidebarObserver = undefined;
    this._overlay?.remove();
    this._overlay = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('_config') || changed.has('preview')) this._sync();
  }

  /** Is the page this card belongs to the one on screen? HA may keep old views attached. */
  private _onOwnPage(): boolean {
    const here = normalise(window.location.pathname);
    const pages = (this._config.pages ?? []).map(normalise);
    return pages.length ? pages.includes(here) && here === this._ownPath : here === this._ownPath;
  }

  private _sync = (): void => {
    if (!this._config || !this.isConnected) return;
    const active = !this.preview && this._onOwnPage();
    if (!active) {
      this._overlay?.remove();
      this._overlay = undefined;
      return;
    }
    const { previous, next } = computeTargets(this._config, window.location.pathname);
    if (!this._overlay) {
      this._overlay = document.createElement('paul-pager-overlay');
      this._overlay.onGo = (path) => navigate(this, path);
      document.body.appendChild(this._overlay);
    }
    this._overlay.previous = previous;
    this._overlay.next = next;
    this._overlay.topOffset = this._config.offset_top;
    this._overlay.leftOffset = this._sidebarRight();
  };

  /**
   * Right edge of HA's sidebar when it's docked beside the content (full or collapsed to
   * icons), else 0. A hidden or modal sidebar (off-canvas, or covering half the screen)
   * doesn't count. Watches the sidebar so collapsing/expanding moves the arrow.
   */
  private _sidebarRight(): number {
    const main = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
    const sidebar = main?.shadowRoot?.querySelector('ha-sidebar') as HTMLElement | null | undefined;
    if (!sidebar) return 0;
    if (!this._sidebarObserver) {
      this._sidebarObserver = new ResizeObserver(() => this._sync());
      this._sidebarObserver.observe(sidebar);
    }
    const r = sidebar.getBoundingClientRect();
    return r.width > 0 && r.left >= 0 && r.right < window.innerWidth / 2 ? Math.round(r.right) : 0;
  }

  private _onTouchStart = (ev: TouchEvent): void => {
    this._touch = undefined;
    if (!this._config?.swipe || !this._overlay || ev.touches.length !== 1) return;
    const blocked = ev.composedPath().some((el) =>
      el instanceof HTMLElement && (SWIPE_IGNORE.has(el.tagName) || el.getAttribute('role') === 'slider'));
    if (blocked) return;
    const t = ev.touches[0];
    this._touch = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  private _onTouchEnd = (ev: TouchEvent): void => {
    const start = this._touch;
    this._touch = undefined;
    if (!start || !this._overlay) return;
    const t = ev.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Date.now() - start.t > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const target = dx < 0 ? this._overlay.next : this._overlay.previous;
    if (target) navigate(this, target);
  };

  protected render() {
    if (!this._config || !this.preview) return nothing;
    const { previous, next } = computeTargets(this._config, window.location.pathname);
    return html`
      <ha-card>
        <div class="preview">
          <ha-icon icon="mdi:gesture-swipe-horizontal"></ha-icon>
          <div>
            <strong>Page arrows</strong><br />
            Previous: ${previous ?? '—'} · Next: ${next ?? '—'}${this._config.swipe ? ' · Swipe on' : ''}
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host { display: block; }
      .preview {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        font-size: 0.9rem;
        color: var(--secondary-text-color);
      }
      .preview strong { color: var(--primary-text-color); }
      .preview ha-icon { color: var(--primary-color); }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paul-pager-card': PagerCard;
    'paul-pager-overlay': PagerOverlay;
  }
}

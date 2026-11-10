// Home Assistant's standard action config (navigate / url / more-info / none / …).
export type { ActionConfig } from 'custom-card-helpers';
import type { ActionConfig } from 'custom-card-helpers';

export interface LinkCardConfig {
  type: string;
  /** Required — text shown next to the icon */
  title: string;
  /** MDI icon, e.g. `mdi:sofa` (default `mdi:link-variant`) */
  icon?: string;
  /** Icon colour; theme variables work, e.g. `var(--accent-color)` (default `--primary-color`) */
  color?: string;
  /** Show a chevron on the right as a "go there" hint (default true) */
  show_arrow?: boolean;
  /**
   * What a tap does — usually `{ action: 'navigate', navigation_path: '/dashboard-rooms/kitchen' }`.
   * `{ action: 'none' }` makes it a plain, non-clickable label.
   */
  tap_action?: ActionConfig;
}

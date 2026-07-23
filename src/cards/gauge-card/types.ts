export interface GaugeLevelConfig {
  min: number;
  max: number;
  icon: string;
  color: string;
  label?: string;
}

export type ColorMode = 'distinct' | 'gradient';

// Re-exported so consumers only import from this module. This is Home Assistant's
// standard action config (more-info / navigate / url / none / …).
export type { ActionConfig } from 'custom-card-helpers';
import type { ActionConfig } from 'custom-card-helpers';

export interface GaugeCardConfig {
  type: string;
  entity: string;
  name?: string;
  unit?: string;
  decimals?: number;
  show_name?: boolean;
  show_unit?: boolean;
  color_mode?: ColorMode;
  /**
   * What happens on tap. Defaults to `{ action: 'more-info' }` — opens Home
   * Assistant's more-info dialog (with its history graph) for `entity`.
   * Set `{ action: 'none' }` to make the gauge a passive display again.
   */
  tap_action?: ActionConfig;
  levels: GaugeLevelConfig[];
}

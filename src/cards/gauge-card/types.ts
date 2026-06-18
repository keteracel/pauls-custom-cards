export interface GaugeLevelConfig {
  min: number;
  max: number;
  icon: string;
  color: string;
  label?: string;
}

export type ColorMode = 'distinct' | 'gradient';

export interface GaugeCardConfig {
  type: string;
  entity: string;
  name?: string;
  unit?: string;
  show_name?: boolean;
  show_unit?: boolean;
  color_mode?: ColorMode;
  levels: GaugeLevelConfig[];
}

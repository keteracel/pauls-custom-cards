export interface WindCardConfig {
  type: string;
  title?: string;
  /** Required — numeric wind speed sensor */
  speed_entity: string;
  /** Required — wind direction sensor: degrees (0–360) or a cardinal string (N, NNE, …) */
  direction_entity: string;
  /** Optional — maximum / gust speed sensor */
  gust_entity?: string;
  /** Optional — average speed sensor */
  average_speed_entity?: string;
  /** Optional — average direction sensor (degrees or cardinal) */
  average_direction_entity?: string;
  /** Override the speed unit (defaults to the speed entity's unit_of_measurement) */
  unit?: string;
  /** Speed decimal places (default 1) */
  decimals?: number;
  /** Show N/E/S/W labels on the compass rose (default true) */
  show_cardinal?: boolean;
  /**
   * Meteorological convention: when true (default) the needle points to where the
   * wind comes FROM. When false it points to where the wind is going TO.
   */
  direction_from?: boolean;
}

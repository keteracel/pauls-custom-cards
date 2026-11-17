export interface PagerCardConfig {
  type: string;
  /**
   * The pages in order, as navigation paths, e.g.
   * `['/dashboard-wall/weather-now', '/dashboard-wall/weather-rain']`.
   * The card finds the current page in this list, so the same config can go on every page.
   */
  pages?: string[];
  /** Path for the left arrow / swipe right. Overrides `pages`. */
  previous?: string;
  /** Path for the right arrow / swipe left. Overrides `pages`. */
  next?: string;
  /** Turn pages by swiping left/right on a touchscreen (default true) */
  swipe?: boolean;
  /** Distance in px from the top of the screen to the arrows (default: below HA's header) */
  offset_top?: number;
}

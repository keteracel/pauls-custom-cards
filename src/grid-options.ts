/**
 * Default size of a card in a sections dashboard, returned by getGridOptions().
 * Sections are 12 columns wide; each row is 56px plus an 8px gap.
 * 'full' spans the whole section and 'auto' sizes rows to the content.
 */
export interface GridOptions {
  columns?: number | 'full';
  rows?: number | 'auto';
  min_columns?: number;
  max_columns?: number;
  min_rows?: number;
  max_rows?: number;
}

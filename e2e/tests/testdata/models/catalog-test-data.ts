export const catalogData = {
  project: 'default',
  heading: 'Model Catalog',
} as const;

/**
 * Every option in the catalog "All Filters" menu, in the order the toolbar renders them.
 * `label` is the accessible name of the toolbar filter button; `checkbox` is the suffix of the
 * menu row's `data-testid` (`input_checkbox_<checkbox>`).
 */
export const catalogFilterOptions = [
  { label: 'Publisher', checkbox: 'publishers' },
  { label: 'License', checkbox: 'licenses' },
  { label: 'Purpose', checkbox: 'purposes' },
  { label: 'Tags', checkbox: 'tags' },
  { label: 'Language', checkbox: 'languages' },
  { label: 'Country of Origin', checkbox: 'countries' },
  { label: 'File Type', checkbox: 'files' },
  { label: 'Evaluations', checkbox: 'evaluations' },
] as const;

/**
 * Every option in the catalog "Choose columns" menu, in the order it lists them. Each label is both the
 * menu row's visible text and the suffix of its `data-testid` (`input_checkbox_<label>`).
 */
export const catalogColumnOptions = [
  'Publisher',
  'Date Published',
  'License',
  'Purpose',
  'Tags',
  'Language',
  'Country of Origin',
  'Size',
  'RAM',
  'File',
] as const;

/** The model table's fixed column: always rendered, with no option in the "Choose columns" menu. */
export const catalogFixedColumn = 'Name';

/**
 * How a column's cells have to be read before two of them can be compared:
 * - `text` — compared case-insensitively, the way the table orders them
 * - `date` — the published date the cell spells out, e.g. "Aug 9, 2026"
 * - `size` — an amount with a unit suffix, e.g. "1.12 TB", compared as bytes
 * - `count` — how many comma-separated values the cell lists, which is what the table orders by
 */
export type CatalogSortValueKind = 'text' | 'date' | 'size' | 'count';

export type CatalogSortableColumn = {
  /** The column header's accessible name. */
  label: string;
  kind: CatalogSortValueKind;
};

/** Every model table column whose header carries a sort control, in the order the table renders them. */
export const catalogSortableColumns: readonly CatalogSortableColumn[] = [
  { label: 'Name', kind: 'text' },
  { label: 'Publisher', kind: 'text' },
  { label: 'Date Published', kind: 'date' },
  { label: 'License', kind: 'text' },
  { label: 'Purpose', kind: 'text' },
  { label: 'Language', kind: 'count' },
  { label: 'Country of Origin', kind: 'text' },
  { label: 'Size', kind: 'size' },
  { label: 'RAM', kind: 'size' },
];

/** Byte multiplier per unit suffix a Size or RAM cell can carry; only their relative order matters. */
export const catalogSizeUnits: Readonly<Record<string, number>> = {
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
};

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

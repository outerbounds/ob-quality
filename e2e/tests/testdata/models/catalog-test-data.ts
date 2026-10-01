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

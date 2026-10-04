import { escapeRegExp } from '@anaconda/playwright-utils';
import { packageSourcesData } from '@testdata/perimeters/package-sources-test-data';

/** Tabs are marked active only by this class (matched as a whole class name); there is no aria-selected attribute. */
export const SELECTED_CLASS = new RegExp(`\\b${escapeRegExp(packageSourcesData.selectedClass)}\\b`);

/** Narrows parsed JSON to a plain object, so its fields can be read without a cast. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns `value`, or throws `message` when it is missing (a precondition, not an assertion under test). */
export function requireValue<valueType>(value: valueType | null | undefined, message: string): valueType {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

// @ts-nocheck
/**
 * API Utils Template
 *
 * Add shared validation helpers to the project's shared API utils module,
 * e.g. tests/pages/api/api-utils.ts. Reuse the existing module if there is one, and add
 * only the helpers it is missing.
 *
 * This file holds validators and list-response helpers used across multiple API classes
 * (field-level checks, UUID/date formats, first-list-item extraction, assertion context).
 *
 * Keep feature-specific helpers in the feature API class instead:
 * - verifyFeatureItemData() — validates one complete response item
 *
 * This is a menu, not a required set: copy only the helpers your endpoints actually use and
 * leave the rest out. An unused validator is dead code — a project whose ids are numeric has
 * no use for verifyUuidFormat, and one with no nullable fields has no use for the verifyNullable*
 * family. Add them later when a real response needs them.
 */

import { expect } from '@anaconda/playwright-utils';
/**
 * Minimal shape for building assertion context labels from list/detail items.
 * `name` stands in for whatever the entity's human-readable label is — if the API calls it
 * something else (`title`, `slug`, `displayName`), either rename the property here to match
 * or pass an adapted object: `formatAssertionContext({ id: post.id, name: post.title })`.
 */
export interface AssertionContextItem {
  id?: string | number;
  name?: string | null;
}

/** One common list response envelope: `{ data: T[] }`. */
export interface ListDataResponse<T> {
  data: T[];
}

/**
 * A list response body. The two most common shapes are a bare array and a `{ data: T[] }`
 * envelope; `getFirstListItem` accepts either. If the API wraps its list under a different
 * key (`items`, `results`, `content`), add that shape to this union and to the unwrap below.
 * Also update FeatureListResponse and the API class's private getListItems parameter type
 * and extraction; its list/pagination/filter verifiers do not use this shared unwrap.
 */
export type ListResponseBody<T> = T[] | ListDataResponse<T>;

export function formatAssertionContext(item: AssertionContextItem, entityLabel = 'Item'): string {
  if (typeof item.name === 'string' && item.name.trim()) {
    return `${entityLabel} "${item.name}"`;
  }
  // Explicit null/undefined check — a numeric id of 0 is falsy but still identifies the item.
  if (item.id !== undefined && item.id !== null) return `${entityLabel} id="${item.id}"`;
  return `${entityLabel} (unidentified)`;
}

export function getFirstListItem<T>(body: ListResponseBody<T>): T {
  const items = Array.isArray(body) ? body : body.data;

  expect(Array.isArray(items), 'Expected the response body to contain a list of items').toBe(true);
  expect(items.length, 'Expected at least one item in the list response').toBeGreaterThan(0);

  const item = items[0];
  expect(item, 'Expected first item to be defined').toBeDefined();

  return item;
}

// Regex patterns for common field formats
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Checks wire-format shape only, not calendar or business-date validity. Add endpoint-specific
// semantic validation when the API contract requires it.
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

// Required field validators
export function verifyString(value: unknown, fieldName: string, ctx: string): void {
  expect(typeof value, `${ctx}: ${fieldName} should be a string`).toBe('string');
}

export function verifyNonEmptyString(value: unknown, fieldName: string, ctx: string): void {
  expect(typeof value, `${ctx}: ${fieldName} should be a string`).toBe('string');
  expect((value as string).trim().length, `${ctx}: ${fieldName} should be non-empty`).toBeGreaterThan(0);
}

export function verifyNumber(value: unknown, fieldName: string, ctx: string): void {
  expect(typeof value, `${ctx}: ${fieldName} should be a number`).toBe('number');
}

export function verifyBoolean(value: unknown, fieldName: string, ctx: string): void {
  expect(typeof value, `${ctx}: ${fieldName} should be a boolean`).toBe('boolean');
}

// Format validator
export function verifyUuidFormat(value: string, fieldName: string, ctx: string): void {
  expect(typeof value, `${ctx}: ${fieldName} should be a string`).toBe('string');

  expect(UUID_PATTERN.test(value), `${ctx}: ${fieldName} should be valid UUID format, got: ${value}`).toBe(true);
}

// Nullable field validators
export function verifyNullableString(value: unknown, fieldName: string, ctx: string): void {
  expect(value === null || typeof value === 'string', `${ctx}: ${fieldName} should be null or a string`).toBe(true);
}

export function verifyNullableNumber(value: unknown, fieldName: string, ctx: string): void {
  expect(value === null || typeof value === 'number', `${ctx}: ${fieldName} should be null or a number`).toBe(true);
}

export function verifyNullableBoolean(value: unknown, fieldName: string, ctx: string): void {
  expect(value === null || typeof value === 'boolean', `${ctx}: ${fieldName} should be null or a boolean`).toBe(true);
}

export function verifyNullableIsoDate(value: unknown, fieldName: string, ctx: string): void {
  expect(value === null || typeof value === 'string', `${ctx}: ${fieldName} should be null or a string`).toBe(true);

  if (typeof value === 'string') {
    expect(
      ISO_DATE_PATTERN.test(value),
      `${ctx}: ${fieldName} should be ISO-8601 date or datetime format, got: ${value}`,
    ).toBe(true);
  }
}

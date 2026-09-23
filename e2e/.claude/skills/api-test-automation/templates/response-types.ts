// @ts-nocheck
/**
 * Response Types Template
 *
 * Copy to the project's API test-data directory, e.g. tests/testdata/api/<feature>-response-types.ts.
 * If the project keeps response interfaces elsewhere, follow that convention instead.
 *
 * Replace:
 * - FeatureItem → your item interface name (e.g. OrderItem, UserItem)
 * - FeatureListResponse / FeatureDetailResponse → your list and detail response interfaces
 * - Every field below → the fields the API response actually returns
 *
 * The `{ data: ... }` envelope and the field set below are illustrative. Derive both from
 * the endpoint's contract (OpenAPI/Swagger schema) or an observed response — do not assume.
 *
 * Plenty of APIs return no envelope at all. When the list endpoint returns a bare array and
 * the detail endpoint returns the item itself, say exactly that — aliases are enough, and
 * inventing a wrapper the API does not send will fail at the first assertion:
 *   export type FeatureListResponse = FeatureItem[];
 *   export type FeatureDetailResponse = FeatureItem;
 * For a bare detail response, also change the API class's detail assertion to read
 * responseBody directly instead of responseBody.data, even if the item has a data field.
 */

export interface FeatureItem {
  // Set this to the contract's ID type (e.g. number). Request and verification
  // parameters derive from it; also replace the API class's UUID validator as needed.
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeatureListResponse {
  data: FeatureItem[];
  total?: number;
  offset?: number;
  limit?: number;
}

export interface FeatureDetailResponse {
  data: FeatureItem;
}

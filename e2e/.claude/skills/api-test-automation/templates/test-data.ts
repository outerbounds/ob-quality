// @ts-nocheck
/**
 * Test Data Template
 *
 * Copy to the project's API test-data directory, e.g. tests/testdata/api/<feature>-test-data.ts.
 *
 * Replace:
 * - FeatureListQueryParams → your query params interface name
 * - Add feature-specific test data as needed
 *
 * Note: For positive tests requiring valid IDs, prefer response-derived data (fetch from the
 * list endpoint) over stable constants. Only add knownItemId if it is explicitly confirmed to
 * exist in every environment the suite targets.
 *
 * Never put credentials, tokens, API keys, or private hostnames in this file — those are
 * environment configuration and belong in process.env / the Playwright config.
 */

import { type FeatureItem } from '@testdata/api/feature-response-types';

// Optional: valid ID only if explicitly confirmed stable across all target environments.
// export const knownItemId = 'REPLACE_ME_with_stable_id_from_seed_data';

// Invalid format (for 422 tests)
export const invalidIdPath = 'not-a-valid-uuid';

// Non-existent but valid-format ID for 404 tests. Replace this example with an ID the
// project confirms is absent in every target environment, or use its endpoint-specific
// strategy for selecting an absent ID. No fixed UUID is universally guaranteed absent.
// This UUID is only an example for a UUID contract. Whenever FeatureItem['id'] changes,
// replace this value with that contract's type and format (for numeric IDs, a number
// within the allowed range, confirmed absent). Do not reuse this UUID for numeric APIs.
// The optional detail-auth test also uses this value and requires a valid format;
// confirm the endpoint returns 401 before resource lookup, otherwise use a known valid ID.
export const nonExistentId = '00000000-0000-0000-0000-000000000000';

// Test data types only — query/request params can live here.
// API response interfaces belong in the feature response-types file.
export interface FeatureListQueryParams {
  id?: FeatureItem['id'];
  name?: string;
  limit?: number;
  offset?: number;
}

// Reusable query values
export const featureListLimit = 5;

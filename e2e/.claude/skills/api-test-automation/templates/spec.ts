// @ts-nocheck
/**
 * Combined List + Detail Endpoint Spec Template
 *
 * Copy to the project's API spec directory, e.g. tests/specs/api/<feature>-api.spec.ts.
 *
 * Replace:
 * - featureApi → your fixture name (match the project's casing convention)
 * - @feature tag → your feature tag; keep the project's existing suite tags too (e.g. @smoke, @reg)
 * - testData → import from your feature test-data file via the project's alias
 *
 * ID Strategy:
 * - Default: derive the ID from a list response — reliable across environments
 * - Alternative: use a stable constant only when explicitly confirmed to exist in every environment
 * - The response-derived test is enabled by default; uncomment the stable-ID test only when confirmed
 */

import { test } from '@fixture';
import * as testData from '@testdata/api/feature-test-data';

test.describe('Feature API tests @api @feature', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // LIST ENDPOINT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  // POSITIVE TEST: Verify GET /feature returns default list
  test('GET /feature - should return default list', async ({ featureApi }) => {
    const response = await featureApi.runListFeatureRequest();
    await featureApi.verifyListFeatureResponse(response);
  });

  // POSITIVE TEST: Verify GET /feature?id= filters by id
  test('GET /feature?id= - should filter by id', async ({ featureApi }) => {
    const item = await test.step('Get valid item from list', async () => {
      const listResponse = await featureApi.runListFeatureRequest();
      await featureApi.verifyListFeatureResponse(listResponse);
      return featureApi.getFirstItem(listResponse);
    });

    await test.step('Filter by extracted id', async () => {
      const filterResponse = await featureApi.runListFeatureRequest({ id: item.id });
      await featureApi.verifyFilterByIdResponse(filterResponse, item.id);
    });
  });

  // OPTIONAL POSITIVE TEST: Include only when the endpoint actually supports limit/offset.
  /*
  test('GET /feature?limit= - should limit results', async ({ featureApi }) => {
    const response = await featureApi.runListFeatureRequest({ limit: testData.featureListLimit });
    await featureApi.verifyPaginatedListFeatureResponse(response, testData.featureListLimit);
  });
  */

  // ─────────────────────────────────────────────────────────────────────────────
  // DETAIL ENDPOINT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  // POSITIVE TEST: Default approach — derive the ID from the list endpoint,
  // which is more reliable across environments than a hardcoded constant.
  test('GET /feature/{id} - should return feature details', async ({ featureApi }) => {
    const item = await test.step('Get valid item from list', async () => {
      const listResponse = await featureApi.runListFeatureRequest();
      await featureApi.verifyListFeatureResponse(listResponse);
      return featureApi.getFirstItem(listResponse);
    });

    await test.step('Fetch feature details by ID', async () => {
      const response = await featureApi.runGetFeatureByIdRequest(item.id);
      await featureApi.verifyGetFeatureByIdResponse(response, item.id);
    });
  });

  // POSITIVE TEST: Alternative — use a stable constant only when explicitly confirmed.
  // Uncomment only when knownItemId is confirmed present in every target environment.
  /*
  test('GET /feature/{id} - should return item by stable ID', async ({ featureApi }) => {
    const response = await featureApi.runGetFeatureByIdRequest(testData.knownItemId);
    await featureApi.verifyGetFeatureByIdResponse(response, testData.knownItemId);
  });
  */

  // NEGATIVE TEST: Verify GET /feature/{id} returns 422 for invalid ID
  test('GET /feature/{id} - should return 422 for invalid ID', async ({ featureApi }) => {
    const response = await featureApi.runGetFeatureByIdRequest(testData.invalidIdPath);
    featureApi.verifyUnprocessableEntityResponse(response);
  });

  // OPTIONAL NEGATIVE TEST: Uncomment only after adapting nonExistentId to the contract's
  // ID type, format, and allowed range and confirming it is absent in every target
  // environment, or replacing it with the endpoint's project-specific absent-ID strategy.
  // Numeric APIs require a valid numeric value here, not the example UUID.
  /*
  test('GET /feature/{id} - should return 404 for non-existent ID', async ({ featureApi }) => {
    const response = await featureApi.runGetFeatureByIdRequest(testData.nonExistentId);
    featureApi.verifyNotFoundResponse(response);
  });
  */
});

// OPTIONAL: Uncomment this entire suite only after confirming the endpoint requires
// authentication. Leave it disabled for public endpoints.
/*
test.describe('Feature API auth validation tests @api @feature', () => {
  // Auth validation: remove credentials carried by either request headers or storage state.
  // `extraHTTPHeaders` is REPLACED, not merged, so an empty object drops whatever
  // auth header the Playwright config normally supplies. `page.request` shares the
  // browser context's cookies, so storageState must also be cleared.
  //
  // If the API requires a non-auth header on every request, re-declare just that one
  // here. Example from a project that pins an API version per request — adapt the
  // header name and value source to your project, or delete this block:
  //
  //   import { API_VERSION } from '@playwright-config';
  //   test.use({
  //     extraHTTPHeaders: { 'X-Example-Api-Version': API_VERSION },
  //     storageState: { cookies: [], origins: [] },
  //   });
  test.use({
    extraHTTPHeaders: {},
    storageState: { cookies: [], origins: [] },
  });

  // NEGATIVE TEST: Verify GET /feature returns 401 without auth
  test('GET /feature - should return 401 without auth', async ({ featureApi }) => {
    const response = await featureApi.runListFeatureRequest();
    featureApi.verifyUnauthorizedResponse(response);
  });

  // NEGATIVE TEST: Verify GET /feature/{id} returns 401 without auth.
  // Reuse the contract-valid nonExistentId prepared for the 404 case (replace the UUID
  // for numeric IDs). Confirm auth runs before resource lookup; otherwise supply an
  // existing contract-valid ID from the project's setup so this case exercises auth.
  test('GET /feature/{id} - should return 401 without auth', async ({ featureApi }) => {
    const response = await featureApi.runGetFeatureByIdRequest(testData.nonExistentId);
    featureApi.verifyUnauthorizedResponse(response);
  });
});
*/

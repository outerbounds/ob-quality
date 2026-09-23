// @ts-nocheck
/**
 * API Class Template
 *
 * Copy to the project's API page-object directory, e.g. tests/pages/api/<feature>-api.ts.
 *
 * Replace:
 * - FeatureAPI → your API class name (e.g. OrdersAPI, UsersAPI)
 * - FeatureItem, FeatureListResponse, FeatureDetailResponse → your interfaces from the response-types file
 * - FeatureListQueryParams → your query params interface from the feature test-data file
 * - featureListRequest, featureByIdRequest → your endpoint builders
 * - Import paths and aliases → whatever the project's tsconfig paths define
 *
 * The `{ data: ... }` response envelope below is one common shape, not a universal one —
 * FeatureListResponse/FeatureDetailResponse may instead be a bare array/item (see
 * response-types.ts). List assertions unwrap either shape via getListItems. For other
 * list keys, update its parameter type and extraction as well as the shared helper
 * (see the comment on getListItems below). Detail
 * assertions use the declared contract: keep responseBody.data for an envelope, or use
 * responseBody directly for a bare item. Do not infer an envelope from a data property —
 * a bare item may itself have that field.
 */

import { expect, getRequest } from '@anaconda/playwright-utils';
import { type APIResponse } from '@playwright/test';
import {
  type FeatureDetailResponse,
  type FeatureItem,
  type FeatureListResponse,
} from '@testdata/api/feature-response-types';
import { type FeatureListQueryParams } from '@testdata/api/feature-test-data';
import * as apiEndpoints from './api-endpoints';
import { formatAssertionContext, getFirstListItem, verifyUuidFormat } from './api-utils';
import { ResponseVerifier } from './response-verifier';

export class FeatureAPI extends ResponseVerifier {
  // ============ ACTION METHODS ============

  public async runListFeatureRequest(params?: FeatureListQueryParams): Promise<APIResponse> {
    return await getRequest(apiEndpoints.featureListRequest(params));
  }

  // Strings also allow malformed-ID inputs when the contract uses numeric IDs.
  public async runGetFeatureByIdRequest(id: FeatureItem['id'] | string): Promise<APIResponse> {
    return await getRequest(apiEndpoints.featureByIdRequest(id));
  }

  // ============ ASSERT METHODS ============

  public async verifyListFeatureResponse(response: APIResponse): Promise<void> {
    this.verifyOkResponse(response);
    const body = (await response.json()) as FeatureListResponse;
    const items = this.getListItems(body);

    expect(Array.isArray(items), 'Expected the response body to contain a list of items').toBe(true);

    for (const item of items) {
      this.verifyFeatureItemData(item);
    }
  }

  // Include this only when the endpoint supports limit/offset.
  public async verifyPaginatedListFeatureResponse(response: APIResponse, limit: number): Promise<void> {
    this.verifyOkResponse(response);
    const body = (await response.json()) as FeatureListResponse;
    const items = this.getListItems(body);

    expect(Array.isArray(items), 'Expected the response body to contain a list of items').toBe(true);
    expect(items.length, `Expected length <= ${limit}`).toBeLessThanOrEqual(limit);

    for (const item of items) {
      this.verifyFeatureItemData(item);
    }
  }

  public async verifyGetFeatureByIdResponse(response: APIResponse, expectedId: FeatureItem['id']): Promise<void> {
    this.verifyOkResponse(response);

    const responseBody = (await response.json()) as FeatureDetailResponse;
    // For a bare-item contract, use responseBody directly instead.
    const item = responseBody.data;

    expect(item, 'Expected response body to contain data object').toBeTruthy();

    expect(item.id, `Expected data.id to equal requested id "${expectedId}"`).toBe(expectedId);

    this.verifyFeatureItemData(item);
  }

  public async verifyFilterByIdResponse(response: APIResponse, expectedId: FeatureItem['id']): Promise<void> {
    this.verifyOkResponse(response);
    const body = (await response.json()) as FeatureListResponse;
    const items = this.getListItems(body);

    expect(Array.isArray(items), 'Expected the response body to contain a list of items').toBe(true);
    expect(items.length, `Expected at least one item with id=${expectedId}`).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.id, `Expected item id to be ${expectedId}`).toBe(expectedId);
      this.verifyFeatureItemData(item);
    }
  }

  // ============ INTERNAL VALIDATORS ============

  // Internal validator — called by ASSERT methods above.
  // These UUID `id` and string `name` assertions are examples only. Replace them before
  // using this template unless the endpoint contract explicitly guarantees both fields.
  // Numeric or opaque IDs, different field names, nullable fields, and resources without
  // names each require their own contract-specific assertions.
  protected verifyFeatureItemData(item: FeatureItem): void {
    const ctx = formatAssertionContext(item);

    verifyUuidFormat(item.id, 'id', ctx);
    expect(typeof item.name, `${ctx}: name should be string`).toBe('string');
  }

  // ============ HELPER METHODS ============

  public async getFirstItem(response: APIResponse): Promise<FeatureItem> {
    const body = (await response.json()) as FeatureListResponse;
    return getFirstListItem<FeatureItem>(body);
  }

  // Unwraps either a bare array or a `{ data: [...] }` envelope. Delete this helper and use
  // `body.data` / `body` directly once the project settles on one shape.
  // For another contract key (items/results/content), update this parameter type and
  // extraction too — changing ListResponseBody/getFirstListItem in api-utils.ts is not
  // enough. For example: getListItems(body: FeatureListResponse) returning body.items.
  private getListItems(body: FeatureItem[] | { data: FeatureItem[] }): FeatureItem[] {
    return Array.isArray(body) ? body : body.data;
  }
}

// @ts-nocheck
/**
 * API Endpoints Template
 *
 * Add these endpoint builders to the project's endpoints module,
 * e.g. tests/pages/api/api-endpoints.ts. Reuse the existing module if there is one.
 *
 * Replace:
 * - api/<resource> → the endpoint's actual path
 * - featureHealthRequest, featureByIdRequest, featureListRequest → your endpoint names
 * - FeatureListQueryParams → your query params interface from the feature test-data file
 * - The base-URL import → however this project exposes its base URL (see below)
 *
 * Base URL: this template imports a `BASE_URL` constant exported from the Playwright
 * config through the `@playwright-config` alias, which is one common convention. Check
 * `tsconfig.json` paths and `playwright.config.ts` for what the project actually does —
 * it may export a differently named constant, read `process.env` directly, or rely on
 * `use.baseURL` with relative request paths. Never hardcode a hostname here.
 */

import { BASE_URL } from '@playwright-config';
import { type FeatureItem } from '@testdata/api/feature-response-types';
import { type FeatureListQueryParams } from '@testdata/api/feature-test-data';

// Keep a path prefix in BASE_URL (for example, https://host/gateway/) when
// building API URLs. Endpoint paths must be relative, without a leading slash.
const buildEndpointUrl = (endpointPath: string): URL => {
  const baseUrl = new URL(BASE_URL);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/`;
  return new URL(endpointPath.replace(/^\/+/, ''), baseUrl);
};

// Static endpoint (no params)
export const featureHealthRequest = buildEndpointUrl('api/<resource>/healthz').toString();

// Accept malformed strings for negative tests as well as the contract's ID type.
export const featureByIdRequest = (id: FeatureItem['id'] | string): string =>
  buildEndpointUrl(`api/<resource>/${encodeURIComponent(String(id))}`).toString();

// List endpoint with query params
export const featureListRequest = (params?: FeatureListQueryParams): string => {
  const url = buildEndpointUrl('api/<resource>');
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.append(k, String(v));
    });
  }
  return url.toString();
};

// @ts-nocheck
/**
 * Response Verifier Template
 *
 * Copy to the project's API page-object directory, e.g. tests/pages/api/response-verifier.ts.
 * If the project already has an equivalent base class, extend that one instead and add any
 * missing status helpers there.
 *
 * This base class provides standard HTTP status code verification methods.
 * All feature-specific API classes should extend it to inherit common response
 * validation behavior (200/401/403/404/422 checks).
 *
 * Usage:
 *   export class FeatureAPI extends ResponseVerifier {
 *     // Feature-specific ACTION and ASSERT methods
 *   }
 */

import { expect } from '@anaconda/playwright-utils';
import { type APIResponse } from '@playwright/test';

export class ResponseVerifier {
  // ASSERT: Verify HTTP status code and optional status text
  protected verifyResponse(response: APIResponse, expectedStatus: number, expectedStatusText?: string): void {
    const actualStatus = response.status();

    expect(actualStatus, `Expected status code ${expectedStatus}, but received ${actualStatus}.`).toBe(expectedStatus);

    if (expectedStatusText) {
      const actualStatusText = response.statusText();

      if (actualStatusText) {
        expect(
          actualStatusText,
          `Expected status text "${expectedStatusText}", but received "${actualStatusText}".`,
        ).toBe(expectedStatusText);
      }
    }
  }

  // ASSERT: Verify 200 OK response
  public verifyOkResponse(response: APIResponse): void {
    this.verifyResponse(response, 200, 'OK');
  }

  // ASSERT: Verify 401 Unauthorized response
  public verifyUnauthorizedResponse(response: APIResponse): void {
    this.verifyResponse(response, 401, 'Unauthorized');
  }

  // ASSERT: Verify 403 Forbidden response
  public verifyForbiddenResponse(response: APIResponse): void {
    this.verifyResponse(response, 403, 'Forbidden');
  }

  // ASSERT: Verify 404 Not Found response
  public verifyNotFoundResponse(response: APIResponse): void {
    this.verifyResponse(response, 404, 'Not Found');
  }

  // ASSERT: Verify 422 Unprocessable Entity response
  public verifyUnprocessableEntityResponse(response: APIResponse): void {
    this.verifyResponse(response, 422, 'Unprocessable Entity');
  }
}

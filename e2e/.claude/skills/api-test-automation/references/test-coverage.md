# Test Coverage Requirements

Coverage baselines by endpoint type. Confirm the endpoint's actual contract before applying a row — status codes, pagination support, and error semantics vary by service and framework.

## By Endpoint Type

### List Endpoints (GET /resource)

| Scenario             | Type     | Test                                                          |
| -------------------- | -------- | ------------------------------------------------------------- |
| Default list         | Positive | Returns data with correct structure                           |
| Pagination offset    | Positive | `offset` skips correct rows (if supported)                    |
| Pagination limit     | Positive | `limit` caps result count (if supported)                      |
| Filter by field      | Positive | Results match filter value                                    |
| Search               | Positive | Results contain search term                                   |
| No or invalid auth   | Negative | Returns 401 Unauthorized (only if the endpoint requires auth) |
| Lower-privilege user | Negative | Returns 403 Forbidden (only if the endpoint enforces roles)   |

> **Note:** Not all list endpoints support pagination. Use a plain list assertion for simple lists, and add a paginated variant (e.g. `verifyPaginatedListFeatureResponse(response, limit)`) only when the endpoint supports `limit`/`offset` params.

### Detail Endpoints (GET /resource/{id})

| Scenario             | Type     | Test                                                          |
| -------------------- | -------- | ------------------------------------------------------------- |
| Valid ID             | Positive | Returns item with matching ID                                 |
| Invalid ID format    | Negative | Returns 422 Unprocessable Entity                              |
| Non-existent ID      | Negative | Returns 404 Not Found                                         |
| No or invalid auth   | Negative | Returns 401 Unauthorized (only if the endpoint requires auth) |
| Lower-privilege user | Negative | Returns 403 Forbidden (only if the endpoint enforces roles)   |

### Create Endpoints (POST /resource)

| Scenario               | Type     | Test                                              |
| ---------------------- | -------- | ------------------------------------------------- |
| Valid payload          | Positive | Returns 201 with created item                     |
| Missing required field | Negative | Returns 422                                       |
| Invalid field value    | Negative | Returns 422                                       |
| No or invalid auth     | Negative | Returns 401 (only if the endpoint requires auth)  |
| Lower-privilege user   | Negative | Returns 403 (only if the endpoint enforces roles) |

### Update Endpoints (PUT/PATCH /resource/{id})

| Scenario             | Type     | Test                                              |
| -------------------- | -------- | ------------------------------------------------- |
| Valid update         | Positive | Returns 200 with updated item                     |
| Invalid ID           | Negative | Returns 422                                       |
| Non-existent ID      | Negative | Returns 404                                       |
| Invalid payload      | Negative | Returns 422                                       |
| No or invalid auth   | Negative | Returns 401 (only if the endpoint requires auth)  |
| Lower-privilege user | Negative | Returns 403 (only if the endpoint enforces roles) |

### Delete Endpoints (DELETE /resource/{id})

| Scenario             | Type     | Test                                              |
| -------------------- | -------- | ------------------------------------------------- |
| Valid delete         | Positive | Returns 204 No Content                            |
| Invalid ID           | Negative | Returns 422                                       |
| Non-existent ID      | Negative | Returns 404                                       |
| No or invalid auth   | Negative | Returns 401 (only if the endpoint requires auth)  |
| Lower-privilege user | Negative | Returns 403 (only if the endpoint enforces roles) |

> **Note:** Status codes above are the common REST defaults. Some services return 400 rather than 422 for malformed input, or 200 rather than 204 on delete — verify against the endpoint's contract or an observed response before asserting.

### Authorization Coverage (401 vs 403)

The two are different failures — cover them separately, and never conflate them in one test.

- **401 Unauthorized — conditional.** Add it only when the endpoint requires authentication. Cover a request with **no credential** and, where the API distinguishes it, one with an **invalid or expired credential**. Drop the auth header (or clear the storage state) the way `../templates/spec.ts` shows; for an invalid credential, send a syntactically valid but non-working value supplied by the project's configuration. For a public endpoint there is no 401 to assert — leave the auth-validation `test.describe` in `../templates/spec.ts` commented out and note in your report that the endpoint is unauthenticated.
- **403 Forbidden — conditional.** Add it only when **both** hold: the endpoint actually has role or permission behaviour to exercise, **and** the project already provides a safe lower-privilege account or fixture to authenticate as. If either is missing, skip the 403 scenario and note the gap rather than inventing an account.

Credentials for both cases come from the project's existing auth setup — environment variables read in `playwright.config.ts`, a storage-state project, or an existing fixture. Never hard-code a credential, token, API key, or password in a spec, an API class, or a test-data file (see `test-data-selection.md` § Never Commit Secrets as Test Data).

### Destructive Scenarios and Shared Environments

Where a suite runs against a shared or production-like environment, avoid destructive POST/PATCH/DELETE tests unless the endpoint has safe test data, a cleanup mechanism, or explicit approval. Projects commonly express this with a tag that marks environment-safe scenarios (for example `@prod`) — use the project's existing tag vocabulary rather than introducing a new one.

### Mutation Lifecycle (Create / Update / Delete)

A mutation test owns the data it mutates. Never mutate shared seed data or a record another test depends on — create your own record, then leave the system as you found it.

1. **Create the record the test needs** inside the test (or a per-test fixture), and **verify the create response** — status plus the identifier and fields you will act on next.
2. **Update through the API and verify the change**, either from the update response body or with a follow-up read of the same record.
3. **Delete the record and verify the deletion** — assert the delete status, and where the API supports it, confirm a follow-up read returns 404.
4. **Always clean up.** Wrap the mutation in `try`/`finally` and delete in the `finally` block, or use the project's existing cleanup fixture if it has one — cleanup must run even when an assertion fails midway.
5. **Make cleanup safe to run unconditionally** — it may execute when creation never succeeded (no ID captured) or when the record was already deleted by the test body. Skip when there is no ID, and treat a 404 from the delete as already-clean.
6. **Report cleanup failures without hiding the original failure** — never swallow the test's error to raise a cleanup error. Let the original assertion failure propagate and surface the cleanup problem alongside it (for example via a `test.step` or an attached log).
7. **Do not run destructive scenarios against production** or any shared environment unless the project explicitly allows it — see the section above.

## Test Data Constants

For 422 invalid-format tests, use existing contract-defined constants from the feature's test-data file. For 404 tests, use a valid-format ID only when it is confirmed absent in every target environment; otherwise follow the endpoint's project-specific absent-ID strategy. See `test-data-selection.md` for the full priority order.

## Spec File Template

See the complete spec file template:

- `../templates/spec.ts` — Combined list + detail endpoint tests with a 422 default; pagination, authentication, and 404 coverage are opt-in. Enable the 404 case only with a valid-format ID confirmed absent in every target environment or the endpoint's project-specific absent-ID strategy.

**Key pattern:** Prefer separate `run*Request` and `verify*Response` calls. Avoid adding new combined `runAndVerify*` methods.

### Why Separate Request/Verify?

1. **Explicit test flow** — Readers see exactly what the test does
2. **Flexible data sources** — Test data can come from constants OR prior requests
3. **Single-responsibility methods** — API class methods do one thing
4. **Better debugging** — Failures point to specific request or verify step

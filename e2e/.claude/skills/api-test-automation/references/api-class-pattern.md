# API Class Pattern

## API Class Template

See `../templates/api-class.ts` for the complete, copy-ready API class template.

## Structure Overview

API classes extend the project's response-verifier base class and organize methods into four sections:

1. **ACTION METHODS** — Send HTTP requests (`run*Request`)
2. **ASSERT METHODS** — Validate responses (`verify*Response`); public, called from specs. They return `void` by default. Make them `async` only when they read the body (`await response.json()`); status-only checks stay synchronous. `await` the async ones in the spec; call the sync ones without `await`. Return data only when a caller explicitly needs the validated payload and a separate `get*` method would not fit the project.
3. **INTERNAL VALIDATORS** — Protected sync field checks (`verify*Data`); called by ASSERT methods only
4. **HELPER METHODS** — Thin wrappers around the project's shared API helpers (e.g. a first-list-item extractor, an assertion-context formatter) when typed convenience is useful

## Assertion-Based Validation

Do not use manual `if` checks with `throw new Error()` for response validation.

```typescript
// WRONG: Manual error handling
if (!item) {
  throw new Error('Expected at least one item');
}
```

Use Playwright assertions with clear messages:

```typescript
// CORRECT: Assertion-based validation via a shared helper
const body = (await response.json()) as FeatureListResponse;
const item = getFirstListItem<FeatureItem>(body);
```

Or inline when a one-off check is enough — this assumes the `{ data: [...] }` envelope; unwrap first if the API returns a bare array (see `getFirstListItem`'s unwrap in `../templates/api-utils.ts`):

```typescript
expect(body.data.length, 'Expected at least one item').toBeGreaterThan(0);
const item = body.data[0];
expect(item, 'Expected first item to be defined').toBeDefined();
```

The types the body is cast to (`FeatureListResponse`, `FeatureItem` above) belong in the project's response-types file — see `../templates/response-types.ts` for the shape. Declare them there and import them; never inline a structural type at the cast site.

## Shared List Helpers

Keep helpers that are generic across API classes in the project's shared API utils module (see `../templates/api-utils.ts` for the shape). Two that pay for themselves in most projects:

- `getFirstListItem<T>(body)` — accept a parsed list body (a bare `T[]` **or** a `{ data: T[] }` envelope), assert non-empty, return the first item
- `formatAssertionContext(item, entityLabel?)` — build `Item "name"` / `Item id="..."` labels for assertion messages

Adapt both to what your API actually returns — `{ data: [...] }` is one common shape, not a universal one, and ids are not always strings. For a different list key (`items`, `results`, `content`), update all of these together:

- `FeatureListResponse` in the response-types file to match the contract.
- `ListResponseBody<T>` and the extraction inside `getFirstListItem` in `../templates/api-utils.ts`.
- The private `getListItems` parameter type and extraction in `../templates/api-class.ts`, which the list, pagination, and filter verifiers use. For an `items` contract, use `body: FeatureListResponse` and return `body.items`, or replace the helper calls with direct contract-specific access. Updating the shared helper alone does not update these verifiers.

Use the known contract key; do not guess among keys at runtime. If the entity's human-readable label is not `name`, either rename that property in `AssertionContextItem` or adapt at the call site (`formatAssertionContext({ id: post.id, name: post.title })`). If the project already has equivalents, reuse them instead of adding new ones.

Copy only the helpers you use. `../templates/api-utils.ts` is a menu — a project with numeric ids has no use for `verifyUuidFormat`, and one with no nullable fields has no use for the `verifyNullable*` family. Leaving them in as unused exports is dead code; add each one when a real response needs it.

An API class may expose a thin typed wrapper (e.g. `getFirstItem(response)` → `getFirstListItem<FeatureItem>`) for spec ergonomics; keep the list-selection logic in the shared module. When the spec verifies and then extracts from one response, keep the assertion return type as `void` and pass the response to the typed `get*` wrapper. Playwright buffers `APIResponse` bodies, so the assertion and data-access methods can read the same response independently.

## Anti-Pattern: Combined runAndVerify Methods

Avoid adding new methods that combine request + verify logic:

```typescript
// WRONG: Hides test flow, not reusable
public async runAndVerifyFilterById(): Promise<void> {
  const listResponse = await this.runListFeatureRequest();
  const body = (await listResponse.json()) as FeatureListResponse;
  const item = body.data[0];
  const response = await this.runListFeatureRequest({ id: item.id });
  await this.verifyFilterByIdResponse(response, item.id);
}
```

Instead, provide separate action, assert, and helper methods. The spec file orchestrates them using `test.step`. See `../templates/spec.ts` for the correct pattern.

## Imports

Resolve import paths from the consuming project's `tsconfig.json` → `compilerOptions.paths`. The conventions below are typical; the aliases in the templates are placeholders to be swapped for the project's real ones.

- `@anaconda/playwright-utils` for `expect`, `getRequest`, `postRequest`, etc. — for the full signatures and option types see `../../anaconda-playwright-utils/references/api-utils.md` § HTTP Request Functions
- `@playwright/test` for the `APIResponse` type only
- Path aliases for test data and page objects (commonly `@testdata/*` and `@pages/*`) rather than relative `../../` traversal
- Relative imports for same-directory files (the response verifier, the shared API utils)

## Extending the Response Verifier

A shared base class keeps status-code assertions in one place. `../templates/response-verifier.ts` provides:

- `verifyResponse(response, status, statusText?)` — protected; asserts the status code always and the reason phrase only when both expected and actual are present (HTTP/2 and HTTP/3 omit it, and proxies may rewrite it)
- `verifyOkResponse(response)` — public
- `verifyUnauthorizedResponse(response)` — public
- `verifyForbiddenResponse(response)` — public
- `verifyNotFoundResponse(response)` — public
- `verifyUnprocessableEntityResponse(response)` — public

If the project already has such a base class, extend it and add any missing status helpers there rather than duplicating checks in feature classes. Match the project's existing file name for it (e.g. `response-verifier.ts`).

## Adding Endpoint Builders

See `../templates/api-endpoints.ts` for endpoint URL builder patterns:

- Static endpoints (no params)
- Path param endpoints
- List endpoints with query params

Builders resolve against the project's base URL. How that value is obtained is project-specific — commonly a constant exported from `playwright.config.ts` and imported through an alias such as `@playwright-config`, or `process.env`. Confirm which before writing, and add the export if the project expects one but does not have it.

**Usage in an API class:**

- Static endpoints: `getRequest(apiEndpoints.featureHealthRequest)`
- Dynamic endpoints: `getRequest(apiEndpoints.featureByIdRequest(id))`

## Registering the Fixture

Import the API class in the project's fixture file (commonly behind the `@fixture` alias), then register it using the pattern already used there:

```typescript
featureApi: async ({}, use) => {
  await use(new FeatureAPI());
},
```

Match the surrounding naming style — projects differ on casing (`featureApi` vs `featureAPI`). Where a spec needs a valid ID for several tests, some projects add a derived fixture for it; prefer response-derived data inside a `test.step` unless the project already established a fixture for it (see `test-data-selection.md`).

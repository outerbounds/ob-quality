# Test Data Selection Rule

## Overview

When writing API tests, select test data based on reliability across environments. The goal is to maximize test stability while avoiding environment-specific failures.

## Priority Order

### Priority 1: Response-Derived Data (Default)

**When to use:** For any ID, item, or entity that needs to exist in the system. This is the default approach for positive tests that require valid data.

**Why:** Dynamic data from API responses is more reliable across the environments a suite runs in (local, dev, staging, production-like) where specific IDs may not exist.

**Required:** Wrap setup and extraction steps in `test.step` so the test report clearly shows where the dynamic data came from.

Extract the item through the API class's own typed wrapper — specs call API class methods, not shared helper functions directly. The list verifier asserts the response and returns `void`; the wrapper (`getFirstItem`) reads the buffered response and delegates to the project's shared helper (`getFirstListItem`). The spec therefore needs no import from the API utils module.

```typescript
const item = await test.step('Get valid item from list', async () => {
  const listResponse = await featureApi.runListFeatureRequest();
  await featureApi.verifyListFeatureResponse(listResponse);
  return featureApi.getFirstItem(listResponse);
});

await test.step('Fetch feature details by ID', async () => {
  const response = await featureApi.runGetFeatureByIdRequest(item.id);
  await featureApi.verifyGetFeatureByIdResponse(response, item.id);
});
```

### Priority 2: Stable Test Data Constants

**When to use:** Only when a stable constant is **explicitly confirmed** to exist in every environment the suite targets, or for negative scenarios whose value is contract-defined (for example, an invalid ID format). A valid-format ID expected to return 404 is different: use a constant only when it is confirmed absent in every target environment; otherwise follow the endpoint's project-specific strategy for selecting an absent ID.

**Rule:** Do not assume a constant ID exists across environments. Only use this approach when explicitly told a stable ID is available.

Constants live in the project's API test-data location (commonly a `tests/testdata/api/<feature>-test-data.ts` file behind a `@testdata/*` alias) — never inline in a spec.

```typescript
// Invalid-format negative tests can use a project-owned constant.
const response = await featureApi.runGetFeatureByIdRequest(testData.invalidIdPath);
featureApi.verifyUnprocessableEntityResponse(response);

// A valid-format 404 ID must be confirmed absent in every target environment,
// or selected by the endpoint's project-specific absent-ID strategy.
// const response = await featureApi.runGetFeatureByIdRequest(testData.nonExistentId);
// featureApi.verifyNotFoundResponse(response);

// Positive tests: only if explicitly confirmed stable across all environments
// const response = await featureApi.runGetFeatureByIdRequest(
//   testData.knownItemId, // Use only if explicitly confirmed to exist everywhere
// );
```

### Priority 3: Inline Hardcoded Values (Avoid)

**When to use:** Never. Constants belong in the project's test-data files, not inline in specs.

**Rule:** Do not hardcode IDs, UUIDs, payload values, or filter values directly in spec files. If a constant is needed, define it in the feature's test-data file and import it through the project's alias.

## Decision Flowchart

```
Is this an invalid-format negative test?
├── YES → Use a constant from the feature test-data file (Priority 2)
└── NO → Does it need a valid-format ID that returns 404?
    ├── YES → Is an ID confirmed absent in every target environment?
    │   ├── YES → Use that constant from the feature test-data file (Priority 2)
    │   └── NO → Use the endpoint's project-specific absent-ID strategy, or document
    │              that no safe 404 case is available
    └── NO → Is a stable ID explicitly confirmed for all target environments?
        ├── YES → Use a constant from the feature test-data file (Priority 2)
        └── NO → Use response-derived data with test.step (Priority 1 — Default)
```

## Never Commit Secrets as Test Data

Credentials, bearer tokens, API keys, and private hostnames are **environment configuration, not test data**. Read them from `process.env` in the Playwright config (which may load a git-ignored `.env`) and reference them from there. Never write a literal token, password, or internal URL into a test-data file, a spec, or an endpoint builder.

## When to Add New Test Data Constants

Add a new constant to the feature's test-data file when it is either:

1. An invalid-format negative-test input defined by the endpoint contract.
2. A valid-format 404 ID **explicitly confirmed** absent across every environment the suite targets.
3. A positive-test value **explicitly confirmed** present across every environment the suite targets.

Keep shared values in the test-data file rather than inlining them in specs.

See `../templates/test-data.ts` for the test data file template.

## Summary

| Priority | Source                 | When                                                                                   | `test.step` Required |
| -------- | ---------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| 1        | API response           | Default for positive tests — reliable across envs                                      | Yes                  |
| 2        | Feature test-data file | Invalid-format negatives, confirmed-absent 404 IDs, or stable IDs explicitly confirmed | No                   |
| 3        | Inline hardcoded       | Avoid — define constants in test data instead                                          | N/A                  |

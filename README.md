# OB Quality

This repository contains automated quality testing for operational workflows and browser-based user experiences.

## Project Areas

### Meta-Flow Testing

The `flows/` directory contains Python-based tests for meta flows. These tests validate higher-level workflows, orchestration, and behavior that does not require browser UI automation.

### UI Testing

The `e2e/` directory contains browser-based end-to-end tests built with Playwright and TypeScript. UI tests are organized by the Models and Packages domains, with separate fixtures, page objects, specs, test data, and test plans.

See [`e2e/tests/README.md`](e2e/tests/README.md) for the Playwright test structure, import conventions, and validation workflow.

## Repository Layout

```text
ob-quality/
├── flows/    # Python meta-flow testing
└── e2e/      # Playwright UI testing
```

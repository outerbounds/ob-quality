/**
 * This repo's ESLint config: base config from @anaconda/playwright-utils + local overrides.
 * Base rules live in the package (eslint.config.base.mjs); override here as needed.
 */
import base from '@anaconda/playwright-utils/eslint';

export default [
  ...base,
  //{ rules: { 'import/first': 'off', 'no-useless-return': 'off' } },
  // Repo-specific: stricter module boundary types in src
  //{ files: ['tests/**/*.ts'], rules: { '@typescript-eslint/explicit-module-boundary-types': 'warn' } },
];

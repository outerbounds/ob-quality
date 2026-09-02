import 'dotenv/config';

/**
 * playwright.config.ts: This module is responsible for configuring the Playwright test runner.
 * It includes settings for test execution, browser configuration, and environment variables.
 * See https://playwright.dev/docs/test-configuration for more details.
 */

import { AnacondaConfigDefaults, AnacondaProjectDefaults } from '@anaconda/playwright-utils';
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

//To run against the local environment, set the URL to your local server like 'https://localhost:9002'
//You can override the BASE_URL by setting the URL environment variable in .env file or passing it as a command line argument.

export const BASE_URL = process.env.URL ?? 'https://ui.dev-valay.outerbounds.xyz/dashboard';
export const STORAGE_STATE_PATH = path.join(__dirname, 'tests/storage-setup/.auth');

const extraHTTPHeaders: Record<string, string> = {
  'qa-test': 'automation',
};

export default defineConfig({
  // Setup the defaults for all projects
  ...AnacondaConfigDefaults,
  /**
   * The directory where tests are located.
   * See https://playwright.dev/docs/api/class-testconfig#testconfig-testdir
   */
  testDir: './tests',
  use: {
    ...AnacondaProjectDefaults,
    /* Records traces after each test failure for debugging purposes. */
    trace: 'retain-on-failure',
    /* Captures screenshots after each test failure to provide visual context. */
    screenshot: 'only-on-failure',
    baseURL: BASE_URL,
    /* Adds configured authentication headers to API and browser requests. */
    extraHTTPHeaders,
  },

  /**
   * Configure projects for major browsers.
   * See https://playwright.dev/docs/test-configuration#projects
   */
  projects: [
    {
      name: 'setup',
      testMatch: '**/login-storage-setup.ts',
      use: {
        ...devices['Desktop Chrome'],
        trace: 'off',
        viewport: { width: 1600, height: 1000 },
        launchOptions: {
          args: ['--disable-web-security'],
          slowMo: 0,
        },
      },
    },

    /** Due to different view ports in Head and Headless, created 2 projects one for head mode and the same browser for headless. */
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        // Set storageState per spec file, e.g. test.use({ storageState: getUserAuthPath(nonAdminAutomationUser) }).
        viewport: null,
        launchOptions: {
          args: ['--disable-web-security', '--start-maximized'],
          /* --auto-open-devtools-for-tabs option is used to open a test with Network tab for debugging. It can help in analyzing network requests and responses.*/
          // args: ["--auto-open-devtools-for-tabs"],
          // channel: 'chrome',
          slowMo: 0,
          headless: false,
        },
      },
    },

    {
      name: 'chromiumheadless',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // Set storageState per spec file, e.g. test.use({ storageState: getUserAuthPath(nonAdminAutomationUser) }).
        viewport: { width: 1600, height: 1000 },
        launchOptions: {
          args: ['--disable-web-security'],
          slowMo: 0,
          headless: true,
        },
      },
    },
  ],
});

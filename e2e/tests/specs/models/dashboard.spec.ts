import { test } from '@models-fixture';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.use({ storageState: getUserAuthPath(adminAutomationUser) });

test.describe('Models dashboard navigation @smoke', () => {
  test('opens the configured dashboard with the authenticated state', async ({ dashboardPage }) => {
    await dashboardPage.goToDashboard();
    await dashboardPage.verifyDashboardIsDisplayed();
  });
});

import { test } from '@models-fixture';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.use({ storageState: getUserAuthPath(adminAutomationUser) });

test.describe('Models OB navigation @smoke', () => {
  test('opens the configured OB page with the authenticated state', async ({ obPage }) => {
    await obPage.navigateToDashboard();
    await obPage.verifyDashboardURL();
  });
});

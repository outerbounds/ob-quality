import { test } from '@models-fixture';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Model Catalog OB UI Tests @smoke', () => {
  // Use the storage state for the admin automation user to maintain authentication across tests.
  test.use({ storageState: getUserAuthPath(adminAutomationUser) });

  test.beforeEach('Navigate to Model Catalog Page', async ({ modelPage }) => {
    await modelPage.navigateToDashboard();
    await modelPage.verifyDashboardURL();
    await modelPage.verifyResourcesButton();
    await modelPage.clickResourcesButton();
    await modelPage.verifyModelLink();
    await modelPage.clickModelLink();
    await modelPage.verifyModelPageURL();
  });
  test('Displays catalog tabs and controls with Models selected', async ({ modelPage }) => {
    // Verify the page heading, its model count, and every catalog tab, with Models active on first load.
    await modelPage.verifyModelHeader();
    await modelPage.verifyModelCountBadge();
    await modelPage.verifyModelsTab();
    await modelPage.verifyChartTab();
    await modelPage.verifyLicensesTab();
    await modelPage.verifyModelsTabSelected();
    await modelPage.verifySearchInput();
    await modelPage.verifyAllFiltersButton();
    await modelPage.verifyChooseColumnsButton();
  });
});

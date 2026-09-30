import { test } from '@models-fixture';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.use({ storageState: getUserAuthPath(adminAutomationUser) });

test.describe('Model Catalog OB navigation @smoke', () => {
  test.beforeEach(async ({ modelPage }) => {
    await modelPage.navigateToDashboard();
    await modelPage.verifyDashboardURL();
    await modelPage.verifyResourcesButton();
    await modelPage.clickResourcesButton();
    await modelPage.verifyModelLink();
    await modelPage.clickModelLink();
    await modelPage.verifyModelPageURL();
  });
  test('renders the catalog heading and its tabs with Models tab selected', async ({ modelPage }) => {
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

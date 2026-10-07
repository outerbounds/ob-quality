import { test } from '@models-fixture';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Model Licenses OB UI Tests @smoke', () => {
  test.use({ storageState: getUserAuthPath(adminAutomationUser) });

  test.beforeEach('Navigate to Model Catalog Page', async ({ modelPage }) => {
    await modelPage.navigateToDashboard();
    await modelPage.verifyDashboardURL();
    await modelPage.verifyResourcesButton();
    await modelPage.clickResourcesButton();
    await modelPage.verifyModelLink();
    await modelPage.clickModelLink();
    await modelPage.verifyModelPageURL();
    await modelPage.verifyModelsTab();
  });

  test('Every license row shows a model name, license link, and actions or status', async ({
    modelPage,
    modelLicenses,
  }) => {
    await modelPage.verifyLicensesTab();
    await modelPage.clickLicensesTab();
    await modelLicenses.verifyLicensesTableDisplayed();
    await modelLicenses.verifyAllLicenseRowsHaveModelNames();
    await modelLicenses.verifyAllLicenseRowsHaveLicenseLinks();
    await modelLicenses.verifyAllLicenseRowsHaveActionsOrStatus();
  });
});

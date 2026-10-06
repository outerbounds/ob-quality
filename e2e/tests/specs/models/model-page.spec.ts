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

  test('Checking an All Filters option shows its filter on the filter bar', async ({ modelPage }) => {
    // The open menu should list a labelled checkbox for every filter.
    await modelPage.verifyAllFiltersButton();
    await modelPage.openAllFiltersMenu();
    await modelPage.verifyAllFiltersMenuExpanded();
    await modelPage.verifyAllFilterOptionsChecked();
    // All eight ship checked, so every filter they control starts out on the filter bar.
    await modelPage.verifyAllFilterButtonsDisplayed();
    // Clearing an option hides its filter; checking it again brings the filter back.
    await modelPage.verifyEveryFilterOptionTogglesItsFilter();
  });

  test('Model table renders every model row with data in each column', async ({ modelPage }) => {
    // The table and its fixed Name column come up with the Models tab.
    await modelPage.verifyModelTableDisplayed();
    await modelPage.verifyModelTableColumnHeadersLabelled();
    // Scrolls the catalog: rows must be present, every row fills one cell per column, and the badge agrees.
    await modelPage.verifyEveryModelRowIsPopulated();
  });

  test('Table is fully populated with every column selected', async ({ modelPage }) => {
    await modelPage.verifyChooseColumnsButton();
    await modelPage.openColumnSelector();
    await modelPage.verifyColumnSelectorExpanded();
    // With every column on, each model this user can see still fills every cell; the selection is restored after.
    await modelPage.verifyEveryColumnSelectedKeepsRowsPopulated();
  });

  test('Column selector options show and hide their corresponding table columns', async ({ modelPage }) => {
    await modelPage.verifyChooseColumnsButton();
    await modelPage.openColumnSelector();
    await modelPage.verifyColumnSelectorExpanded();
    // Whatever each option's current state, checking it shows its column and clearing it hides the column.
    await modelPage.verifyEveryColumnOptionTogglesItsColumn();
  });
});

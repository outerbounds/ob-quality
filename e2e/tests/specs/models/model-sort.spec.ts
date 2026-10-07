import { test } from '@models-fixture';
import { catalogSortableColumns } from '@testdata/models/catalog-test-data';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Model Catalog Sorting OB UI Tests @smoke', () => {
  // Use the storage state for the admin automation user to maintain authentication across tests.
  test.use({ storageState: getUserAuthPath(adminAutomationUser) });

  test.beforeEach('Navigate to Model Catalog Page with every sortable column shown', async ({ modelPage }) => {
    await modelPage.navigateToDashboard();
    await modelPage.verifyDashboardURL();
    await modelPage.verifyResourcesButton();
    await modelPage.clickResourcesButton();
    await modelPage.verifyModelLink();
    await modelPage.clickModelLink();
    await modelPage.verifyModelPageURL();
    await modelPage.verifyModelsTab();
    // Every sortable column has to be on the table before its header can be clicked.
    await modelPage.verifyModelTableDisplayed();
    await modelPage.openColumnSelector();
    await modelPage.verifyColumnSelectorExpanded();
    await modelPage.selectAllColumnOptions();
    // The selector overlays the table, so it is closed before any header underneath it is clicked.
    await modelPage.closeColumnSelector();
    await modelPage.verifyModelRowsDisplayed();
  });

  for (const { label, kind } of catalogSortableColumns) {
    test(`Clicking the ${label} header sorts every model row in both directions`, async ({ modelSort }) => {
      // A full-table sweep runs per direction, so each sort check needs the longer budget.
      test.slow();
      await modelSort.verifySortableColumnSortControl(label);
      // Clicking a header sorts its column descending, and clicking it again reverses the order.
      await modelSort.sortColumnDescending(label);
      await modelSort.verifyColumnSortOrder(label, kind, 'descending');
      await modelSort.sortColumnAscending(label);
      await modelSort.verifyColumnSortOrder(label, kind, 'ascending');
    });
  }
});

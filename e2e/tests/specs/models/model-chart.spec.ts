import { test } from '@models-fixture';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Model Chart OB UI Tests @smoke', () => {
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

  test('Model Chart tab plots model performance against the selected axes', async ({ modelPage, modelChart }) => {
    // The catalog owns its tabs, so the chart view is opened from there.
    await modelPage.verifyChartTab();
    await modelPage.clickChartTab();
    // The chart comes up under its own heading, with a selector naming each plotted metric.
    await modelChart.verifyChartDisplayed();
    await modelChart.verifyAxisSelectorsDisplayed();
    // Both axes are titled for the metrics their selectors report, and the series is drawn.
    await modelChart.verifyAxisTitlesMatchSelectors();
    await modelChart.verifyChartPlotsDataPoints();
  });
});

import { test } from '@models-fixture';
import { modelChartData } from '@testdata/models/model-chart-test-data';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Model Chart OB UI Tests @smoke', () => {
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

  test('Model Chart tab plots model performance against the selected axes', async ({ modelPage, modelChart }) => {
    await modelPage.verifyChartTab();
    await modelPage.clickChartTab();
    await modelChart.verifyChartDisplayed();
    await modelChart.verifyAxisSelectorsDisplayed();
    await modelChart.verifyAxisTitlesMatchSelectors();
    await modelChart.verifyChartPlotsDataPoints();
  });

  test('Model Chart point tooltip shows the model name and X/Y metric values', async ({ modelPage, modelChart }) => {
    await modelPage.verifyChartTab();
    await modelPage.clickChartTab();
    await modelChart.verifyChartDisplayed();
    await modelChart.openAxisDropdown('X');
    await modelChart.selectAxisOption(modelChartData.xAxisOptions[0].metric);
    await modelChart.verifySelectedAxisMetric('X', modelChartData.xAxisOptions[0].metric);
    await modelChart.openAxisDropdown('Y');
    await modelChart.selectAxisOption(modelChartData.yAxisOptions[0].metric);
    await modelChart.verifySelectedAxisMetric('Y', modelChartData.yAxisOptions[0].metric);
    await modelChart.verifyChartPlotsDataPoints();

    await modelChart.hoverChartPoint();
    await modelChart.verifyPointTooltipDisplayed();
    await modelChart.verifyTooltipModelName();
    await modelChart.verifyTooltipAxisMetric('X');
    await modelChart.verifyTooltipAxisMetric('Y');
  });

  test('Model Chart updates the X-axis title for every dropdown option', async ({ modelPage, modelChart }) => {
    await modelPage.verifyChartTab();
    await modelPage.clickChartTab();
    await modelChart.verifyChartDisplayed();
    await modelChart.verifyAxisSelectorsDisplayed();

    for (const { metric, title } of modelChartData.xAxisOptions) {
      await modelChart.openAxisDropdown('X');
      await modelChart.selectAxisOption(metric);
      await modelChart.verifySelectedAxisMetric('X', metric);
      await modelChart.verifyAxisTitle('X', title);
    }
  });

  test('Model Chart updates the Y-axis title for every dropdown option', async ({ modelPage, modelChart }) => {
    await modelPage.verifyChartTab();
    await modelPage.clickChartTab();
    await modelChart.verifyChartDisplayed();
    await modelChart.verifyAxisSelectorsDisplayed();

    for (const { metric, title } of modelChartData.yAxisOptions) {
      await modelChart.openAxisDropdown('Y');
      await modelChart.selectAxisOption(metric);
      await modelChart.verifySelectedAxisMetric('Y', metric);
      await modelChart.verifyAxisTitle('Y', title);
    }
  });
});

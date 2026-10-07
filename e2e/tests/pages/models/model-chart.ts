import {
  ActionUtils,
  AssertUtils,
  ElementUtils,
  INSTANT_TIMEOUT,
  LocatorUtils,
  STANDARD_TIMEOUT,
} from '@anaconda/playwright-utils';
import { type Locator } from '@playwright/test';
import { modelChartData } from '@testdata/models/model-chart-test-data';

export class ModelChartPage {
  // TODO (WOW-105): Add QA IDs for chart elements that currently use structural or CSS locators.
  private readonly chart = (): Locator => LocatorUtils.getLocatorByTestId('catalog-eval-chart');
  private readonly chartHeading = (): Locator => LocatorUtils.getLocatorByTestId('catalog-eval-chart-heading');
  private readonly chartFigure = (): Locator => this.chart().getByRole('figure');
  private readonly chartDataPoints = (): Locator => this.chartFigure().locator('circle.lc-point');
  private readonly yAxisSelector = (): Locator => LocatorUtils.getLocatorByTestId('catalog-yaxis-selector');
  private readonly xAxisSelector = (): Locator => LocatorUtils.getLocatorByTestId('catalog-xaxis-selector');
  /** The selected metric sits in the only titled node of its selector. */
  private readonly axisSelectorValue = (selector: Locator): Locator => selector.locator('[title]');
  private readonly xAxisLabel = (): Locator => LocatorUtils.getLocatorByTestId('scatter-chart-x-axis-label');
  private readonly yAxisLabel = (): Locator => LocatorUtils.getLocatorByTestId('scatter-chart-y-axis-label');
  /** Dropdown menus are portalled outside the chart; each metric has a unique titled option. */
  private readonly axisOption = (metric: string): Locator =>
    LocatorUtils.getLocator('[data-testid="menu_portal"] button').filter({
      has: LocatorUtils.getLocatorByTitle(metric, { exact: true }),
    });

  /** The chart tooltip is portalled outside the chart and has no test id or tooltip role. */
  private readonly pointTooltip = (): Locator => LocatorUtils.getLocator('.lc-tooltip-root');
  private readonly tooltipModelName = (): Locator => this.pointTooltip().locator('.lc-tooltip-header');
  private readonly tooltipMetricRow = (metric: string): Locator =>
    this.pointTooltip()
      .locator('.lc-tooltip-item-root')
      .filter({
        has: LocatorUtils.getLocatorByText(`${metric}:`, { exact: true }),
      });

  /** Any plotted model can exercise the tooltip; points have no individual identifiers, hence `.first()`. */
  public async hoverChartPoint(): Promise<void> {
    // A plotted circle is visible well before a redraw settles, and a moving point outruns its position.
    await ElementUtils.waitForElementToBeStable(this.chartDataPoints().first());
    // Approach through the SVG so its pointer tracker receives movement and its highlight cannot intercept it.
    for (const offset of [10, 5, 0]) {
      // Read the point again each attempt, so a redraw between attempts cannot leave the aim behind.
      const position = await this.getChartPointPosition();
      await ActionUtils.hover(this.chartFigure(), { position: { x: position.x + offset, y: position.y } });
      if (await ElementUtils.isElementVisible(this.pointTooltip(), { timeout: INSTANT_TIMEOUT })) {
        return;
      }
    }
    // Fail at the hover that missed; staying silent would surface this as a puzzling tooltip failure.
    throw new Error('Hovering the first plotted chart point did not display its tooltip');
  }

  /** Read the point's rendered center relative to its SVG; the utility library has no geometry helper. */
  private async getChartPointPosition(): Promise<{ x: number; y: number }> {
    return await this.chartDataPoints()
      .first()
      .evaluate(point => {
        const pointBounds = point.getBoundingClientRect();
        const figure = point.closest('[role="figure"]');
        if (!figure) {
          throw new Error('Chart point should belong to the chart figure');
        }
        const figureBounds = figure.getBoundingClientRect();
        return {
          x: pointBounds.x + pointBounds.width / 2 - figureBounds.x,
          y: pointBounds.y + pointBounds.height / 2 - figureBounds.y,
        };
      });
  }

  public async verifyPointTooltipDisplayed(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.pointTooltip(), {
      timeout: STANDARD_TIMEOUT,
      message: 'Hovering a chart point should display its model tooltip',
    });
  }

  public async verifyTooltipModelName(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.tooltipModelName(), {
      message: 'Point tooltip model name should be visible',
    });
    await AssertUtils.expectElementValueNotToBeEmpty(this.tooltipModelName(), {
      message: 'Point tooltip model name should not be empty',
    });
  }

  public async verifyTooltipAxisMetric(axis: 'X' | 'Y'): Promise<void> {
    const selector = axis === 'X' ? this.xAxisSelector() : this.yAxisSelector();
    const metric = (await ElementUtils.getText(this.axisSelectorValue(selector))).trim();
    const row = this.tooltipMetricRow(metric);
    await AssertUtils.expectElementToBeVisible(row, {
      message: `Tooltip should show the selected ${axis}-axis metric "${metric}"`,
    });
    const value = row.locator('.lc-tooltip-item-value');
    await AssertUtils.expectElementToBeVisible(value, {
      message: `Tooltip value for ${axis}-axis metric "${metric}" should be visible`,
    });
    await AssertUtils.expectElementValueNotToBeEmpty(value, {
      message: `Tooltip value for ${axis}-axis metric "${metric}" should not be empty`,
    });
  }

  public async openAxisDropdown(axis: 'X' | 'Y'): Promise<void> {
    const selector = axis === 'X' ? this.xAxisSelector() : this.yAxisSelector();
    await ActionUtils.click(selector.locator('label'));
  }

  public async selectAxisOption(metric: string): Promise<void> {
    await ActionUtils.click(this.axisOption(metric));
  }

  public async verifySelectedAxisMetric(axis: 'X' | 'Y', metric: string): Promise<void> {
    const selector = axis === 'X' ? this.xAxisSelector() : this.yAxisSelector();
    await AssertUtils.expectElementToHaveText(this.axisSelectorValue(selector), metric, {
      message: `${axis} axis dropdown should show the selected "${metric}" metric`,
    });
  }

  public async verifyAxisTitle(axis: 'X' | 'Y', title: string): Promise<void> {
    const label = axis === 'X' ? this.xAxisLabel() : this.yAxisLabel();
    await AssertUtils.expectElementToBeVisible(label, {
      message: `${axis} axis title should be visible`,
    });
    await AssertUtils.expectElementToHaveText(label, title, {
      message: `${axis} axis title should update to "${title}"`,
    });
  }

  public async verifyChartDisplayed(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartFigure(), {
      message: 'Model performance chart should be displayed',
    });
    await AssertUtils.expectElementToHaveText(this.chartHeading(), modelChartData.heading, {
      message: `Chart heading should read "${modelChartData.heading}"`,
    });
  }

  /** Both selectors name the metric they plot, whichever metric the environment defaults to. */
  public async verifyAxisSelectorsDisplayed(): Promise<void> {
    await this.verifyAxisSelectorDisplayed('Y', this.yAxisSelector());
    await this.verifyAxisSelectorDisplayed('X', this.xAxisSelector());
  }

  /** Require visible, nonblank text before using a selector value to match an axis title. */
  private async verifyAxisSelectorDisplayed(axis: 'X' | 'Y', selector: Locator): Promise<void> {
    const value = this.axisSelectorValue(selector);
    await AssertUtils.expectElementToBeVisible(value, {
      message: `${axis} axis selector should display its selected metric`,
    });
    await AssertUtils.expectElementToHaveText(value, /\S/, {
      message: `${axis} axis selector should name the metric it plots`,
    });
  }

  /** The X axis has to describe the metric its selector reports, so the plot is never mislabelled. */
  public async verifyXAxisTitleMatchesSelector(): Promise<void> {
    await this.verifyAxisTitleMatchesSelector('X', this.xAxisSelector(), this.xAxisLabel());
  }

  /** The Y axis has to describe the metric its selector reports, so the plot is never mislabelled. */
  public async verifyYAxisTitleMatchesSelector(): Promise<void> {
    await this.verifyAxisTitleMatchesSelector('Y', this.yAxisSelector(), this.yAxisLabel());
  }

  /**
   * A title carries its metric plus a unit, e.g. "File size (GB)", and either axis can default to any
   * metric, so it is matched against its selector; the per-option tests pin the exact titles.
   */
  private async verifyAxisTitleMatchesSelector(axis: 'X' | 'Y', selector: Locator, label: Locator): Promise<void> {
    await this.verifyAxisSelectorDisplayed(axis, selector);
    const metric = await ElementUtils.getText(this.axisSelectorValue(selector));
    await AssertUtils.expectElementToBeVisible(label, {
      message: `${axis} axis title should be visible`,
    });
    await AssertUtils.expectElementToContainText(label, metric, {
      message: `${axis} axis should be titled for the selected "${metric}" metric`,
    });
  }

  /** One visible point is sufficient to verify that the chart plotted a series, hence `.first()`. */
  public async verifyChartPlotsDataPoints(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartDataPoints().first(), {
      message: 'Model performance chart should plot at least one model',
    });
  }
}

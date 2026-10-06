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
  private readonly chartHeading = (): Locator => this.chart().locator('h4');
  private readonly chartFigure = (): Locator => this.chart().getByRole('figure');
  private readonly chartDataPoints = (): Locator => this.chartFigure().locator('circle.lc-point');
  private readonly yAxisSelector = (): Locator => LocatorUtils.getLocatorByTestId('catalog-yaxis-selector');
  private readonly xAxisSelector = (): Locator => LocatorUtils.getLocatorByTestId('catalog-xaxis-selector');
  /** The selected metric sits in the only titled node of its selector. */
  private readonly axisSelectorValue = (selector: Locator): Locator => selector.locator('[title]');
  private readonly xAxisLabel = (): Locator => this.chartFigure().locator('[data-placement="bottom"] .lc-axis-label');
  private readonly yAxisLabel = (): Locator => this.chartFigure().locator('[data-placement="left"] .lc-axis-label');
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
    const position = await this.getChartPointPosition();
    // Approach through the SVG so its pointer tracker receives movement and its highlight cannot intercept it.
    for (const offset of [10, 5, 0]) {
      await ActionUtils.hover(this.chartFigure(), { position: { x: position.x + offset, y: position.y } });
      if (await ElementUtils.isElementVisible(this.pointTooltip(), { timeout: INSTANT_TIMEOUT })) {
        return;
      }
    }
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

  /** The axes have to describe the metrics the selectors report, so the plot is never mislabelled. */
  public async verifyAxisTitlesMatchSelectors(): Promise<void> {
    for (const [axis, selector] of [
      ['Y', this.yAxisSelector()],
      ['X', this.xAxisSelector()],
    ] as const) {
      await this.verifyAxisSelectorDisplayed(axis, selector);
      const metric = await ElementUtils.getText(this.axisSelectorValue(selector));
      const options = axis === 'X' ? modelChartData.xAxisOptions : modelChartData.yAxisOptions;
      const option = options.find(option => option.metric === metric);
      if (!option) {
        throw new Error(`Missing expected title for ${axis}-axis metric "${metric}"`);
      }
      await this.verifyAxisTitle(axis, option.title);
    }
  }

  /** One visible point is sufficient to verify that the chart plotted a series, hence `.first()`. */
  public async verifyChartPlotsDataPoints(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartDataPoints().first(), {
      message: 'Model performance chart should plot at least one model',
    });
  }
}

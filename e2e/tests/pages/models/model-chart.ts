import { AssertUtils, ElementUtils, LocatorUtils, escapeRegExp } from '@anaconda/playwright-utils';
import { type Locator } from '@playwright/test';
import { modelChartData } from '@testdata/models/model-chart-test-data';

export class ModelChartPage {
  private readonly chart = (): Locator => LocatorUtils.getLocatorByTestId('catalog-eval-chart');
  //add qa-id for the chart heading
  private readonly chartHeading = (): Locator => this.chart().locator('h4');
  /** The plot area carries the figure role, which keeps axis titles apart from the selectors around it. */
  private readonly chartFigure = (): Locator => this.chart().getByRole('figure');
  /** Each plotted model is a circle, so the first one proves the chart drew its series. */
  private readonly chartDataPoints = (): Locator => this.chartFigure().locator('circle');
  /** An axis title repeats the metric its selector names, so it is found by that metric's text. */
  // add qa-id for the axis titles
  private readonly axisTitle = (metric: string): Locator =>
    this.chartFigure().getByText(new RegExp(escapeRegExp(metric)));
  private readonly yAxisSelector = (): Locator => LocatorUtils.getLocatorByTestId('catalog-yaxis-selector');
  private readonly xAxisSelector = (): Locator => LocatorUtils.getLocatorByTestId('catalog-xaxis-selector');
  /** The selected metric sits in the only titled node of its selector. */
  private readonly axisSelectorValue = (selector: Locator): Locator => selector.locator('[title]');

  /** First assertion after the tab switch — allow the chart longer than the default expect timeout to draw. */
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
  private async verifyAxisSelectorDisplayed(axis: string, selector: Locator): Promise<void> {
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
      await AssertUtils.expectElementToBeVisible(this.axisTitle(metric), {
        message: `${axis} axis should be titled for the selected "${metric}" metric`,
      });
    }
  }

  /** One visible point is sufficient to verify that the chart plotted a series, hence `.first()`. */
  public async verifyChartPlotsDataPoints(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartDataPoints().first(), {
      message: 'Model performance chart should plot at least one model',
    });
  }
}

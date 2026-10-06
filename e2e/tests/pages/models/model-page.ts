import {
  ActionUtils,
  AssertUtils,
  ElementUtils,
  LocatorUtils,
  PageUtils,
  STANDARD_TIMEOUT,
  escapeRegExp,
} from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { type Locator } from '@playwright/test';
import {
  catalogColumnOptions,
  catalogData,
  catalogFilterOptions,
  catalogFixedColumn,
} from '@testdata/models/catalog-test-data';

/** The configured URL may or may not end with a slash; normalize once so every route check agrees. */
const DASHBOARD_URL = BASE_URL.replace(/\/$/, '');

export class ModelPage {
  private readonly resourcesButton = (): Locator =>
    LocatorUtils.getLocatorByRole('navigation').getByRole('button', { name: 'Resources', exact: true });
  private readonly modelLink = (): Locator =>
    LocatorUtils.getLocator(`nav a[href="${new URL(this.modelPageURL(catalogData.project)).pathname}"]`);
  private readonly modelHeader = (): Locator => LocatorUtils.getLocatorByTestId('catalog-page-heading');
  private readonly catalog = (): Locator => LocatorUtils.getLocatorByTestId('model-catalog-browse');
  private readonly modelHeadingText = (): Locator => this.modelHeader().locator('h1');
  private readonly modelCountBadge = (): Locator => this.modelHeader().locator('.badge.counter');
  private readonly modelsTab = (): Locator => this.catalog().locator('button[title="models"]');
  private readonly chartTab = (): Locator => this.catalog().locator('button[title="model-chart"]');
  private readonly licensesTab = (): Locator => this.catalog().locator('button[title="licenses"]');
  private readonly searchInput = (): Locator => LocatorUtils.getLocatorByTestId('catalog-search').locator('input');
  private readonly allFiltersButton = (): Locator =>
    LocatorUtils.getLocatorByTestId('catalog-all-filters').locator('button');
  private readonly chooseColumnsButton = (): Locator => this.catalog().locator('button[aria-label="Choose columns"]');
  /** Each filter's accessible name is unique inside the catalog, so no toolbar-level anchor is needed. */
  private readonly filterButton = (label: string): Locator =>
    this.catalog().getByRole('button', { name: label, exact: true });
  /** The All Filters menu is portaled to <body>, so each row is reachable only by its own test id. */
  private readonly filterOptionRow = (checkbox: string): Locator =>
    LocatorUtils.getLocator(`[data-testid="input_checkbox_${checkbox}"]`);
  private readonly filterOptionInput = (checkbox: string): Locator => this.filterOptionRow(checkbox).locator('input');
  /** The option's visible text sits in the only titled node of its row. */
  private readonly filterOptionLabel = (checkbox: string): Locator => this.filterOptionRow(checkbox).locator('[title]');
  /** The Choose columns menu is portaled to <body>; its rows use the column label verbatim as the test id. */
  private readonly columnOptionRow = (label: string): Locator =>
    LocatorUtils.getLocator(`[data-testid="input_checkbox_${label}"]`);
  private readonly columnOptionInput = (label: string): Locator => this.columnOptionRow(label).locator('input');
  /** Table headers expose no data attribute, so the column role plus its name is the only stable handle. */
  private readonly columnHeader = (label: string): Locator =>
    this.catalog().getByRole('columnheader', { name: label, exact: true });

  private modelPageURL(project: string): string {
    return `${DASHBOARD_URL}/catalog/p/${project}`;
  }

  public async navigateToDashboard(): Promise<void> {
    await PageUtils.gotoURL(DASHBOARD_URL, { waitUntil: 'domcontentloaded' });
  }

  /** Accepts dashboard subroutes and query strings while keeping the configured route boundary. */
  public async verifyDashboardURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(new RegExp(`^${escapeRegExp(DASHBOARD_URL)}(?:/|$|\\?)`), {
      message: 'Authenticated user should remain on the configured dashboard route',
    });
  }

  /** First assertion after login — allow longer than the 5s default expect timeout for the shell to render. */
  public async verifyResourcesButton(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.resourcesButton(), {
      message: 'Resources navigation should be visible',
      timeout: STANDARD_TIMEOUT,
    });
  }

  public async clickResourcesButton(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.resourcesButton(), 'aria-expanded')) !== 'true') {
      await ActionUtils.click(this.resourcesButton());
    }
  }

  public async verifyModelLink(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelLink(), {
      message: 'Models link should be visible under Resources',
    });
  }

  public async clickModelLink(): Promise<void> {
    await ActionUtils.click(this.modelLink());
  }

  public async verifyModelPageURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.modelPageURL(catalogData.project), {
      message: 'Models should open the requested project catalog',
    });
  }

  public async verifyModelHeader(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.modelHeadingText(), catalogData.heading, {
      message: 'Catalog heading should identify the Model Catalog',
    });
  }

  public async verifyModelCountBadge(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelCountBadge(), {
      message: 'Catalog heading should display the model count badge',
    });
  }

  public async verifyModelsTab(): Promise<void> {
    //added timeout because the tab might take longer to load models
    await AssertUtils.expectElementToBeVisible(this.modelsTab(), {
      timeout: STANDARD_TIMEOUT,
      message: 'Models tab should be visible',
    });
  }

  public async verifyChartTab(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartTab(), {
      message: 'Model Chart tab should be visible',
    });
  }

  public async clickChartTab(): Promise<void> {
    await ActionUtils.click(this.chartTab());
  }

  public async verifyLicensesTab(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.licensesTab(), {
      message: 'Licenses tab should be visible',
    });
  }

  /** The active tab is marked only by a "selected" class; there is no aria-selected attribute. */
  public async verifyModelsTabSelected(): Promise<void> {
    await AssertUtils.expectElementToHaveClass(this.modelsTab(), /\bselected\b/, {
      message: 'Models tab should be the selected tab',
    });
  }

  public async verifySearchInput(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.searchInput(), {
      message: 'Model search input should be visible',
    });
  }

  public async verifyAllFiltersButton(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.allFiltersButton(), {
      message: 'All Filters button should be visible',
    });
  }

  public async verifyChooseColumnsButton(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chooseColumnsButton(), {
      message: 'Choose columns button should be visible',
    });
  }

  public async verifyAllFiltersMenuExpanded(): Promise<void> {
    await AssertUtils.expectElementToHaveAttribute(this.allFiltersButton(), 'aria-expanded', 'true', {
      message: 'All Filters button should report its menu as expanded',
    });
  }

  /** Toggling an option can dismiss the menu, so reopen it instead of assuming it stayed up. */
  public async openAllFiltersMenu(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.allFiltersButton(), 'aria-expanded')) !== 'true') {
      await ActionUtils.click(this.allFiltersButton());
    }
  }

  /** Every option ships checked, so the open menu lists all filters, labelled and selected. */
  public async verifyAllFilterOptionsChecked(): Promise<void> {
    for (const { label, checkbox } of catalogFilterOptions) {
      await AssertUtils.expectElementToBeVisible(this.filterOptionRow(checkbox), {
        message: `All Filters menu should list a checkbox for the ${label} option`,
      });
      await AssertUtils.expectElementToHaveText(this.filterOptionLabel(checkbox), label, {
        message: `${label} option should be labelled "${label}"`,
      });
      await this.verifyFilterOptionChecked(label, checkbox);
    }
  }

  /** Mirror of the default menu state: a checked option means its filter sits on the filter bar. */
  public async verifyAllFilterButtonsDisplayed(): Promise<void> {
    for (const { label } of catalogFilterOptions) {
      await this.verifyFilterButtonDisplayed(label);
    }
  }

  /**
   * Clearing an option removes its filter from the filter bar; checking it again restores the filter and
   * returns the menu to its default state, so each option starts from the same baseline.
   */
  public async verifyEveryFilterOptionTogglesItsFilter(): Promise<void> {
    for (const { label, checkbox } of catalogFilterOptions) {
      await this.openAllFiltersMenu();
      await this.clickFilterOption(checkbox);
      await this.verifyFilterOptionNotChecked(label, checkbox);
      await this.verifyFilterButtonHidden(label);
      await this.openAllFiltersMenu();
      await this.clickFilterOption(checkbox);
      await this.verifyFilterOptionChecked(label, checkbox);
      await this.verifyFilterButtonDisplayed(label);
    }
  }

  private async clickFilterOption(checkbox: string): Promise<void> {
    await ActionUtils.click(this.filterOptionRow(checkbox));
  }

  private async verifyFilterOptionChecked(label: string, checkbox: string): Promise<void> {
    await AssertUtils.expectElementToBeChecked(this.filterOptionInput(checkbox), {
      message: `${label} option should be checked`,
    });
  }

  private async verifyFilterOptionNotChecked(label: string, checkbox: string): Promise<void> {
    await AssertUtils.expectElementNotToBeChecked(this.filterOptionInput(checkbox), {
      message: `${label} option should be unchecked`,
    });
  }

  private async verifyFilterButtonDisplayed(label: string): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.filterButton(label), {
      message: `${label} filter should be displayed on the catalog filter bar`,
    });
  }

  private async verifyFilterButtonHidden(label: string): Promise<void> {
    await AssertUtils.expectElementToBeHidden(this.filterButton(label), {
      message: `${label} filter should be removed from the catalog filter bar`,
    });
  }

  // Open the selector if it is currently closed.
  public async openColumnSelector(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.chooseColumnsButton(), 'aria-expanded')) !== 'true') {
      await ActionUtils.click(this.chooseColumnsButton());
    }
  }

  public async verifyColumnSelectorExpanded(): Promise<void> {
    await AssertUtils.expectElementToHaveAttribute(this.chooseColumnsButton(), 'aria-expanded', 'true', {
      message: 'Choose columns button should report its menu as expanded',
    });
  }

  /**
   * Which options are selected is persisted user state, so each option's state is read rather than assumed:
   * an already-selected one is cleared first to prove its column goes away, then selecting it must bring the
   * column back. Every option is left as it was found, so the options stay independent of one another.
   */
  public async verifyEveryColumnOptionTogglesItsColumn(): Promise<void> {
    for (const label of catalogColumnOptions) {
      await this.openColumnSelector();
      const wasSelected = await this.isColumnOptionSelected(label);
      if (wasSelected) {
        await this.clickColumnOption(label);
        await this.verifyColumnRemoved(label);
        await this.openColumnSelector();
      }
      await this.clickColumnOption(label);
      await this.verifyColumnAdded(label);
      if (!wasSelected) {
        await this.openColumnSelector();
        await this.clickColumnOption(label);
        await this.verifyColumnRemoved(label);
      }
    }
  }

  private async clickColumnOption(label: string): Promise<void> {
    await ActionUtils.click(this.columnOptionRow(label));
  }

  /** Reads the option's live state, so callers never have to assume which columns an environment ships. */
  private async isColumnOptionSelected(label: string): Promise<boolean> {
    return await ElementUtils.isElementChecked(this.columnOptionInput(label));
  }

  /** A checked option and its rendered column are two halves of the same state. */
  private async verifyColumnAdded(label: string): Promise<void> {
    await AssertUtils.expectElementToBeChecked(this.columnOptionInput(label), {
      message: `${label} option should be checked`,
    });
    await AssertUtils.expectElementToBeVisible(this.columnHeader(label), {
      message: `${label} column should be displayed in the model table`,
    });
    await this.verifyFixedColumnDisplayed();
  }

  private async verifyColumnRemoved(label: string): Promise<void> {
    await AssertUtils.expectElementNotToBeChecked(this.columnOptionInput(label), {
      message: `${label} option should be unchecked`,
    });
    await AssertUtils.expectElementToBeHidden(this.columnHeader(label), {
      message: `${label} column should be removed from the model table`,
    });
    await this.verifyFixedColumnDisplayed();
  }

  /** The fixed column has no option in the menu, so no toggle may remove it from the table. */
  private async verifyFixedColumnDisplayed(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.columnHeader(catalogFixedColumn), {
      message: `${catalogFixedColumn} column should remain displayed in the model table`,
    });
  }
}

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
import { type Locator, expect } from '@playwright/test';
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
  private readonly menuCheckboxRow = (testId: string): Locator =>
    LocatorUtils.getLocator(`[data-testid="input_checkbox_${testId}"]`);
  private readonly menuCheckboxInput = (testId: string): Locator => this.menuCheckboxRow(testId).locator('input');
  /** The option's visible text sits in the only titled node of its row. */
  private readonly filterOptionLabel = (checkbox: string): Locator => this.menuCheckboxRow(checkbox).locator('[title]');
  /** Table headers expose no data attribute, so the column role plus its name is the only stable handle. */
  private readonly columnHeader = (label: string): Locator =>
    this.catalog().getByRole('columnheader', { name: label, exact: true });
  private readonly modelTable = (): Locator => LocatorUtils.getLocatorByTestId('catalog-model-table');
  private readonly modelTableHeaders = (): Locator => this.modelTable().getByRole('columnheader');
  /** A prefix match on each row's own model id takes the rows as a set, skipping the virtual spacer row. */
  private readonly modelRows = (): Locator => this.modelTable().locator('[data-qa-id^="catalog-model-row-"]');
  /** Addressing a row by its own id keeps a re-windowing table from shifting a different row under a check. */
  private readonly modelRow = (modelId: string): Locator => this.modelTable().locator(`[data-qa-id="${modelId}"]`);
  private readonly modelRowCells = (row: Locator): Locator => row.getByRole('cell');
  /** The rows' scroll container exposes no data attribute, so its class inside the catalog is the handle. */
  private readonly modelTableScroller = (): Locator => this.catalog().locator('div.tableWrapper');

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
    await AssertUtils.expectElementToBeVisible(this.modelsTab(), {
      message: 'Models tab should be visible',
    });
  }

  public async verifyChartTab(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartTab(), {
      message: 'Model Chart tab should be visible',
    });
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

  // Open the menu if it is currently closed; its own button is the only thing that closes it again.
  public async openAllFiltersMenu(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.allFiltersButton(), 'aria-expanded')) !== 'true') {
      await ActionUtils.click(this.allFiltersButton());
    }
  }

  // Close the menu if it is currently open, so it stops overlaying the toolbar.
  private async closeAllFiltersMenu(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.allFiltersButton(), 'aria-expanded')) === 'true') {
      await ActionUtils.click(this.allFiltersButton());
    }
  }

  /** Every option ships checked, so the open menu lists all filters, labelled and selected. */
  public async verifyAllFilterOptionsChecked(): Promise<void> {
    for (const { label, checkbox } of catalogFilterOptions) {
      await AssertUtils.expectElementToBeVisible(this.menuCheckboxRow(checkbox), {
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
    // The menu stays up through every checkbox click, so it is opened once and closed at the end.
    await this.openAllFiltersMenu();
    for (const { label, checkbox } of catalogFilterOptions) {
      await this.clickMenuOption(checkbox);
      await this.verifyFilterOptionNotChecked(label, checkbox);
      await this.verifyFilterButtonHidden(label);
      await this.clickMenuOption(checkbox);
      await this.verifyFilterOptionChecked(label, checkbox);
      await this.verifyFilterButtonDisplayed(label);
    }
    await this.closeAllFiltersMenu();
  }

  private async verifyFilterOptionChecked(label: string, checkbox: string): Promise<void> {
    await AssertUtils.expectElementToBeChecked(this.menuCheckboxInput(checkbox), {
      message: `${label} option should be checked`,
    });
  }

  private async verifyFilterOptionNotChecked(label: string, checkbox: string): Promise<void> {
    await AssertUtils.expectElementNotToBeChecked(this.menuCheckboxInput(checkbox), {
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

  // Open the selector if it is currently closed; its own button is the only thing that closes it again.
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
    // The selector stays up through every checkbox click, so it is opened once and closed at the end.
    await this.openColumnSelector();
    for (const label of catalogColumnOptions) {
      const wasSelected = await this.isColumnOptionSelected(label);
      if (wasSelected) {
        await this.clickMenuOption(label);
        await this.verifyColumnRemoved(label);
      }
      await this.clickMenuOption(label);
      await this.verifyColumnAdded(label);
      if (!wasSelected) {
        await this.clickMenuOption(label);
        await this.verifyColumnRemoved(label);
      }
    }
    await this.closeColumnSelector();
  }

  /**
   * Every column switched on is the widest the table gets, so it is checked there and then put back: the
   * column selection belongs to the signed-in user, who is shared with every other test on the account.
   */
  public async verifyEveryColumnSelectedKeepsRowsPopulated(): Promise<void> {
    const switchedOnOptions = await this.selectAllColumnOptions();
    await this.verifyAllColumnOptionsChecked();
    await this.closeColumnSelector();
    await this.verifyAllColumnsDisplayed();
    await this.verifyEveryModelRowIsPopulated();
    await this.clearColumnOptions(switchedOnOptions);
  }

  /** Returns the options it switched on, which are the only ones that have to be put back. */
  private async selectAllColumnOptions(): Promise<string[]> {
    const switchedOnOptions: string[] = [];
    await this.openColumnSelector();
    for (const label of catalogColumnOptions) {
      // Clicking an already-selected option would clear it, so only the unselected ones are clicked.
      if (!(await this.isColumnOptionSelected(label))) {
        switchedOnOptions.push(label);
        await this.clickMenuOption(label);
      }
    }
    return switchedOnOptions;
  }

  /** Leaves the selector as the test found it, by clearing only what the test switched on. */
  private async clearColumnOptions(labels: string[]): Promise<void> {
    await this.openColumnSelector();
    for (const label of labels) {
      await this.clickMenuOption(label);
    }
    await this.closeColumnSelector();
  }

  // Close the selector if it is currently open, so its menu stops overlaying the table.
  private async closeColumnSelector(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.chooseColumnsButton(), 'aria-expanded')) === 'true') {
      await ActionUtils.click(this.chooseColumnsButton());
    }
  }

  /** Read with the selector still open, which is where a run of checkbox clicks leaves it. */
  private async verifyAllColumnOptionsChecked(): Promise<void> {
    for (const label of catalogColumnOptions) {
      await AssertUtils.expectElementToBeChecked(this.menuCheckboxInput(label), {
        message: `${label} option should be checked`,
      });
    }
  }

  /** With every option selected, the table shows the fixed column plus one column per option. */
  private async verifyAllColumnsDisplayed(): Promise<void> {
    await this.verifyFixedColumnDisplayed();
    for (const label of catalogColumnOptions) {
      await AssertUtils.expectElementToBeVisible(this.columnHeader(label), {
        message: `${label} column should be displayed in the model table`,
      });
    }
    await AssertUtils.expectElementToHaveCount(this.modelTableHeaders(), catalogColumnOptions.length + 1, {
      message: 'Model table should show a column for every selected option plus the fixed Name column',
    });
  }

  /** Both menus render the same checkbox row, so one click helper serves the filter and column options. */
  private async clickMenuOption(testId: string): Promise<void> {
    await ActionUtils.click(this.menuCheckboxRow(testId));
  }

  /** Reads the option's live state, so callers never have to assume which columns an environment ships. */
  private async isColumnOptionSelected(label: string): Promise<boolean> {
    return await ElementUtils.isElementChecked(this.menuCheckboxInput(label));
  }

  /** A checked option and its rendered column are two halves of the same state. */
  private async verifyColumnAdded(label: string): Promise<void> {
    await AssertUtils.expectElementToBeChecked(this.menuCheckboxInput(label), {
      message: `${label} option should be checked`,
    });
    await AssertUtils.expectElementToBeVisible(this.columnHeader(label), {
      message: `${label} column should be displayed in the model table`,
    });
    await this.verifyFixedColumnDisplayed();
  }

  private async verifyColumnRemoved(label: string): Promise<void> {
    await AssertUtils.expectElementNotToBeChecked(this.menuCheckboxInput(label), {
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

  public async verifyModelTableDisplayed(): Promise<void> {
    // added timeout to ensure the table has enough time to render before asserting its visibility
    await AssertUtils.expectElementToBeVisible(this.modelTable(), {
      message: 'Model table should be displayed on the Models tab',
      timeout: STANDARD_TIMEOUT,
    });
    await this.verifyFixedColumnDisplayed();
  }

  /** Every header carries a label, so no column reaches the user as an unnamed stripe of data. */
  public async verifyModelTableColumnHeadersLabelled(): Promise<void> {
    // Headers are not windowed like the rows, so a locator per header is safe to hold while asserting.
    const headers = await LocatorUtils.getAllLocators(this.modelTableHeaders());
    for (const header of headers) {
      await AssertUtils.expectElementValueNotToBeEmpty(header, {
        message: 'Every model table column should be displayed with a header label',
      });
    }
  }

  /** Verify at least one model row is visible in the virtualized table. */
  public async verifyModelRowsDisplayed(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelRows().first(), {
      message: 'Model table should render at least one model row',
    });
  }

  /**
   * Validate each unique model row while scrolling, then compare
   * the collected row count with the model count badge.
   */
  public async verifyEveryModelRowIsPopulated(): Promise<void> {
    // An empty catalog is a failure here, not a pass over nothing.
    await this.verifyModelRowsDisplayed();
    const columns = await ElementUtils.getAllTexts(this.modelTableHeaders());
    const nameColumn = columns.indexOf(catalogFixedColumn);
    const checkedModelIds = new Set<string>();
    await this.scrollModelTableToTop();
    while (true) {
      const modelIds = await this.readRenderedModelRowIds();
      for (const modelId of modelIds) {
        if (!checkedModelIds.has(modelId)) {
          await this.verifyModelRowIsPopulated(modelId, columns, nameColumn);
          checkedModelIds.add(modelId);
        }
      }
      // Checked before the break, so the rows rendered at the bottom are covered like any other window.
      if (await this.isModelTableAtBottom()) {
        await this.verifyModelCountBadgeMatches(checkedModelIds.size);
        return;
      }
      const previousTop = await this.readModelTableScrollTop();
      await this.scrollModelTableForward();
      // Short of the bottom, every pass has to advance: a stalled scroll fails here instead of spinning.
      await expect
        .poll(() => this.readModelTableScrollTop(), {
          message: 'Model table should scroll forward',
          timeout: STANDARD_TIMEOUT,
        })
        .toBeGreaterThan(previousTop);
    }
  }

  /** Scoping the cells to one row's own id keeps each assertion on the row whose name it reports. */
  private async verifyModelRowIsPopulated(modelId: string, columns: string[], nameColumn: number): Promise<void> {
    const cells = this.modelRowCells(this.modelRow(modelId));
    // Checked per row, so a row short of a cell cannot be offset by another row carrying a spare one.
    await AssertUtils.expectElementToHaveCount(cells, columns.length, {
      message: `Row ${modelId} should have one cell for each of the ${columns.length} columns (${columns.join(', ')})`,
    });
    const cellTexts = await ElementUtils.getAllTexts(cells);
    const rowName = cellTexts[nameColumn] ?? modelId;
    for (const [column, columnName] of columns.entries()) {
      // The row is pinned by its id and its cell count asserted above, so indexing its own cells is stable.
      await AssertUtils.expectElementValueNotToBeEmpty(cells.nth(column), {
        message: `The ${columnName} cell of row "${rowName}" should be populated`,
      });
    }
  }

  /** Read all currently rendered model row IDs in one DOM snapshot. */
  private async readRenderedModelRowIds(): Promise<string[]> {
    return await this.modelRows().evaluateAll(rows => rows.map(row => row.getAttribute('data-qa-id') ?? ''));
  }

  /** Starts the sweep from the first row whatever the table had scrolled to beforehand. */
  private async scrollModelTableToTop(): Promise<void> {
    await ActionUtils.pressLocatorKeyboard(this.modelTableScroller(), 'Home');
    await this.waitForRenderedModelRows();
  }

  /**
   * Pages the scroll container itself, so the next window renders whether or not the last row happened to sit
   * below the fold. The key goes to the container, which takes focus and scrolls like any scrollable box.
   */
  private async scrollModelTableForward(): Promise<void> {
    await ActionUtils.pressLocatorKeyboard(this.modelTableScroller(), 'PageDown');
    await this.waitForRenderedModelRows();
  }

  /** Wait for the scroll offset to remain unchanged across two frames, then check the last row's stability. */
  private async waitForRenderedModelRows(): Promise<void> {
    await PageUtils.waitForFunction(async () => {
      // Inlined because the function body runs in the page, where this file's locators do not exist.
      const container = document.querySelector('[data-qa-id="model-catalog-browse"] div.tableWrapper');
      if (container === null) {
        return false;
      }
      const offsetBeforeFrames = container.scrollTop;
      await new Promise(settled => requestAnimationFrame(() => requestAnimationFrame(settled)));
      return container.scrollTop === offsetBeforeFrames;
    });
    await ElementUtils.waitForElementToBeStable(this.modelRows().last());
  }

  /**
   * A scroll offset is not locator state, so this is read in the page. The couple of pixels of tolerance keep
   * fractional layout heights from reading as short of the bottom.
   */
  private async isModelTableAtBottom(): Promise<boolean> {
    return await this.modelTableScroller().evaluate(
      container => container.scrollTop + container.clientHeight >= container.scrollHeight - 2,
    );
  }

  /** Read the row container's current vertical scroll offset. */
  private async readModelTableScrollTop(): Promise<number> {
    return await this.modelTableScroller().evaluate(container => container.scrollTop);
  }

  /** Verify the badge matches the number of unique model rows checked. */
  private async verifyModelCountBadgeMatches(modelCount: number): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.modelCountBadge(), String(modelCount), {
      message: `Model count badge should report the ${modelCount} models this user can access`,
    });
  }
}

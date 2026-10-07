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
  type CatalogSortValueKind,
  catalogColumnOptions,
  catalogData,
  catalogFilterOptions,
  catalogFixedColumn,
  catalogSizeUnits,
  catalogSortableColumns,
} from '@testdata/models/catalog-test-data';

/** The configured URL may or may not end with a slash; normalize once so every route check agrees. */
const DASHBOARD_URL = BASE_URL.replace(/\/$/, '');

/** The two orders the model table can be sorted in; the table has no third, unsorted state. */
type SortDirection = 'ascending' | 'descending';

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
  /**
   * The sort indicator is an unlabelled icon with no data attribute, rendered inside the header of the
   * one column the table is currently sorted by, so its class inside the header row is the handle.
   */
  private readonly columnSortIndicator = (label: string): Locator => this.columnHeader(label).locator('.icon');
  private readonly columnSortIndicators = (): Locator => this.modelTableHeaders().locator('.icon');
  /** The rows' scroll container exposes no data attribute, so its class inside the catalog is the handle. */
  private readonly modelTableScroller = (): Locator => this.catalog().locator('div.tableWrapper');

  /** The table's column headers as the scroll sweep found them, in the order the table renders them. */
  private scannedColumns: string[] = [];
  /** Every row the scroll sweep reached, keyed by its own model id and holding that row's cell texts. */
  private readonly scannedRows = new Map<string, string[]>();

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

  /** Toggle each column twice and verify both states. */
  public async verifyEveryColumnOptionTogglesItsColumn(): Promise<void> {
    // The selector stays up through every checkbox click, so it is opened once and closed at the end.
    await this.openColumnSelector();
    for (const label of catalogColumnOptions) {
      const wasSelected = await this.isColumnOptionSelected(label);
      await this.clickMenuOption(label);
      await this.verifyColumnState(label, !wasSelected);
      await this.clickMenuOption(label);
      await this.verifyColumnState(label, wasSelected);
    }
    await this.closeColumnSelector();
  }

  /** Verify the checkbox and column match the expected state. */
  private async verifyColumnState(label: string, selected: boolean): Promise<void> {
    if (selected) {
      await this.verifyColumnAdded(label);
    } else {
      await this.verifyColumnRemoved(label);
    }
  }

  public async selectAllColumnOptions(): Promise<void> {
    await this.openColumnSelector();
    for (const label of catalogColumnOptions) {
      // Clicking an already-selected option would clear it, so only the unselected ones are clicked.
      if (!(await this.isColumnOptionSelected(label))) {
        await this.clickMenuOption(label);
      }
    }
  }

  // Close the selector if it is currently open, so its menu stops overlaying the table.
  public async closeColumnSelector(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.chooseColumnsButton(), 'aria-expanded')) === 'true') {
      await ActionUtils.click(this.chooseColumnsButton());
    }
  }

  /** Read with the selector still open, which is where a run of checkbox clicks leaves it. */
  public async verifyAllColumnOptionsChecked(): Promise<void> {
    for (const label of catalogColumnOptions) {
      await AssertUtils.expectElementToBeChecked(this.menuCheckboxInput(label), {
        message: `${label} option should be checked`,
      });
    }
  }

  /** With every option selected, the table shows the fixed column plus one column per option. */
  public async verifyAllColumnsDisplayed(): Promise<void> {
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
      // A header holds text, not an input value, and any non-whitespace character makes it a label.
      await AssertUtils.expectElementToHaveText(header, /\S/, {
        message: 'Every model table column should have a header label',
      });
    }
  }

  /** A sort control is marked only by the header's own class; the headers carry no aria-sort attribute. */
  public async verifyEverySortableColumnHasSortControl(): Promise<void> {
    for (const { label } of catalogSortableColumns) {
      await AssertUtils.expectElementToHaveClass(this.columnHeader(label), /\bsortable\b/, {
        message: `${label} column header should carry a sort control`,
      });
    }
  }

  /** Sort every sortable column ascending in turn and check that column's cells run that way. */
  public async verifyEverySortableColumnSortsAscending(): Promise<void> {
    await this.verifyEverySortableColumnSortsIn('ascending');
  }

  /** Sort every sortable column descending in turn and check that column's cells run that way. */
  public async verifyEverySortableColumnSortsDescending(): Promise<void> {
    await this.verifyEverySortableColumnSortsIn('descending');
  }

  /**
   * Each column is checked on its own values: a date column has to order by date and a size column by
   * size, not by the text the cells happen to spell out.
   */
  private async verifyEverySortableColumnSortsIn(direction: SortDirection): Promise<void> {
    for (const { label, kind } of catalogSortableColumns) {
      await this.sortColumnInDirection(label, direction);
      await this.verifyModelTableSortedByColumn(label, kind, direction);
    }
  }

  /**
   * A header's first click sorts its column descending and the next click reverses it, so reaching a
   * chosen direction takes one click or two depending on how that column is already sorted. Driving the
   * direction rather than counting clicks keeps each check standalone, whatever ran before it.
   */
  private async sortColumnInDirection(label: string, direction: SortDirection): Promise<void> {
    const firstDirection = await this.sortByColumn(label);
    if (firstDirection === direction) {
      return;
    }
    // A second click that leaves the order unchanged would mean the header stopped responding.
    const secondDirection = await this.sortByColumn(label);
    expect(secondDirection, `Clicking the ${label} header again should reverse its ${firstDirection} order`).toBe(
      direction,
    );
  }

  /** Click the header, let the reordered rows settle, and report which way the table now sorts. */
  private async sortByColumn(label: string): Promise<SortDirection> {
    await ActionUtils.click(this.columnHeader(label));
    await this.waitForRenderedModelRows();
    return await this.readColumnSortDirection(label);
  }

  /** The sorted header marks descending order with a "flipped" class, which turns its indicator over. */
  private async readColumnSortDirection(label: string): Promise<SortDirection> {
    const headerClasses = (await ElementUtils.getAttribute(this.columnHeader(label), 'class')) ?? '';
    return /\bflipped\b/.test(headerClasses) ? 'descending' : 'ascending';
  }

  /**
   * The table windows the rows it renders, but a window is always a contiguous run of the sorted order,
   * so wherever the table has scrolled to, its rendered cells have to run the sorted way without
   * turning back. That keeps the check honest without scrolling all 71 rows once per column.
   */
  private async verifyModelTableSortedByColumn(
    label: string,
    kind: CatalogSortValueKind,
    direction: SortDirection,
  ): Promise<void> {
    await this.verifySortIndicatorOnColumn(label);
    const cells = await this.readRenderedColumnCells(label);
    expect(cells.length, `Sorting by ${label} should leave the model table rendering rows to compare`).toBeGreaterThan(
      1,
    );
    const ascending = direction === 'ascending';
    for (let row = 1; row < cells.length; row++) {
      const previous = this.sortKey(cells[row - 1], kind, label);
      const current = this.sortKey(cells[row], kind, label);
      const order = this.compareSortKeys(previous, current);
      expect(
        ascending ? order : -order,
        `Sorting by ${label} ${direction} should not place "${cells[row - 1]}" before "${cells[row]}"`,
      ).toBeLessThanOrEqual(0);
    }
  }

  /** The column just clicked should be the only one wearing the indicator, so the sort moved with it. */
  private async verifySortIndicatorOnColumn(label: string): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.columnSortIndicator(label), {
      message: `${label} column header should show the sort indicator once the table is sorted by it`,
    });
    await AssertUtils.expectElementToHaveCount(this.columnSortIndicators(), 1, {
      message: `${label} should be the only column showing a sort indicator`,
    });
  }

  /** Read one column's rendered cells in row order, in a single snapshot so no re-render splits them. */
  private async readRenderedColumnCells(label: string): Promise<string[]> {
    const column = (await ElementUtils.getAllTexts(this.modelTableHeaders())).indexOf(label);
    expect(column, `${label} column should be rendered in the model table`).toBeGreaterThanOrEqual(0);
    return await this.modelRows().evaluateAll(
      (rows, index) => rows.map(row => (row.querySelectorAll('td')[index]?.innerText ?? '').trim()),
      column,
    );
  }

  /** Turn a cell's displayed text into the value the table orders that column by. */
  private sortKey(cell: string, kind: CatalogSortValueKind, label: string): string | number {
    switch (kind) {
      case 'text':
        return cell.toLowerCase();
      case 'date':
        return this.publishedDate(cell, label);
      case 'size':
        return this.sizeInBytes(cell, label);
      case 'count':
        return cell.split(',').length;
    }
  }

  private compareSortKeys(previous: string | number, current: string | number): number {
    if (typeof previous === 'string' && typeof current === 'string') {
      return previous.localeCompare(current);
    }
    return Number(previous) - Number(current);
  }

  /** A text comparison would read "Dec 30, 2023" as earlier than "Sep 12, 2023". */
  private publishedDate(cell: string, label: string): number {
    const parsed = Date.parse(cell);
    expect(Number.isNaN(parsed), `The ${label} cell "${cell}" should read as a date`).toBe(false);
    return parsed;
  }

  /** A text comparison would read "986.05 MB" as larger than "1.12 TB", so the unit has to be applied. */
  private sizeInBytes(cell: string, label: string): number {
    const match = /^([\d.]+)\s*([A-Z]+)$/.exec(cell);
    const multiplier = match === null ? undefined : catalogSizeUnits[match[2]];
    expect(
      multiplier,
      `The ${label} cell "${cell}" should read as an amount with a known unit (${Object.keys(catalogSizeUnits).join(', ')})`,
    ).toBeDefined();
    return Number(match?.[1]) * Number(multiplier);
  }

  /** Verify at least one model row is visible in the virtualized table. */
  public async verifyModelRowsDisplayed(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelRows().first(), {
      message: 'Model table should render at least one model row',
    });
  }

  /** Collect unique rows while scrolling and check scroll progress. */
  public async scrollThroughEveryModelRow(): Promise<void> {
    this.scannedColumns = await ElementUtils.getAllTexts(this.modelTableHeaders());
    this.scannedRows.clear();
    await this.scrollModelTableToTop();
    while (true) {
      for (const modelId of await this.readRenderedModelRowIds()) {
        if (!this.scannedRows.has(modelId)) {
          this.scannedRows.set(modelId, await this.readModelRowCells(modelId));
        }
      }
      // Read before the break, so the rows rendered at the bottom are collected like any other window.
      if (await this.isModelTableAtBottom()) {
        return;
      }
      const previousTop = await this.readModelTableScrollTop();
      await this.scrollModelTableForward();
      // Short of the bottom every page has to advance, so a stalled scroll says so instead of looping away.
      expect(
        await this.readModelTableScrollTop(),
        `Model table should scroll forward from ${previousTop}px, with ${this.scannedRows.size} rows collected`,
      ).toBeGreaterThan(previousTop);
    }
  }

  /** Verify each collected row has a populated cell per column. */
  public verifyEveryModelRowIsPopulated(): void {
    this.assertModelRowsWereScanned();
    const nameColumn = this.scannedColumns.indexOf(catalogFixedColumn);
    for (const [modelId, cells] of this.scannedRows) {
      // Checked per row, so a row short of a cell cannot be offset by another row carrying a spare one.
      expect(
        cells,
        `Row ${modelId} should have one cell for each of the ${this.scannedColumns.length} columns (${this.scannedColumns.join(', ')})`,
      ).toHaveLength(this.scannedColumns.length);
      const rowName = cells[nameColumn] ?? modelId;
      for (const [column, columnName] of this.scannedColumns.entries()) {
        // A cell of nothing but whitespace reaches the user as an empty one, so it has to fail here too.
        expect(cells[column], `The ${columnName} cell of row "${rowName}" should be populated`).toMatch(/\S/);
      }
    }
  }

  /** Verify the badge matches the number of unique model rows the sweep reached. */
  public async verifyModelCountBadgeMatchesScannedRows(): Promise<void> {
    this.assertModelRowsWereScanned();
    await AssertUtils.expectElementToHaveText(this.modelCountBadge(), String(this.scannedRows.size), {
      message: `Model count badge should report the ${this.scannedRows.size} models this user can access`,
    });
  }

  /** Ensure rows were collected before assertions. */
  private assertModelRowsWereScanned(): void {
    expect(
      this.scannedRows.size,
      'Model rows should have been collected by scrollThroughEveryModelRow before being verified',
    ).toBeGreaterThan(0);
  }

  /** Read all currently rendered model row IDs in one DOM snapshot. */
  private async readRenderedModelRowIds(): Promise<string[]> {
    return await this.modelRows().evaluateAll(rows => rows.map(row => row.getAttribute('data-qa-id') ?? ''));
  }

  /** Scoping the cells to one row's own id keeps each cell text on the row it is recorded against. */
  private async readModelRowCells(modelId: string): Promise<string[]> {
    return await ElementUtils.getAllTexts(this.modelRowCells(this.modelRow(modelId)));
  }

  /** Starts the sweep from the first row whatever the table had scrolled to beforehand. */
  private async scrollModelTableToTop(): Promise<void> {
    await ActionUtils.pressLocatorKeyboard(this.modelTableScroller(), 'Home');
    await this.waitForRenderedModelRows();
  }

  /** Scroll down one page and wait for rows to stabilize. */
  private async scrollModelTableForward(): Promise<void> {
    await ActionUtils.pressLocatorKeyboard(this.modelTableScroller(), 'PageDown');
    await this.waitForRenderedModelRows();
  }

  /** Wait for the last rendered model row to become stable. */
  private async waitForRenderedModelRows(): Promise<void> {
    await ElementUtils.waitForElementToBeStable(this.modelRows().last());
  }

  /** Read the row container's current vertical scroll offset. */
  private async readModelTableScrollTop(): Promise<number> {
    return await this.modelTableScroller().evaluate(container => container.scrollTop);
  }

  /** Check whether the table is at the bottom, allowing 2px tolerance. */
  private async isModelTableAtBottom(): Promise<boolean> {
    return await this.modelTableScroller().evaluate(
      container => container.scrollTop + container.clientHeight >= container.scrollHeight - 2,
    );
  }
}

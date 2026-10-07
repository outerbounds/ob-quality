import { ActionUtils, AssertUtils, ElementUtils, SMALL_TIMEOUT } from '@anaconda/playwright-utils';
import { ModelPage } from '@pages/models/model-page';
import { type Locator, expect } from '@playwright/test';
import { type CatalogSortValueKind, catalogSizeUnits } from '@testdata/models/catalog-test-data';

export type SortDirection = 'ascending' | 'descending';

export class ModelSortPage extends ModelPage {
  /** The sort indicator is an unlabelled icon, so its class inside the sorted header is the handle. */
  private readonly columnSortIndicator = (label: string): Locator => this.columnHeader(label).locator('.icon');
  private readonly columnSortIndicators = (): Locator => this.modelTableHeaders().locator('.icon');

  /** A sort control is marked only by the header's own class; the headers carry no aria-sort attribute. */
  public async verifySortableColumnSortControl(label: string): Promise<void> {
    await AssertUtils.expectElementToHaveClass(this.columnHeader(label), /\bsortable\b/, {
      message: `${label} column header should carry a sort control`,
    });
  }

  /** Click the column header until it sorts ascending, however it was sorted before. */
  public async sortColumnAscending(label: string): Promise<void> {
    await this.sortColumnInDirection(label, 'ascending');
  }

  /** Click the column header until it sorts descending, however it was sorted before. */
  public async sortColumnDescending(label: string): Promise<void> {
    await this.sortColumnInDirection(label, 'descending');
  }

  /** Reaching a direction takes one click or two, so each check stands alone whatever ran before it. */
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

  /** Click the header and return the order it ends in, waiting out the reversal every click makes. */
  private async sortByColumn(label: string): Promise<SortDirection> {
    const reversed = this.reverseOf(await this.readColumnSortDirection(label));
    await ActionUtils.click(this.columnHeader(label));
    // The indicator only reaches the column the table has re-sorted by, so it marks the sort as taken.
    await AssertUtils.expectElementToBeVisible(this.columnSortIndicator(label), {
      message: `Clicking the ${label} header should sort the model table by that column`,
    });
    await this.waitForColumnSortDirection(label, reversed);
    return reversed;
  }

  /** A reversal only turns the indicator over, so the header's own state is the one thing to poll. */
  private async waitForColumnSortDirection(label: string, direction: SortDirection): Promise<void> {
    await expect
      .poll(async () => await this.readColumnSortDirection(label), {
        message: `${label} column header should report its ${direction} sort`,
        timeout: SMALL_TIMEOUT,
      })
      .toBe(direction);
  }

  private reverseOf(direction: SortDirection): SortDirection {
    return direction === 'ascending' ? 'descending' : 'ascending';
  }

  /** The sorted header marks descending order with a "flipped" class, which turns its indicator over. */
  private async readColumnSortDirection(label: string): Promise<SortDirection> {
    const headerClasses = (await ElementUtils.getAttribute(this.columnHeader(label), 'class')) ?? '';
    return /\bflipped\b/.test(headerClasses) ? 'descending' : 'ascending';
  }

  /** Checked over every row with distinct values required, so a no-op reorder cannot pass. */
  public async verifyColumnSortOrder(
    label: string,
    kind: CatalogSortValueKind,
    direction: SortDirection,
  ): Promise<void> {
    await this.verifySortIndicatorOnColumn(label);
    const cells = await this.readSortedColumnCells(label);
    expect(cells.length, `Sorting by ${label} should leave the model table with rows to compare`).toBeGreaterThan(1);
    const keys = cells.map(cell => this.sortKey(cell, kind, label));
    expect(
      new Set(keys).size,
      `The ${label} column should hold more than one distinct value, or sorting it proves nothing`,
    ).toBeGreaterThan(1);
    const ascending = direction === 'ascending';
    for (let row = 1; row < cells.length; row++) {
      const order = this.compareSortKeys(keys[row - 1], keys[row]);
      expect(
        ascending ? order : -order,
        `Sorting by ${label} ${direction} should not place "${cells[row - 1]}" before "${cells[row]}"`,
      ).toBeLessThanOrEqual(0);
    }
  }

  /** The clicked column should be the only one wearing the indicator, so the sort moved with it. */
  private async verifySortIndicatorOnColumn(label: string): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.columnSortIndicator(label), {
      message: `${label} column header should show the sort indicator once the table is sorted by it`,
    });
    await AssertUtils.expectElementToHaveCount(this.columnSortIndicators(), 1, {
      message: `${label} should be the only column showing a sort indicator`,
    });
  }

  /** Sweep the whole table and read one column's cells in the order its rows are sorted. */
  private async readSortedColumnCells(label: string): Promise<string[]> {
    const column = (await ElementUtils.getAllTexts(this.modelTableHeaders())).indexOf(label);
    expect(column, `${label} column should be rendered in the model table`).toBeGreaterThanOrEqual(0);
    // Keyed by row id, so a row rendered in two windows is kept once, in the order it was first seen.
    const cellByRow = new Map<string, string>();
    await this.sweepModelTable(async () => {
      for (const { modelId, cell } of await this.readRenderedColumnCells(column)) {
        if (!cellByRow.has(modelId)) {
          cellByRow.set(modelId, cell);
        }
      }
    });
    // An order read from part of the table proves little, so the sweep has to have reached every model.
    const modelCount = Number(await ElementUtils.getText(this.modelCountBadge()));
    expect(
      cellByRow.size,
      `Sorting by ${label} should be checked against all ${modelCount} models the count badge reports`,
    ).toBe(modelCount);
    return [...cellByRow.values()];
  }

  /** One snapshot per window, so every cell text stays on the row it is recorded against. */
  private async readRenderedColumnCells(column: number): Promise<{ modelId: string; cell: string }[]> {
    return await this.modelRows().evaluateAll(
      (rows, index) =>
        rows.map(row => ({
          modelId: row.getAttribute('data-qa-id') ?? '',
          cell: (row.querySelectorAll('td')[index]?.innerText ?? '').trim(),
        })),
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
        // An empty cell lists nothing, which "".split(",") would otherwise count as one value.
        return cell.split(',').filter(value => value.trim().length > 0).length;
    }
  }

  /** Text keys come in normalized and compare as text; anything else compares as a number. */
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

  /** Sizes compare as bytes: a text comparison would read "986.05 MB" as larger than "1.12 TB". */
  private sizeInBytes(cell: string, label: string): number {
    const match = /^(\d+(?:\.\d+)?)\s*([A-Z]+)$/.exec(cell);
    const multiplier = match === null ? undefined : catalogSizeUnits[match[2]];
    expect(
      multiplier,
      `The ${label} cell "${cell}" should read as an amount with a known unit (${Object.keys(catalogSizeUnits).join(', ')})`,
    ).toBeDefined();
    return Number(match?.[1]) * Number(multiplier);
  }
}

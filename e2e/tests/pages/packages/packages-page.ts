import {
  AssertUtils,
  BIG_TIMEOUT,
  ElementUtils,
  LocatorUtils,
  PageUtils,
  STANDARD_TIMEOUT,
} from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { type Locator } from '@playwright/test';
import {
  type PackagesColumn,
  type SecureChannel,
  channelRowFormats,
  nonEmptyText,
  packagesColumn,
  packagesColumns,
  packagesData,
} from '@testdata/packages/packages-test-data';

/** The configured URL may or may not end with a slash; normalize once so every route check agrees. */
const DASHBOARD_URL = BASE_URL.replace(/\/$/, '');

/**
 * The Packages page: the secure channel list of a project. Timing: the first channel list query can take 10–15s,
 * so the heading check right after a hard load uses BIG_TIMEOUT and the later list checks STANDARD_TIMEOUT.
 */
export class PackagesPage {
  private readonly packagesHeading = '#center-content h1';
  /** The "Listing from N secure channels" note has no data attribute; its class is the only stable handle. */
  private readonly channelSummary = '#center-content .listing-note';
  private readonly columnHeaders = '#center-content table thead th';
  private readonly channelRows = '[data-testid="package-row"]';
  private readonly resourcesButton = (): Locator =>
    LocatorUtils.getLocatorByRole('navigation').getByRole('button', {
      name: packagesData.resourcesNavLabel,
      exact: true,
    });
  private readonly packagesLink = (): Locator =>
    LocatorUtils.getLocator(`nav a[href="${new URL(this.packagesPageURL(packagesData.project)).pathname}"]`);
  /** A cell with no visible text; the table must have none. */
  private readonly emptyChannelCells = (): Locator =>
    LocatorUtils.getLocator(`${this.channelRows} > td`).filter({ hasNotText: nonEmptyText });
  /** Exact text is required: the main channel's name is a prefix of the main-x channel's name. */
  private readonly channelRow = (name: string): Locator =>
    LocatorUtils.getLocator(this.channelRows).filter({
      has: LocatorUtils.getLocator('.channel .name').getByText(name, { exact: true }),
    });
  private readonly channelRowPackageCount = (name: string): Locator =>
    this.channelRow(name).locator('.channel .packages');
  /** Last resort: Source, Policy and Policy Results cells carry no attributes, so the column position is used. */
  private readonly channelRowCell = (name: string, column: PackagesColumn): Locator =>
    this.channelRow(name).locator(`:scope > td:nth-of-type(${packagesColumns.indexOf(column) + 1})`);
  private readonly channelRowPolicyTag = (name: string): Locator =>
    this.channelRowCell(name, packagesColumn.policy).locator('.badge');
  private readonly channelRowPolicyResults = (name: string): Locator =>
    this.channelRowCell(name, packagesColumn.policyResults).locator('.truncate-text');

  private packagesPageURL(project: string): string {
    return `${DASHBOARD_URL}/p/${project}/packages`;
  }

  public async navigateToPackagesPage(): Promise<void> {
    await PageUtils.gotoURL(this.packagesPageURL(packagesData.project), { waitUntil: 'domcontentloaded' });
  }

  public async verifyPackagesPageURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.packagesPageURL(packagesData.project), {
      message: 'Browser should still be on the project Packages page',
    });
  }

  public async verifyPageTitle(): Promise<void> {
    await AssertUtils.expectPageToHaveTitle(packagesData.heading, {
      message: 'Browser tab title should name the Packages page',
    });
  }

  /** The active nav item is marked with aria-current="page" inside the expanded Resources group. */
  public async verifyPackagesNavItemActive(): Promise<void> {
    await AssertUtils.expectElementToHaveAttribute(this.resourcesButton(), 'aria-expanded', 'true', {
      message: 'Resources nav group should be expanded on the Packages page',
    });
    await AssertUtils.expectElementToHaveAttribute(this.packagesLink(), 'aria-current', 'page', {
      message: 'Packages nav item should be marked as the current page',
    });
  }

  public async verifyPackagesHeading(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.packagesHeading, packagesData.heading, {
      message: 'Page heading should read Packages',
      timeout: BIG_TIMEOUT,
    });
  }

  /** The channel count is read from the summary itself, so the check holds whatever the environment holds. */
  public async verifySummaryCountMatchesRows(): Promise<void> {
    await AssertUtils.expectElementToContainText(this.channelSummary, packagesData.summaryPattern, {
      message: 'Summary should state how many secure channels are listed',
      timeout: STANDARD_TIMEOUT,
    });
    const summary = await ElementUtils.getText(this.channelSummary);
    const listedCount = Number(packagesData.summaryPattern.exec(summary)?.[1]);
    await AssertUtils.expectElementToHaveCount(this.channelRows, listedCount, {
      message: 'Summary channel count should equal the number of table rows',
    });
  }

  public async verifyColumnHeadersInOrder(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.columnHeaders, [...packagesColumns], {
      message: 'Table should show the Secure Channel, Source, Policy and Policy Results columns in order',
      timeout: STANDARD_TIMEOUT,
    });
  }

  public async verifyChannelRowCount(channels: readonly SecureChannel[]): Promise<void> {
    await AssertUtils.expectElementToHaveCount(this.channelRows, channels.length, {
      message: 'Table should list one row per secure channel',
      timeout: STANDARD_TIMEOUT,
    });
  }

  /**
   * Verifies one channel row: the "N packages" count, the source, the policy tag (exact when the channel's policy is
   * fixed, otherwise only non-empty) and the "N files removed" policy results.
   */
  public async verifyChannelRow(channel: SecureChannel): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.channelRow(channel.name), {
      message: `${channel.name} row should be listed`,
      timeout: STANDARD_TIMEOUT,
    });
    await AssertUtils.expectElementToHaveText(
      this.channelRowPackageCount(channel.name),
      channelRowFormats.packageCount,
      { message: `${channel.name} row should show "N packages"` },
    );
    await AssertUtils.expectElementToHaveText(
      this.channelRowCell(channel.name, packagesColumn.source),
      channel.source,
      {
        message: `${channel.name} row should show its source`,
      },
    );
    await AssertUtils.expectElementToHaveText(this.channelRowPolicyTag(channel.name), channel.policy ?? nonEmptyText, {
      message: `${channel.name} row should tag its active policy`,
    });
    await AssertUtils.expectElementToHaveText(
      this.channelRowPolicyResults(channel.name),
      channelRowFormats.policyResults,
      { message: `${channel.name} row should show "N files removed"` },
    );
  }

  public async verifyNoEmptyCells(): Promise<void> {
    await AssertUtils.expectElementToHaveCount(this.emptyChannelCells(), 0, {
      message: 'Every cell of every secure channel row should have content',
    });
  }
}

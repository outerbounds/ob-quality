import {
  ActionUtils,
  AssertUtils,
  BIG_TIMEOUT,
  ElementUtils,
  LocatorUtils,
  PageUtils,
} from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { type Locator } from '@playwright/test';
import { packagesData, secureChannels } from '@testdata/packages/packages-test-data';

type SecureChannel = (typeof secureChannels)[number];
type PackagesColumn = (typeof packagesData.columns)[number];

/** The Packages page: the secure channel list of a project. */
export class PackagesPage {
  private readonly packagesPageURL = (): string => `${BASE_URL}/p/${packagesData.project}/packages`;
  private readonly packagesHeading = '#center-content h1';
  /** The "Listing from N secure channels" note has no data attribute; its class is the only stable handle. */
  private readonly channelSummary = '#center-content .listing-note';
  private readonly columnHeaders = '#center-content table thead th';
  private readonly channelRows = '[data-testid="package-row"]';
  private readonly channelNames = `${this.channelRows} .channel .name`;
  /** Table headers expose no data attribute, so the column role plus its name (the first column) is the only handle. */
  private readonly secureChannelHeader = (): Locator =>
    LocatorUtils.getLocator('#center-content table').getByRole('columnheader', {
      name: packagesData.columns[0],
      exact: true,
    });
  private readonly resourcesButton = (): Locator =>
    LocatorUtils.getLocatorByRole('navigation').getByRole('button', {
      name: packagesData.resourcesNavLabel,
      exact: true,
    });
  private readonly packagesLink = (): Locator =>
    LocatorUtils.getLocator(`nav a[href="${new URL(this.packagesPageURL()).pathname}"]`);
  /** Exact text is required: the main channel's name is a prefix of the main-x channel's name. */
  private readonly channelRow = (name: string): Locator =>
    LocatorUtils.getLocator(this.channelRows).filter({
      has: LocatorUtils.getLocator('.channel .name').getByText(name, { exact: true }),
    });
  private readonly channelRowPackageCount = (name: string): Locator =>
    this.channelRow(name).locator('.channel .packages');
  /** Last resort: Source, Policy and Policy Results cells carry no attributes, so the column position is used. */
  private readonly channelRowCell = (name: string, column: PackagesColumn): Locator =>
    this.channelRow(name).locator(`:scope > td:nth-of-type(${packagesData.columns.indexOf(column) + 1})`);
  private readonly channelRowPolicyTag = (name: string): Locator =>
    this.channelRowCell(name, 'Policy').locator('.badge');
  private readonly channelRowPolicyResults = (name: string): Locator =>
    this.channelRowCell(name, 'Policy Results').locator('.truncate-text');

  public async navigateToPackagesPage(): Promise<void> {
    await PageUtils.gotoURL(this.packagesPageURL());
  }

  public async verifyPackagesPageURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.packagesPageURL(), {
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

  /**
   * The heading renders only after the slow first channel list query (often 10–15s), so the default 5s fails;
   * once it is visible, the rest of the page is loaded and the later checks need no override.
   */
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
    });
    const summary = await ElementUtils.getText(this.channelSummary);
    const listedCount = Number(packagesData.summaryPattern.exec(summary)?.[1]);
    await AssertUtils.expectElementToHaveCount(this.channelRows, listedCount, {
      message: 'Summary channel count should equal the number of table rows',
    });
  }

  public async verifyColumnHeadersInOrder(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.columnHeaders, [...packagesData.columns], {
      message: 'Table should show the Secure Channel, Source, Policy and Policy Results columns in order',
    });
  }

  public async verifyChannelRowCount(channels: readonly SecureChannel[]): Promise<void> {
    await AssertUtils.expectElementToHaveCount(this.channelRows, channels.length, {
      message: 'Table should list one row per secure channel',
    });
  }

  /**
   * Verifies one channel row: the "N packages" count, the source, the policy tag (exact when the channel's policy is
   * fixed, otherwise only non-empty) and the "N files removed" policy results.
   */
  public async verifyChannelRow(channel: SecureChannel): Promise<void> {
    await AssertUtils.expectElementToHaveText(
      this.channelRowPackageCount(channel.name),
      packagesData.packageCountPattern,
      { message: `${channel.name} row should show "N packages"` },
    );
    await AssertUtils.expectElementToHaveText(this.channelRowCell(channel.name, 'Source'), channel.source, {
      message: `${channel.name} row should show its source`,
    });
    await AssertUtils.expectElementToHaveText(this.channelRowPolicyTag(channel.name), channel.policy, {
      message: `${channel.name} row should tag its active policy`,
    });
    await AssertUtils.expectElementToHaveText(
      this.channelRowPolicyResults(channel.name),
      packagesData.policyResultsPattern,
      { message: `${channel.name} row should show "N files removed"` },
    );
  }

  /** Opens a channel's page in Resources > Packages by clicking its row. */
  public async clickChannelRow(name: string): Promise<void> {
    await ActionUtils.clickAndNavigate(this.channelRow(name));
  }

  public async clickSecureChannelHeader(): Promise<void> {
    await ActionUtils.click(this.secureChannelHeader());
  }

  /** Secure channels are listed A→Z by name on load and after the second Secure Channel click. */
  public async verifyChannelsSortedAscending(channels: readonly SecureChannel[]): Promise<void> {
    await AssertUtils.expectElementToHaveText(
      this.channelNames,
      channels.map(channel => channel.name),
      { message: 'Channels should be in A→Z order' },
    );
  }

  public async verifyChannelsSortedDescending(channels: readonly SecureChannel[]): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.channelNames, channels.map(channel => channel.name).reverse(), {
      message: 'Channels should be in Z→A order',
    });
  }
}

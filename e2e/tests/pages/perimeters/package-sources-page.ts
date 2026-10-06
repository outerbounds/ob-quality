import { AssertUtils, LocatorUtils, PageUtils } from '@anaconda/playwright-utils';
import { assignedPolicyName, findChannel, loadChannelsPayload } from '@pages/perimeters/channel-policy-api';
import { type ChannelsWithArtifactsPayload } from '@pages/perimeters/channel-policy-types';
import { packageSourcesURL } from '@pages/perimeters/perimeters-routes';
import { SELECTED_CLASS, requireValue } from '@pages/perimeters/perimeters-utils';
import { type Locator } from '@playwright/test';
import {
  baselinePolicy,
  codeRoutesData,
  packageSourcesData,
  type secureChannels,
} from '@testdata/perimeters/package-sources-test-data';

type SecureChannel = (typeof secureChannels)[number];

/** Perimeters > Code > Package Sources: the secure channel list and the policy tags of each channel. */
export class PackageSourcesPage {
  private readonly perimetersHeading = '#center-content h1';
  /** Code and Package Sources link to the same route; the sub-tab strip is the "flat" one. */
  private readonly codeTab = `.tab-list:not(.flat) a[role="tab"][href$="/${codeRoutesData.sourcesPath}"]`;
  private readonly packageSourcesTab = `.tab-list.flat a[role="tab"][href$="/${codeRoutesData.sourcesPath}"]`;
  /** Last resort: the tab body is heading, table (secure channels first) with no other handle. */
  private readonly secureChannelsHeading = '.sourcesTab > p:nth-of-type(1)';
  private readonly secureChannelRows = '.sourcesTab > table:nth-of-type(1) tr';
  /** Exact text is required: the main channel's name is a prefix of the main-x channel's name. */
  private readonly secureChannelRow = (name: string): Locator =>
    LocatorUtils.getLocator(this.secureChannelRows).filter({
      has: LocatorUtils.getLocator('.left .body-sm.text-black').getByText(name, { exact: true }),
    });
  private readonly secureChannelSubtitle = (name: string): Locator =>
    this.secureChannelRow(name).locator('.left .bottom.label');
  private readonly secureChannelTags = (name: string): Locator => this.secureChannelRow(name).locator('.badges .badge');

  /** The ChannelsWithArtifacts response the page loaded with; the policy tag checks compare the UI with it. */
  private loadedChannels: ChannelsWithArtifactsPayload | null = null;

  /** Opens Package Sources of the test perimeter and keeps the page's own ChannelsWithArtifacts response. */
  public async loadPackageSources(): Promise<void> {
    this.loadedChannels = await loadChannelsPayload(() =>
      PageUtils.gotoURL(packageSourcesURL(packageSourcesData.perimeter)),
    );
  }

  public async verifyPackageSourcesURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(packageSourcesURL(packageSourcesData.perimeter), {
      message: 'Browser should stay on the Package Sources route',
    });
  }

  public async verifyPerimetersHeading(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.perimetersHeading, packageSourcesData.heading, {
      message: 'Page heading should read Perimeters',
    });
  }

  public async verifyCodeTabSelected(): Promise<void> {
    await AssertUtils.expectElementToHaveClass(this.codeTab, SELECTED_CLASS, {
      message: 'Code tab should be selected',
    });
  }

  public async verifyPackageSourcesTabSelected(): Promise<void> {
    await AssertUtils.expectElementToHaveClass(this.packageSourcesTab, SELECTED_CLASS, {
      message: 'Package Sources sub-tab should be selected',
    });
  }

  /** The heading count and the number of listed rows must both equal the number of expected secure channels. */
  public async verifySecureChannelsHeading(channels: readonly SecureChannel[]): Promise<void> {
    const count = channels.length;
    await AssertUtils.expectElementToHaveText(
      this.secureChannelsHeading,
      packageSourcesData.secureChannelsHeading(count),
      { message: `Secure channels heading should state a count of ${count}` },
    );
    await AssertUtils.expectElementToHaveCount(this.secureChannelRows, count, {
      message: `Secure channels list should have exactly ${count} row(s)`,
    });
  }

  /** Verifies a secure channel row shows its name and its "<source> · N packages" subtitle. */
  public async verifySecureChannel(channel: SecureChannel): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.secureChannelRow(channel.name), {
      message: `${channel.name} should be listed as a secure channel`,
    });
    await AssertUtils.expectElementToHaveText(
      this.secureChannelSubtitle(channel.name),
      packageSourcesData.secureChannelSubtitle(channel.source),
      { message: `${channel.name} should show its source and package count` },
    );
  }

  /**
   * Verifies the row tags match the policy the API reported when the page loaded: "Default" plus the policy name on the
   * shared default policy, otherwise the policy name alone. So the check holds whichever policy a shared channel is on.
   */
  public async verifySecureChannelTagsMatchPolicy(channel: string): Promise<void> {
    const payload = requireValue(this.loadedChannels, 'Package Sources must be loaded first');
    const channelData = findChannel(payload, channel);
    const policyName = requireValue(assignedPolicyName(channelData), `${channel} should have an assigned policy`);
    const tags = channelData.isDefaultPolicy === true ? [baselinePolicy.tag, policyName] : [policyName];
    await AssertUtils.expectElementToHaveText(this.secureChannelTags(channel), tags, {
      message: `${channel} should be tagged ${tags.join(' + ')}`,
    });
  }
}

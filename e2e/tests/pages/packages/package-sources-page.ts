import { AssertUtils, BIG_TIMEOUT, LocatorUtils, PageUtils } from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { type Locator } from '@playwright/test';
import { packageSourcesData, type secureChannels } from '@testdata/packages/package-sources-test-data';

type SecureChannel = (typeof secureChannels)[number];

/** The ChannelsWithArtifacts fields the tests read. A channel without a policy reports null or an empty name. */
type ChannelPayload = {
  name: string;
  isDefaultPolicy: boolean | null;
  assignedPolicy: { name: string } | null;
};

type ChannelsResponseBody = {
  data?: { channels?: { channels?: ChannelPayload[] } };
  errors?: unknown[];
};

/** Perimeters > Code > Package Sources: the secure channel list and the policy tags of each channel. */
export class PackageSourcesPage {
  private readonly packageSourcesURL = (): string =>
    `${BASE_URL}/${packageSourcesData.perimetersPath}/${packageSourcesData.perimeter}/${packageSourcesData.sourcesPath}`;
  private readonly perimetersHeading = '#center-content h1';
  /** Code and Package Sources link to the same route; the sub-tab strip is the "flat" one. */
  private readonly codeTab = `.tab-list:not(.flat) a[role="tab"][href$="/${packageSourcesData.sourcesPath}"]`;
  private readonly packageSourcesTab = `.tab-list.flat a[role="tab"][href$="/${packageSourcesData.sourcesPath}"]`;
  /** Last resort: the tab body is a heading and a table per channel group (secure first) with no other handle. */
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

  /** The channels of the ChannelsWithArtifacts response the page loaded with; the tag checks compare the UI with it. */
  private loadedChannels: ChannelPayload[] = [];

  /**
   * Opens Package Sources of the test perimeter and keeps the page's own ChannelsWithArtifacts response. The query
   * often takes 10–15s, so the default 5s fails; once it has arrived, the later checks need no override.
   */
  public async loadPackageSources(): Promise<void> {
    const [response] = await Promise.all([
      PageUtils.waitForResponse(
        candidate => {
          const url = new URL(candidate.url());
          return (
            url.pathname.endsWith(packageSourcesData.graphqlPath) &&
            url.searchParams.get('op') === packageSourcesData.channelsOperation
          );
        },
        { timeout: BIG_TIMEOUT },
      ),
      PageUtils.gotoURL(this.packageSourcesURL()),
    ]);
    const body = (await response.json()) as ChannelsResponseBody;
    const channels = body.data?.channels?.channels;
    if (!channels) {
      throw new Error(
        `${packageSourcesData.channelsOperation} should return a channel list; errors: ${JSON.stringify(body.errors ?? [])}`,
      );
    }
    this.loadedChannels = channels;
  }

  public async verifyPackageSourcesURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.packageSourcesURL(), {
      message: 'Browser should stay on the Package Sources route',
    });
  }

  public async verifyPerimetersHeading(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.perimetersHeading, packageSourcesData.heading, {
      message: 'Page heading should read Perimeters',
    });
  }

  public async verifyCodeTabSelected(): Promise<void> {
    await AssertUtils.expectElementToHaveClass(this.codeTab, packageSourcesData.selectedClass, {
      message: 'Code tab should be selected',
    });
  }

  public async verifyPackageSourcesTabSelected(): Promise<void> {
    await AssertUtils.expectElementToHaveClass(this.packageSourcesTab, packageSourcesData.selectedClass, {
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

  /** Verifies the row of a secure channel (found by its exact name) shows its "<source> · N packages" subtitle. */
  public async verifySecureChannel(channel: SecureChannel): Promise<void> {
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
    const channelData = this.loadedChannels.find(candidate => candidate.name === channel);
    const policyName = channelData?.assignedPolicy?.name;
    if (!channelData || !policyName) {
      throw new Error(`${packageSourcesData.channelsOperation} should report an assigned policy for ${channel}`);
    }
    const tags =
      channelData.isDefaultPolicy === true ? [packageSourcesData.defaultPolicyTag, policyName] : [policyName];
    await AssertUtils.expectElementToHaveText(this.secureChannelTags(channel), tags, {
      message: `${channel} should be tagged ${tags.join(' + ')}`,
    });
  }
}

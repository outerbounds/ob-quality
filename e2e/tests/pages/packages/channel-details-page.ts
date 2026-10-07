import { ActionUtils, AssertUtils } from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { channelPageData, packagesData } from '@testdata/packages/packages-test-data';

/** The page of one channel in Resources > Packages. Channel names contain a slash, which the app encodes as %2F. */
export class ChannelDetailsPage {
  private readonly channelPackagesURL = (channel: string): string =>
    `${BASE_URL}/p/${packagesData.project}/packages/${encodeURIComponent(channel)}/packages`;
  private readonly channelHeading = '#center-content h1';
  /** The "Source is … Contains N packages …" summary has no data attribute; its class is the only handle. */
  private readonly channelSummary = '#center-content .details';
  private readonly goBackLink = `#center-content a[aria-label="${channelPageData.goBackLabel}"]`;

  public async verifyChannelDetailsPageUrlAndHeader(channel: string): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.channelPackagesURL(channel), {
      message: 'Browser should be on the channel page in Resources > Packages',
    });
    await AssertUtils.expectElementToHaveText(this.channelHeading, channel, {
      message: 'Channel page heading should show the channel name',
    });
  }

  public async clickGoBackLink(): Promise<void> {
    await ActionUtils.clickAndNavigate(this.goBackLink);
  }

  public async verifySummaryPackageCount(count: number): Promise<void> {
    await AssertUtils.expectElementToContainText(this.channelSummary, channelPageData.summaryPackageCount(count), {
      message: `Channel page should show "Contains ${count} packages"`,
    });
  }
}

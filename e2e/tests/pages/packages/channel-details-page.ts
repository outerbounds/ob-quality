import { AssertUtils } from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { packagesData } from '@testdata/packages/packages-test-data';

/** The page of one channel in Resources > Packages. Channel names contain a slash, which the app encodes as %2F. */
export class ChannelDetailsPage {
  private readonly channelPackagesURL = (channel: string): string =>
    `${BASE_URL}/p/${packagesData.project}/packages/${encodeURIComponent(channel)}/packages`;
  private readonly channelHeading = '#center-content h1';

  public async verifyChannelDetailsPageUrlAndHeader(channel: string): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.channelPackagesURL(channel), {
      message: 'Browser should be on the channel page in Resources > Packages',
    });
    await AssertUtils.expectElementToHaveText(this.channelHeading, channel, {
      message: 'Channel page heading should show the channel name',
    });
  }
}

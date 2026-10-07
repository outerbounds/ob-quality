import { ChannelDetailsPage } from '@pages/packages/channel-details-page';
import { ChannelDrawerPage } from '@pages/packages/channel-drawer-page';
import { PackageSourcesPage } from '@pages/packages/package-sources-page';
import { PackagesPage } from '@pages/packages/packages-page';
import { test as baseTest, expect } from '@page-setup';

type PackageFixtures = {
  packagesPage: PackagesPage;
  packageSourcesPage: PackageSourcesPage;
  channelDrawerPage: ChannelDrawerPage;
  channelDetailsPage: ChannelDetailsPage;
};

export const test = baseTest.extend<PackageFixtures>({
  packagesPage: async ({}, use) => {
    await use(new PackagesPage());
  },
  packageSourcesPage: async ({}, use) => {
    await use(new PackageSourcesPage());
  },
  channelDrawerPage: async ({}, use) => {
    await use(new ChannelDrawerPage());
  },
  channelDetailsPage: async ({}, use) => {
    await use(new ChannelDetailsPage());
  },
});

export { expect };

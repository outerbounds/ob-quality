import { PackageSourcesPage } from '@pages/packages/package-sources-page';
import { PackagesPage } from '@pages/packages/packages-page';
import { test as baseTest, expect } from '@page-setup';

type PackageFixtures = {
  packagesPage: PackagesPage;
  packageSourcesPage: PackageSourcesPage;
};

export const test = baseTest.extend<PackageFixtures>({
  packagesPage: async ({}, use) => {
    await use(new PackagesPage());
  },
  packageSourcesPage: async ({}, use) => {
    await use(new PackageSourcesPage());
  },
});

export { expect };

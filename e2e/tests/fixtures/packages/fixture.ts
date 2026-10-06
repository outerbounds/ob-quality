import { PackageSourcesPage } from '@pages/packages/package-sources-page';
import { test as baseTest, expect } from '@page-setup';

type PackageFixtures = {
  packageSourcesPage: PackageSourcesPage;
};

export const test = baseTest.extend<PackageFixtures>({
  packageSourcesPage: async ({}, use) => {
    await use(new PackageSourcesPage());
  },
});

export { expect };

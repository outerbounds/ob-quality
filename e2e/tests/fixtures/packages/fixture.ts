import { PackagesPage } from '@pages/packages/packages-page';
import { test as baseTest, expect } from '@page-setup';

type PackageFixtures = {
  packagesPage: PackagesPage;
};

export const test = baseTest.extend<PackageFixtures>({
  packagesPage: async ({}, use) => {
    await use(new PackagesPage());
  },
});

export { expect };

import { PackageSourcesPage } from '@pages/perimeters/package-sources-page';
import { test as baseTest, expect } from '@page-setup';

type PerimeterFixtures = {
  packageSourcesPage: PackageSourcesPage;
};

export const test = baseTest.extend<PerimeterFixtures>({
  packageSourcesPage: async ({}, use) => {
    await use(new PackageSourcesPage());
  },
});

export { expect };

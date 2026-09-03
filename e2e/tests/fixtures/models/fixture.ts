import { OBPage } from '@pages/models/ob-page';
import { test as baseTest, expect } from '@page-setup';

type ModelFixtures = {
  obPage: OBPage;
};

export const test = baseTest.extend<ModelFixtures>({
  obPage: async ({}, use) => {
    await use(new OBPage());
  },
});

export { expect };

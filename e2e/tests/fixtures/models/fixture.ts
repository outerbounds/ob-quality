import { ModelPage } from '@pages/models/model-page';
import { test as baseTest, expect } from '@page-setup';

type ModelFixtures = {
  modelPage: ModelPage;
};

export const test = baseTest.extend<ModelFixtures>({
  modelPage: async ({}, use) => {
    await use(new ModelPage());
  },
});

export { expect };

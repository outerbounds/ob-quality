import { ModelChartPage } from '@pages/models/model-chart-page';
import { ModelPage } from '@pages/models/model-page';
import { test as baseTest, expect } from '@page-setup';

type ModelFixtures = {
  modelPage: ModelPage;
  modelChartPage: ModelChartPage;
};

export const test = baseTest.extend<ModelFixtures>({
  modelPage: async ({}, use) => {
    await use(new ModelPage());
  },

  modelChartPage: async ({}, use) => {
    await use(new ModelChartPage());
  },
});

export { expect };

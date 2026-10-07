import { ModelChartPage } from '@pages/models/model-chart';
import { ModelPage } from '@pages/models/model-page';
import { ModelSortPage } from '@pages/models/model-sort';
import { test as baseTest, expect } from '@page-setup';

type ModelFixtures = {
  modelPage: ModelPage;
  modelChart: ModelChartPage;
  modelSort: ModelSortPage;
};

export const test = baseTest.extend<ModelFixtures>({
  modelPage: async ({}, use) => {
    await use(new ModelPage());
  },

  modelChart: async ({}, use) => {
    await use(new ModelChartPage());
  },

  modelSort: async ({}, use) => {
    await use(new ModelSortPage());
  },
});

export { expect };

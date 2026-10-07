import { ModelChartPage } from '@pages/models/model-chart';
import { ModelLicensesPage } from '@pages/models/model-licenses';
import { ModelPage } from '@pages/models/model-page';
import { test as baseTest, expect } from '@page-setup';

type ModelFixtures = {
  modelPage: ModelPage;
  modelChart: ModelChartPage;
  modelLicenses: ModelLicensesPage;
};

export const test = baseTest.extend<ModelFixtures>({
  modelPage: async ({}, use) => {
    await use(new ModelPage());
  },

  modelChart: async ({}, use) => {
    await use(new ModelChartPage());
  },

  modelLicenses: async ({}, use) => {
    await use(new ModelLicensesPage());
  },
});

export { expect };

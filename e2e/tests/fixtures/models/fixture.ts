import { DashboardPage } from '@pages/models/dashboard-page';
import { test as baseTest, expect } from '@page-setup';

type ModelFixtures = {
  dashboardPage: DashboardPage;
};

export const test = baseTest.extend<ModelFixtures>({
  dashboardPage: async ({}, use) => {
    await use(new DashboardPage());
  },
});

export { expect };

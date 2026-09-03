import { AssertUtils, PageUtils, escapeRegExp } from '@anaconda/playwright-utils';

import { BASE_URL } from '@playwright-config';

export class DashboardPage {
  public async goToDashboard(): Promise<void> {
    await PageUtils.gotoURL(BASE_URL);
  }

  public async verifyDashboardURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(new RegExp(`^${escapeRegExp(BASE_URL)}(?:/|$|\\?)`), {
      message: 'Authenticated user should remain on the configured dashboard route',
    });
  }
}

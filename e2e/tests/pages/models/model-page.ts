import {
  ActionUtils,
  AssertUtils,
  ElementUtils,
  LocatorUtils,
  PageUtils,
  escapeRegExp,
} from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { type Locator } from '@playwright/test';
import { catalogData } from '@testdata/models/catalog-test-data';

export class ModelPage {
  private readonly resourcesButton = (): Locator =>
    LocatorUtils.getLocatorByRole('navigation').getByRole('button', { name: 'Resources', exact: true });
  private readonly modelLink = (): Locator =>
    LocatorUtils.getLocator(`nav a[href="${new URL(this.modelPageURL(catalogData.project)).pathname}"]`);
  private readonly modelHeader = (): Locator => LocatorUtils.getLocatorByTestId('catalog-page-heading');
  private readonly catalog = (): Locator => LocatorUtils.getLocatorByTestId('model-catalog-browse');
  private readonly modelHeadingText = (): Locator => this.modelHeader().locator('h1');
  private readonly modelCountBadge = (): Locator => this.modelHeader().locator('.badge.counter');
  private readonly modelsTab = (): Locator => this.catalog().locator('button[title="models"]');
  private readonly chartTab = (): Locator => this.catalog().locator('button[title="model-chart"]');
  private readonly licensesTab = (): Locator => this.catalog().locator('button[title="licenses"]');
  private readonly selectedTab = (): Locator => this.catalog().locator('button.selected');
  private readonly searchInput = (): Locator => LocatorUtils.getLocatorByTestId('catalog-search').locator('input');
  private readonly allFiltersButton = (): Locator =>
    LocatorUtils.getLocatorByTestId('catalog-all-filters').locator('button');
  private readonly chooseColumnsButton = (): Locator => this.catalog().locator('button[aria-label="Choose columns"]');
  private modelPageURL(project: string): string {
    return `${BASE_URL.replace(/\/$/, '')}/catalog/p/${project}`;
  }
  public async navigateToDashboard(): Promise<void> {
    await PageUtils.gotoURL(BASE_URL, { waitUntil: 'domcontentloaded' });
  }
  /** Accepts dashboard subroutes and query strings while keeping the configured route boundary. */
  public async verifyDashboardURL(): Promise<void> {
    await AssertUtils.expectPageToHaveURL(new RegExp(`^${escapeRegExp(BASE_URL)}(?:/|$|\\?)`), {
      message: 'Authenticated user should remain on the configured dashboard route',
    });
  }
  public async verifyResourcesButton(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.resourcesButton(), {
      message: 'Resources navigation should be visible',
    });
  }
  public async clickResourcesButton(): Promise<void> {
    if ((await ElementUtils.getAttribute(this.resourcesButton(), 'aria-expanded')) !== 'true') {
      await ActionUtils.click(this.resourcesButton());
    }
  }
  public async verifyModelLink(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelLink(), {
      message: 'Models link should be visible under Resources',
    });
  }
  public async clickModelLink(): Promise<void> {
    await ActionUtils.clickAndNavigate(this.modelLink());
  }
  public async verifyModelPageURL(project: string = catalogData.project): Promise<void> {
    await AssertUtils.expectPageToHaveURL(this.modelPageURL(project), {
      message: 'Models should open the requested project catalog',
    });
  }
  public async verifyModelHeader(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.modelHeadingText(), catalogData.heading, {
      message: 'Catalog heading should identify the Model Catalog',
    });
  }
  public async verifyModelCountBadge(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelCountBadge(), {
      message: 'Catalog heading should display the model count badge',
    });
  }
  public async verifyModelsTab(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelsTab(), {
      message: 'Models tab should be visible',
    });
  }
  public async verifyChartTab(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chartTab(), {
      message: 'Model Chart tab should be visible',
    });
  }
  public async verifyLicensesTab(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.licensesTab(), {
      message: 'Licenses tab should be visible',
    });
  }
  public async verifyModelsTabSelected(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.modelsTab().and(this.selectedTab()), {
      message: 'Models tab should be the selected tab',
    });
  }
  public async verifySearchInput(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.searchInput(), {
      message: 'Model search input should be visible',
    });
  }
  public async verifyAllFiltersButton(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.allFiltersButton(), {
      message: 'All Filters button should be visible',
    });
  }
  public async verifyChooseColumnsButton(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.chooseColumnsButton(), {
      message: 'Choose columns button should be visible',
    });
  }
}

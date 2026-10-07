import { AssertUtils, ElementUtils, LocatorUtils, STANDARD_TIMEOUT } from '@anaconda/playwright-utils';
import { type Locator } from '@playwright/test';
import { modelLicensesData } from '@testdata/models/model-licenses-test-data';

export class ModelLicensesPage {
  private readonly licensesTable = (): Locator => LocatorUtils.getLocatorByTestId('catalog-licenses-table');
  private readonly licenseRows = (): Locator => this.licensesTable().getByRole('row');
  /** Model names have no test id; this class identifies the name within each license row. */
  private readonly modelName = (row: Locator): Locator => row.locator('.model-name');
  private readonly licenseLink = (row: Locator): Locator => row.locator('a[target="_blank"]');
  private readonly acceptedStatus = (row: Locator): Locator => row.locator('[data-qa-id="catalog-license-accepted"]');
  private readonly ignoredStatus = (row: Locator): Locator => row.locator('[data-qa-id="catalog-license-ignored"]');
  private readonly acceptButton = (row: Locator): Locator => row.locator('[data-qa-id="catalog-license-accept"]');
  private readonly ignoreButton = (row: Locator): Locator => row.locator('[data-qa-id="catalog-license-ignore"]');

  public async verifyLicensesTableDisplayed(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.licensesTable(), {
      timeout: STANDARD_TIMEOUT,
      message: 'Licenses tab should display the model licenses table',
    });
  }

  public async verifyAllLicenseRowsHaveModelNames(): Promise<void> {
    // The utility waits for at least one row, so an empty table cannot pass this check.
    const rows = await LocatorUtils.getAllLocators(this.licenseRows());
    for (const [index, row] of rows.entries()) {
      const context = `License row ${index + 1}`;
      await AssertUtils.expectElementToBeVisible(this.modelName(row), {
        message: `${context} should display a model name`,
      });
      await AssertUtils.expectElementToHaveText(this.modelName(row), /\S/, {
        message: `${context} should have a non-empty model name`,
      });
    }
  }

  public async verifyAllLicenseRowsHaveLicenseLinks(): Promise<void> {
    const rows = await LocatorUtils.getAllLocators(this.licenseRows());
    for (const [index, row] of rows.entries()) {
      const context = `License row ${index + 1}`;
      const link = this.licenseLink(row);
      await AssertUtils.expectElementToBeVisible(link, {
        message: `${context} should display a license link`,
      });
      await AssertUtils.expectElementToHaveText(link, /\S/, {
        message: `${context} should have non-empty license link text`,
      });
      await AssertUtils.expectElementToHaveAttribute(link, 'href', modelLicensesData.termsUrlPattern, {
        message: `${context} should link to an HTTP or HTTPS license terms page`,
      });
    }
  }

  public async verifyAllLicenseRowsHaveActionsOrStatus(): Promise<void> {
    const rows = await LocatorUtils.getAllLocators(this.licenseRows());
    for (const [index, row] of rows.entries()) {
      const context = `License row ${index + 1}`;
      if ((await ElementUtils.getLocatorCount(this.acceptedStatus(row))) > 0) {
        await this.verifyAcceptedStatusWithUserName(row, context);
      } else if ((await ElementUtils.getLocatorCount(this.ignoredStatus(row))) > 0) {
        await this.verifyIgnoredStatus(row, context);
      } else {
        await this.verifyAcceptAndIgnoreButtons(row, context);
      }
    }
  }

  private async verifyAcceptedStatusWithUserName(row: Locator, context: string): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.acceptedStatus(row), {
      message: `${context} should display its accepted status`,
    });
    await AssertUtils.expectElementToHaveText(this.acceptedStatus(row), modelLicensesData.acceptedStatusPattern, {
      message: `${context} should show Accepted with the accepting user's name and date`,
    });
  }

  private async verifyIgnoredStatus(row: Locator, context: string): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.ignoredStatus(row), {
      message: `${context} should display its ignored status`,
    });
    await AssertUtils.expectElementToContainText(this.ignoredStatus(row), modelLicensesData.ignoredStatus, {
      message: `${context} should show Ignored`,
    });
  }

  private async verifyAcceptAndIgnoreButtons(row: Locator, context: string): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.acceptButton(row), {
      message: `${context} should display an Accept button when no decision is recorded`,
    });
    await AssertUtils.expectElementToBeVisible(this.ignoreButton(row), {
      message: `${context} should display an Ignore button when no decision is recorded`,
    });
  }
}

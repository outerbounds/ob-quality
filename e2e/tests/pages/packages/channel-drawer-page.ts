import { ActionUtils, AssertUtils, LocatorUtils, escapeRegExp } from '@anaconda/playwright-utils';
import { type Locator } from '@playwright/test';
import {
  type defaultPolicySection,
  drawerControls,
  drawerFactLabels,
  packageSourcesData,
} from '@testdata/packages/package-sources-test-data';

type DrawerFactLabel = (typeof drawerFactLabels)[keyof typeof drawerFactLabels];
type PolicySection = typeof defaultPolicySection;

/** The channel drawer Package Sources opens for a channel: title, facts, Policy section and its Manage Policy view. */
export class ChannelDrawerPage {
  private readonly drawer = '[data-testid="modal-panel"]';
  /** The channel name is the only h6 of the drawer header. */
  private readonly drawerHeading = `${this.drawer} .modalHeader h6`;
  private readonly drawerDescription = `${this.drawer} .modalHeader p.description`;
  /** Fact and rule rows carry no attribute of their own; each is identified by its leading label. */
  private readonly rowStartingWith = (rows: string, label: string): Locator =>
    LocatorUtils.getLocator(rows).filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}`) });
  private readonly factRow = (label: DrawerFactLabel): Locator =>
    this.rowStartingWith(`${this.drawer} .stats .row`, label);
  private readonly factValue = (label: DrawerFactLabel): Locator => this.factRow(label).locator('span.body-sm-bold');
  private readonly packagesLink = (): Locator => this.factRow(drawerFactLabels.contents).getByRole('link');
  private readonly closeButton = `${this.drawer} button[aria-label="Close modal"]`;
  /** The Policy section has no attribute of its own; classes are the only handle. */
  private readonly policyTitle = `${this.drawer} .section .box-title`;
  private readonly policyRuleValues = (label: string): Locator =>
    this.rowStartingWith(`${this.drawer} .section .box .row`, label).locator('span.body-sm-bold');
  /** Manage Policy and Back have no attribute; they are matched by role and name. */
  private readonly drawerButton = (name: string): Locator =>
    LocatorUtils.getLocator(this.drawer).getByRole('button', { name, exact: true });
  private readonly defaultPolicySwitch = `${this.drawer} [data-testid="input_checkbox_default-policy"] input`;
  private readonly ownPolicySwitch = `${this.drawer} [data-testid="input_checkbox_own-policy"] input`;

  public async verifyDrawerHeader(channel: string, description: string): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.drawerHeading, channel, {
      message: 'Channel drawer should be titled with the channel name',
    });
    await AssertUtils.expectElementToHaveText(this.drawerDescription, description, {
      message: 'Channel drawer should describe the channel visibility and source',
    });
  }

  /** Verifies a single-value fact row (source, visibility, active policy): the value after its label. */
  public async verifyFact(label: DrawerFactLabel, value: string): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.factValue(label), value, {
      message: `Drawer "${label}" fact should read ${value}`,
    });
  }

  public async verifyPackagesLink(): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.packagesLink(), packageSourcesData.drawerPackagesLink, {
      message: 'Drawer should show the channel package count as a link',
    });
  }

  public async clickPackagesLink(): Promise<void> {
    await ActionUtils.clickAndNavigate(this.packagesLink());
  }

  public async clickCloseButton(): Promise<void> {
    await ActionUtils.click(this.closeButton);
  }

  public async verifyDrawerHidden(): Promise<void> {
    await AssertUtils.expectElementToBeHidden(this.drawer, { message: 'Channel drawer should close' });
  }

  /** Verifies the Policy section title and, for each rule row, the values after its label. */
  public async verifyPolicyTitleAndRules(policy: PolicySection): Promise<void> {
    await AssertUtils.expectElementToHaveText(this.policyTitle, policy.title, {
      message: `Policy section should be titled "${policy.title}"`,
    });
    for (const rule of policy.rules) {
      await AssertUtils.expectElementToHaveText(this.policyRuleValues(rule.label), [...rule.values], {
        message: `Policy rule "${rule.label}" should read ${rule.values.join(', ')}`,
      });
    }
  }

  public async verifyManagePolicyButtonVisible(): Promise<void> {
    await AssertUtils.expectElementToBeVisible(this.drawerButton(drawerControls.managePolicyButton), {
      message: 'Drawer should offer the Manage Policy button',
    });
  }

  public async clickManagePolicyButton(): Promise<void> {
    await ActionUtils.click(this.drawerButton(drawerControls.managePolicyButton));
  }

  public async verifyDefaultPolicySwitchOnAndOwnPolicyOff(): Promise<void> {
    await AssertUtils.expectElementToBeChecked(this.defaultPolicySwitch, {
      message: 'Manage Policy should show the Default policy switch on',
    });
    await AssertUtils.expectElementNotToBeChecked(this.ownPolicySwitch, {
      message: 'Manage Policy should show the Define your own policy switch off',
    });
  }

  public async clickBackButton(): Promise<void> {
    await ActionUtils.click(this.drawerButton(drawerControls.backButton));
  }
}

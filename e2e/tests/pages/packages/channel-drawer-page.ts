import { ActionUtils, AssertUtils, LocatorUtils, escapeRegExp } from '@anaconda/playwright-utils';
import { type Locator } from '@playwright/test';
import { drawerFactLabels, packageSourcesData } from '@testdata/packages/package-sources-test-data';

type DrawerFactLabel = (typeof drawerFactLabels)[keyof typeof drawerFactLabels];

/** The channel drawer Package Sources opens for a channel: its title, facts and the link to its packages. */
export class ChannelDrawerPage {
  private readonly drawer = '[data-testid="modal-panel"]';
  /** The channel name is the only h6 of the drawer header. */
  private readonly drawerHeading = `${this.drawer} .modalHeader h6`;
  private readonly drawerDescription = `${this.drawer} .modalHeader p.description`;
  /** Fact rows carry no attribute of their own; each is identified by its leading label. */
  private readonly factRow = (label: DrawerFactLabel): Locator =>
    LocatorUtils.getLocator(`${this.drawer} .stats .row`).filter({
      hasText: new RegExp(`^\\s*${escapeRegExp(label)}`),
    });
  private readonly factValue = (label: DrawerFactLabel): Locator => this.factRow(label).locator('span.body-sm-bold');
  private readonly packagesLink = (): Locator => this.factRow(drawerFactLabels.contents).getByRole('link');

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
}

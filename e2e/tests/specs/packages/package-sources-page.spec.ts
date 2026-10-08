// seed: tests/storage-setup/login-storage-setup.ts

import { test } from '@packages-fixture';
import {
  defaultPolicySection,
  drawerChannel,
  drawerFactLabels,
  reopenedDrawerChannel,
} from '@testdata/packages/package-sources-test-data';
import { secureChannels } from '@testdata/packages/packages-test-data';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Perimeters Package Sources OB UI Tests @perimeters', () => {
  // Use the storage state for the admin automation user to maintain authentication across tests.
  test.use({ storageState: getUserAuthPath(adminAutomationUser) });

  test.beforeEach('Load Package Sources', async ({ packageSourcesPage }) => {
    // Keeps the page's own ChannelsWithArtifacts response, so the policy tag checks compare the UI with the API.
    await packageSourcesPage.loadPackageSources();
    await packageSourcesPage.verifyPackagesTabSelected();
    await packageSourcesPage.verifyPackageSourcesURL();
  });

  test.describe('Smoke @smoke', () => {
    // P1 — Perimeters > Packages > Package Sources > Verify page lists secure channels and their policy tags
    test('Package Sources lists the secure channels with their policy tags', async ({ packageSourcesPage }) => {
      await test.step('Verify the Perimeters heading', async () => {
        await packageSourcesPage.verifyPerimetersHeading();
      });
      await test.step('Verify the secure channels heading', async () => {
        await packageSourcesPage.verifySecureChannelsHeading(secureChannels);
      });
      for (const channel of secureChannels) {
        await test.step(`Verify the secure channel ${channel.name}`, async () => {
          await packageSourcesPage.verifySecureChannel(channel);
          // Tags follow whatever policy the API reports, so this holds on shared channels whatever their policy.
          await packageSourcesPage.verifySecureChannelTagsMatchPolicy(channel.name);
        });
      }
    });

    // P1 — Perimeters > Packages > Package Sources > Verify channel drawer facts and Packages link
    test('Channel drawer shows the channel facts and links to its packages', async ({
      packageSourcesPage,
      channelDrawerPage,
      channelDetailsPage,
    }) => {
      await test.step('Open the msys2 channel drawer', async () => {
        await packageSourcesPage.clickSecureChannel(drawerChannel.name);
        await channelDrawerPage.verifyDrawerHeader(drawerChannel.name, drawerChannel.description);
      });
      await test.step('Verify the channel facts', async () => {
        await channelDrawerPage.verifyPackagesLink();
        await channelDrawerPage.verifyFact(drawerFactLabels.source, drawerChannel.source);
        await channelDrawerPage.verifyFact(drawerFactLabels.visibility, drawerChannel.visibility);
        await channelDrawerPage.verifyFact(drawerFactLabels.activePolicy, drawerChannel.activePolicy);
      });
      await test.step('Click the Packages link and verify the channel page opens in Resources > Packages', async () => {
        await channelDrawerPage.clickPackagesLink();
        await channelDetailsPage.verifyChannelDetailsPageUrlAndHeader(drawerChannel.name);
      });
    });

    // P1 — Perimeters > Packages > Package Sources > Verify channel drawer Policy section and rules
    test('Channel drawer shows the Default policy title, its rules and the Manage Policy button', async ({
      packageSourcesPage,
      channelDrawerPage,
    }) => {
      await test.step('Open the msys2 channel drawer', async () => {
        await packageSourcesPage.clickSecureChannel(drawerChannel.name);
        await channelDrawerPage.verifyDrawerHeader(drawerChannel.name, drawerChannel.description);
      });
      await test.step('Verify the Policy section title and rules', async () => {
        await channelDrawerPage.verifyPolicyTitleAndRules(defaultPolicySection);
        await channelDrawerPage.verifyManagePolicyButtonVisible();
      });
    });
  });

  test.describe('Regression @reg', () => {
    // P2 — Perimeters > Packages > Package Sources > Verify channel drawer closes and reopens for another channel
    test('Channel drawer closes with its close button and reopens for another channel', async ({
      packageSourcesPage,
      channelDrawerPage,
    }) => {
      await test.step('Open the msys2 channel drawer and close it', async () => {
        await packageSourcesPage.clickSecureChannel(drawerChannel.name);
        await channelDrawerPage.verifyDrawerHeader(drawerChannel.name, drawerChannel.description);
        await channelDrawerPage.clickCloseButton();
        await channelDrawerPage.verifyDrawerHidden();
      });
      await test.step('Open the main channel and verify the drawer shows main', async () => {
        await packageSourcesPage.clickSecureChannel(reopenedDrawerChannel.name);
        await channelDrawerPage.verifyDrawerHeader(reopenedDrawerChannel.name, reopenedDrawerChannel.description);
      });
    });

    // P2 — Perimeters > Packages > Package Sources > Verify Manage Policy shows the Default policy on
    test('Manage Policy shows the Default policy on, and Back returns to the drawer with it active', async ({
      packageSourcesPage,
      channelDrawerPage,
    }) => {
      await test.step('Open the msys2 channel drawer and click Manage Policy', async () => {
        await packageSourcesPage.clickSecureChannel(drawerChannel.name);
        await channelDrawerPage.verifyDrawerHeader(drawerChannel.name, drawerChannel.description);
        await channelDrawerPage.clickManagePolicyButton();
      });
      await test.step('Verify the Default policy switch is on and Define your own policy is off', async () => {
        await channelDrawerPage.verifyDefaultPolicySwitchOnAndOwnPolicyOff();
      });
      await test.step('Click Back and verify the drawer returns with the Default policy active', async () => {
        await channelDrawerPage.clickBackButton();
        await channelDrawerPage.verifyManagePolicyButtonVisible();
        await channelDrawerPage.verifyFact(drawerFactLabels.activePolicy, drawerChannel.activePolicy);
      });
    });
  });
});

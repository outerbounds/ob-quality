// seed: tests/storage-setup/login-storage-setup.ts

import { test } from '@packages-fixture';
import { secureChannels } from '@testdata/packages/package-sources-test-data';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Perimeters Package Sources OB UI Tests @smoke @perimeters', () => {
  // Use the storage state for the admin automation user to maintain authentication across tests.
  test.use({ storageState: getUserAuthPath(adminAutomationUser) });

  test.beforeEach('Load Package Sources', async ({ packageSourcesPage }) => {
    // Keeps the page's own ChannelsWithArtifacts response, so the policy tag checks compare the UI with the API.
    await packageSourcesPage.loadPackageSources();
    await packageSourcesPage.verifyPackagesTabSelected();
    await packageSourcesPage.verifyPackageSourcesURL();
  });

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
});

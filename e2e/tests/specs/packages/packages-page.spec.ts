// seed: tests/storage-setup/login-storage-setup.ts

import { test } from '@packages-fixture';
import { secureChannels } from '@testdata/packages/packages-test-data';
import { getUserAuthPath } from 'tests/storage-setup/cookie-utils';
import { adminAutomationUser } from 'tests/storage-setup/user-test-data';

test.describe('Packages Page OB UI Tests @smoke', () => {
  // Use the storage state for the admin automation user to maintain authentication across tests.
  test.use({ storageState: getUserAuthPath(adminAutomationUser) });

  test.beforeEach('Navigate to the Packages page', async ({ packagesPage }) => {
    await packagesPage.navigateToPackagesPage();
    await packagesPage.verifyPackagesHeading();
    await packagesPage.verifyPackagesPageURL();
  });

  // P1 — Packages > Packages List > Verify page UI shows heading, summary, columns and a row per secure channel
  test('Packages page shows its heading, summary, columns and a row per secure channel', async ({ packagesPage }) => {
    await test.step('Verify the browser tab title and the active sidebar item', async () => {
      await packagesPage.verifyPageTitle();
      await packagesPage.verifyPackagesNavItemActive();
    });
    await test.step('Verify the summary channel count equals the number of rows', async () => {
      await packagesPage.verifySummaryCountMatchesRows();
    });
    await test.step('Verify the column headers and their order', async () => {
      await packagesPage.verifyColumnHeadersInOrder();
    });
    await test.step('Verify the table lists one row per secure channel', async () => {
      await packagesPage.verifyChannelRowCount(secureChannels);
    });
    for (const channel of secureChannels) {
      await test.step(`Verify the ${channel.source} row shows its package count, source, policy and results`, async () => {
        await packagesPage.verifyChannelRow(channel);
      });
    }
  });

  // P1 — Packages > Packages List > Verify sorting by Secure Channel (descending, then ascending)
  test('Sorting by Secure Channel orders channels descending, then ascending', async ({ packagesPage }) => {
    await test.step('Verify the channels are listed A→Z on load', async () => {
      await packagesPage.verifyChannelsSortedAscending(secureChannels);
    });
    await test.step('Click Secure Channel and verify the channels are sorted Z→A', async () => {
      await packagesPage.clickSecureChannelHeader();
      await packagesPage.verifyChannelsSortedDescending(secureChannels);
    });
    await test.step('Click Secure Channel again and verify the initial A→Z order is restored', async () => {
      await packagesPage.clickSecureChannelHeader();
      await packagesPage.verifyChannelsSortedAscending(secureChannels);
    });
  });
});

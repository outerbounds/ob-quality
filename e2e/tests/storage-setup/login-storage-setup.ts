// Add the tests to store the login storage states
import { logger, saveStorageState, test as setup } from '@anaconda/playwright-utils';
import { getUserAuthPath, isUserStorageStateValid } from './cookie-utils';
import { validUsers } from './user-test-data';

setup.describe.configure({ mode: 'parallel' });
// Save the storage state for each valid user

setup.describe('Login Storage Setup', () => {
  validUsers.forEach(user => {
    setup(`Save Login Storage for ${user.username}`, async () => {
      setup.skip(isUserStorageStateValid(user), 'Skipping saving storage state for Login');
      // TODO: replace with a real login flow once a LoginPage page object exists in either suite
      // (tests/pages/models or tests/pages/packages) — this storage-setup is shared, so the login flow it
      // drives must not be tied to one suite's page objects only.
      setup.skip(true, 'Login page object not implemented yet');
      logger.info(`Saving ${user.username} Login Storage`);
      await saveStorageState(getUserAuthPath(user));
    });
  });
});

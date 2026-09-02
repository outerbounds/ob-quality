// Use Playwright's request-only fixture here so authentication completes without creating a browser page.
import { test as setup } from '@playwright/test';

import { loginAndSaveStorage } from './api-auth-helper';
import { getUserAuthPath, isUserStorageStateValid } from './cookie-utils';
import { validUsers } from './user-test-data';

// Configure and run the login storage setup tests in parallel.
setup.describe.configure({ mode: 'parallel' });
setup.describe('Login Storage Setup', () => {
  validUsers.forEach((user, index) => {
    setup(`Save API-authenticated storage for user ${String(index + 1)}`, async ({ request }) => {
      setup.skip(isUserStorageStateValid(user), 'Existing authenticated storage state is still valid');
      await loginAndSaveStorage(request, user.emailAddress, user.password, getUserAuthPath(user));
    });
  });
});

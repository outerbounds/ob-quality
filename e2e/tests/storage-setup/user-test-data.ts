import 'dotenv/config';

export interface User {
  storageStateName: string;
  emailAddress: string;
  password: string;
}

export const adminAutomationUser: User = {
  storageStateName: 'admin-automation-user',
  emailAddress: process.env.E2E_AUTOMATION_USER_ADMIN_EMAIL ?? '',
  password: process.env.E2E_AUTOMATION_USER_ADMIN_PASSWORD ?? '',
};

export const nonAdminAutomationUser: User = {
  storageStateName: 'non-admin-automation-user',
  emailAddress: process.env.E2E_AUTOMATION_USER_NON_ADMIN_EMAIL ?? '',
  password: process.env.E2E_AUTOMATION_USER_NON_ADMIN_PASSWORD ?? '',
};

export const validUsers: User[] = [adminAutomationUser, nonAdminAutomationUser];

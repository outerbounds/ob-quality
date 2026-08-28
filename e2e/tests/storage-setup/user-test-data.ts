// Test data dedicated to the shared storage-setup flow only — not the general per-suite testdata
// (tests/testdata/models or tests/testdata/packages), which covers UI/spec-level test data instead.
export interface User {
  username: string;
  password: string;
}

export const standardUserCredentials: User = {
  username: 'standard_user',
  password: 'secret_sauce',
};

export const visualTestUserCredentials: User = {
  username: 'visual_user',
  password: 'secret_sauce',
};

export const validUsers: User[] = [standardUserCredentials, visualTestUserCredentials];

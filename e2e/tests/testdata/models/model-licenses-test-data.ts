export const modelLicensesData = {
  termsUrlPattern: /^https?:\/\/\S+$/,
  acceptedStatusPattern: /^\s*Accepted\s+by\s+\S.*?\s+on\s+\S.*$/,
  ignoredStatus: 'Ignored',
} as const;

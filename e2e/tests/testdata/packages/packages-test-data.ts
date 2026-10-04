/** A count as the app renders it, with or without digit grouping: "5530" or "5,530". */
const COUNT = String.raw`\d[\d,]*`;

/** Any non-whitespace character: used where the value is volatile, so only its presence is asserted. */
export const nonEmptyText = /\S/;

export const packagesData = {
  project: 'default',
  /** The page heading and the browser tab title. */
  heading: 'Packages',
  /** Captures the channel count N from "Listing from N secure channels. …". */
  summaryPattern: /Listing from ([1-9]\d*) secure channels?/,
  resourcesNavLabel: 'Resources',
} as const;

/** Columns of the secure channel table, by name. */
export const packagesColumn = {
  secureChannel: 'Secure Channel',
  source: 'Source',
  policy: 'Policy',
  policyResults: 'Policy Results',
} as const;

export type PackagesColumn = (typeof packagesColumn)[keyof typeof packagesColumn];

/** Every column of the secure channel table, in the order the table renders them. */
export const packagesColumns: readonly PackagesColumn[] = [
  packagesColumn.secureChannel,
  packagesColumn.source,
  packagesColumn.policy,
  packagesColumn.policyResults,
];

/**
 * Value formats in a secure channel row; counts are volatile, so only the shape is asserted.
 * The app breaks lines inside these cells, hence `\s+`.
 */
export const channelRowFormats = {
  packageCount: new RegExp(String.raw`^${COUNT}\s+packages?$`),
  policyResults: new RegExp(String.raw`^${COUNT}\s+files?\s+removed$`),
} as const;

export type SecureChannel = {
  readonly name: string;
  readonly source: string;
  /** Omitted when the channel's policy is not fixed; only a non-empty tag is then asserted. */
  readonly policy?: string;
};

/** Baseline policy every secure channel is expected to be on before tests run (dev-coldbrewcrew). */
const defaultPolicy = 'ob-dev-coldbrewcrew/default-default-policy';

/**
 * Every secure channel of the dev-coldbrewcrew environment, in ascending name order; names are specific to that
 * environment. main-x has no fixed policy: it is the channel switched off the Default baseline during policy testing.
 */
export const secureChannels: readonly SecureChannel[] = [
  { name: 'ob-dev-coldbrewcrew/default--main', source: 'main', policy: defaultPolicy },
  { name: 'ob-dev-coldbrewcrew/default--main-x', source: 'main-x' },
  { name: 'ob-dev-coldbrewcrew/default--msys2', source: 'msys2', policy: defaultPolicy },
];

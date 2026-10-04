import { escapeRegExp } from '@anaconda/playwright-utils';

/** A count as the app renders it, with or without digit grouping: "5530" or "5,530". */
const COUNT = String.raw`\d[\d,]*`;

export const packageSourcesData = {
  perimeter: 'default',
  /** The page heading above the perimeter tabs. */
  heading: 'Perimeters',
  /** Tabs are marked active only by this class; there is no aria-selected attribute. */
  selectedClass: 'selected',
  /** Secure channels heading, e.g. "3 secure channels" or "1 secure channel". */
  secureChannelsHeading: (count: number): RegExp => new RegExp(`^${count} secure channels?$`),
  /** Secure channel subtitle `<source> · <count> packages`; the count is volatile, so only its shape is asserted. */
  secureChannelSubtitle: (source: string): RegExp => new RegExp(`^${escapeRegExp(source)} · ${COUNT} packages?$`),
} as const;

/** Dashboard route of Perimeters (relative to the dashboard URL) and the Package Sources route of a perimeter. */
export const codeRoutesData = {
  perimetersPath: 'perimetersphase0',
  sourcesPath: 'code/sources',
} as const;

/** The GraphQL operation Package Sources loads its channels and their policies with. */
export const policyApiData = {
  channelsOperation: 'ChannelsWithArtifacts',
} as const;

/** The shared default policy: a channel on it is tagged with this tag before the policy name. */
export const baselinePolicy = {
  tag: 'Default',
} as const;

export type SecureChannel = {
  readonly name: string;
  readonly source: string;
};

/**
 * Every secure channel of the dev-coldbrewcrew environment, in the order the Package Sources list renders them; names
 * are specific to that environment.
 */
export const secureChannels: readonly SecureChannel[] = [
  { name: 'ob-dev-coldbrewcrew/default--main', source: 'main' },
  { name: 'ob-dev-coldbrewcrew/default--main-x', source: 'main-x' },
  { name: 'ob-dev-coldbrewcrew/default--msys2', source: 'msys2' },
];

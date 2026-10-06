import { escapeRegExp } from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';

export const packageSourcesData = {
  perimeter: 'default',
  /** The page heading above the perimeter tabs. */
  heading: 'Perimeters',
  /** Tabs are marked active only by this class; there is no aria-selected attribute. */
  selectedClass: 'selected',
  /** Secure channels heading, e.g. "3 secure channels" or "1 secure channel". */
  secureChannelsHeading: (count: number): RegExp => new RegExp(`^${count} secure channels?$`),
  /** Secure channel subtitle `<source> · <count> packages`, e.g. "main · 5,530 packages"; the count is volatile. */
  secureChannelSubtitle: (source: string): RegExp =>
    new RegExp(String.raw`^${escapeRegExp(source)} · \d[\d,]* packages?$`),
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

/** The environment name from the dashboard host, e.g. "dev-coldbrewcrew" from ui.dev-coldbrewcrew.outerbounds.xyz. */
const environment = new URL(BASE_URL).hostname.split('.')[1];
/** Secure channel names of the perimeter start with "ob-<environment>/<perimeter>". */
const channelPrefix = `ob-${environment}/${packageSourcesData.perimeter}`;

/** Every secure channel of the perimeter, in the order the Package Sources list renders them. */
export const secureChannels = [
  { name: `${channelPrefix}--main`, source: 'main' },
  { name: `${channelPrefix}--main-x`, source: 'main-x' },
  { name: `${channelPrefix}--msys2`, source: 'msys2' },
] as const;

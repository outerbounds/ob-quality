import { escapeRegExp } from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';

export const packageSourcesData = {
  perimeter: 'default',
  /** Dashboard route of Perimeters and the Package Sources sub-route of a perimeter (the Code tab's default). */
  perimetersPath: 'perimetersphase0',
  sourcesPath: 'code/sources',
  /** The page heading above the perimeter tabs. */
  heading: 'Perimeters',
  /** Tabs are marked active only by the whole "selected" class; there is no aria-selected attribute. */
  selectedClass: /(^|\s)selected(\s|$)/,
  /** Secure channels heading, e.g. "3 secure channels" or "1 secure channel". */
  secureChannelsHeading: (count: number): RegExp => new RegExp(`^${count} secure channels?$`),
  /** Secure channel subtitle, e.g. "main · 5530 packages" or "main · 5,530 packages"; the count is volatile. */
  secureChannelSubtitle: (source: string): RegExp =>
    new RegExp(String.raw`^${escapeRegExp(source)} · (\d{1,3}(,\d{3})+|\d+) packages?$`),
  /** GraphQL calls go to POST <graphqlPath>?op=<operation>; Package Sources loads its channels with this operation. */
  graphqlPath: '/edge/graphql',
  channelsOperation: 'ChannelsWithArtifacts',
  /** A channel on the shared default policy is tagged with this tag before the policy name. */
  defaultPolicyTag: 'Default',
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

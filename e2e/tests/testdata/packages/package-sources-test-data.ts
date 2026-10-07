import { escapeRegExp } from '@anaconda/playwright-utils';
import { BASE_URL } from '@playwright-config';
import { defaultPolicy } from '@testdata/packages/packages-test-data';

export const packageSourcesData = {
  perimeter: 'default',
  /** Dashboard route of Perimeters and the Package Sources route of a perimeter (the Packages tab). */
  perimetersPath: 'governance/perimeters',
  sourcesPath: 'packages/sources',
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
  /** The drawer's package count link, e.g. "236 Packages" or "5,533 Packages"; the count is volatile. */
  drawerPackagesLink: /^(\d{1,3}(,\d{3})+|\d+) Packages?\s*$/,
} as const;

/** Leading label of each fact row in the channel drawer. */
export const drawerFactLabels = {
  contents: 'in channel',
  source: 'source is',
  visibility: 'visibility is',
  activePolicy: 'active policy is',
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

/** The read-only drawer test uses msys2 (the last secure channel), so it never overlaps policy changes on main-x. */
export const drawerChannel = {
  name: secureChannels[2].name,
  source: secureChannels[2].source,
  description: `Public channel · ${secureChannels[2].source}`,
  visibility: 'public',
  activePolicy: defaultPolicy,
} as const;

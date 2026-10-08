import { escapeRegExp } from '@anaconda/playwright-utils';
import { defaultPolicy, secureChannels } from '@testdata/packages/packages-test-data';

/** A package count with or without digit grouping, e.g. "5530" or "5,530"; counts are volatile. */
const packageCount = String.raw`(\d{1,3}(,\d{3})+|\d+)`;

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
  /** Secure channel subtitle, e.g. "main · 5530 packages" or "main · 5,530 packages". */
  secureChannelSubtitle: (source: string): RegExp =>
    new RegExp(`^${escapeRegExp(source)} · ${packageCount} packages?$`),
  /** GraphQL calls go to POST <graphqlPath>?op=<operation>; Package Sources loads its channels with this operation. */
  graphqlPath: '/edge/graphql',
  channelsOperation: 'ChannelsWithArtifacts',
  /** A channel on the shared default policy is tagged with this tag before the policy name. */
  defaultPolicyTag: 'Default',
  /** The drawer subtitle under the channel name, e.g. "Public channel · msys2". */
  drawerDescription: (source: string): string => `Public channel · ${source}`,
  /** The drawer's package count link, e.g. "236 Packages" or "5,533 Packages". */
  drawerPackagesLink: new RegExp(String.raw`^${packageCount} Packages?\s*$`),
} as const;

/** Leading label of each fact row in the channel drawer. */
export const drawerFactLabels = {
  contents: 'in channel',
  source: 'source is',
  visibility: 'visibility is',
  activePolicy: 'active policy is',
} as const;

/** The read-only drawer test uses msys2 (the last secure channel), so it never overlaps policy changes on main-x. */
export const drawerChannel = {
  name: secureChannels[2].name,
  source: secureChannels[2].source,
  description: packageSourcesData.drawerDescription(secureChannels[2].source),
  visibility: 'public',
  activePolicy: defaultPolicy,
} as const;

/** The drawer close/reopen test reopens it on main (the first secure channel) after closing msys2. */
export const reopenedDrawerChannel = {
  name: secureChannels[0].name,
  description: packageSourcesData.drawerDescription(secureChannels[0].source),
} as const;

/** Drawer Policy section of a channel on the Default policy (product copy): title and rule rows (label → values). */
export const defaultPolicySection = {
  title: 'Secure by Default',
  rules: [
    { label: 'CVE Status', values: ['Active', 'Reported'] },
    { label: 'CVSS Severity', values: ['9.0 or above will be removed'] },
  ],
} as const;

/** Accessible names of the drawer buttons. */
export const drawerControls = {
  managePolicyButton: 'Manage Policy',
  backButton: 'Back',
} as const;

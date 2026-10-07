import { BASE_URL } from '@playwright-config';

export const packagesData = {
  project: 'default',
  /** The page heading and the browser tab title. */
  heading: 'Packages',
  /** Captures the channel count N from "Listing from N secure channels. …". */
  summaryPattern: /Listing from ([1-9]\d*) secure channels?/,
  resourcesNavLabel: 'Resources',
  /** Table headers, in the order the table renders them. */
  columns: ['Secure Channel', 'Source', 'Policy', 'Policy Results'],
  /** Headers that sort the table. */
  sortableColumns: ['Secure Channel', 'Source', 'Policy'],
  /** Matches "5530 packages", "5,530 packages" or "1 package" and captures the count; counts are volatile. */
  packageCountPattern: /^(\d{1,3}(?:,\d{3})+|\d+)\s+packages?$/,
  /** Matches "12 files removed" or "1,200 files removed"; \s+ allows the line breaks the app renders in this cell. */
  policyResultsPattern: /^\d[\d,]*\s+files?\s+removed$/,
} as const;

/** The environment name from the dashboard host, e.g. "dev-coldbrewcrew" from ui.dev-coldbrewcrew.outerbounds.xyz. */
const environment = new URL(BASE_URL).hostname.split('.')[1];
/** Secure channel and policy names of the project start with "ob-<environment>/<project>". */
const channelPrefix = `ob-${environment}/${packagesData.project}`;
/** Baseline policy every secure channel is expected to be on before tests run. */
export const defaultPolicy = `${channelPrefix}-default-policy`;

/**
 * Every secure channel of the project, in ascending name order. main-x has no fixed policy: it is the channel switched
 * off the Default baseline during policy testing, so only a non-empty policy tag is checked.
 */
export const secureChannels = [
  { name: `${channelPrefix}--main`, source: 'main', policy: defaultPolicy },
  { name: `${channelPrefix}--main-x`, source: 'main-x', policy: /\S/ },
  { name: `${channelPrefix}--msys2`, source: 'msys2', policy: defaultPolicy },
] as const;

export const channelPageData = {
  /** Accessible name of the back link on a channel page. */
  goBackLabel: 'Go back',
  /** "Contains N packages" in the channel summary, with or without digit grouping ("5533" or "5,533"). */
  summaryPackageCount: (count: number): RegExp =>
    new RegExp(`Contains ${count.toLocaleString('en-US').replace(/,/g, ',?')} packages?`),
} as const;

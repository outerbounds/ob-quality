import { BASE_URL } from '@playwright-config';
import { codeRoutesData } from '@testdata/perimeters/package-sources-test-data';

/** The Package Sources route of a perimeter (the Code tab's default sub-tab). */
export function packageSourcesURL(perimeter: string): string {
  return `${BASE_URL}/${codeRoutesData.perimetersPath}/${perimeter}/${codeRoutesData.sourcesPath}`;
}

/** Every GraphQL call goes through POST /edge/graphql?op=<Operation>; any other URL yields null. */
export function graphqlOperation(url: string): string | null {
  const parsed = new URL(url);
  return parsed.pathname.endsWith('/edge/graphql') ? parsed.searchParams.get('op') : null;
}

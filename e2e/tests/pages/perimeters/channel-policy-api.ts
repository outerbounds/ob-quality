import { BIG_TIMEOUT, PageUtils } from '@anaconda/playwright-utils';
import { type ChannelPayload, type ChannelsWithArtifactsPayload } from '@pages/perimeters/channel-policy-types';
import { graphqlOperation } from '@pages/perimeters/perimeters-routes';
import { isRecord, requireValue } from '@pages/perimeters/perimeters-utils';
import { policyApiData } from '@testdata/perimeters/package-sources-test-data';

/**
 * Runs `trigger` (a navigation) and returns the ChannelsWithArtifacts response the page loads with it, so the UI can be
 * compared with exactly what the page received. The query often takes 10–15s, so the default 5s fails; once it has
 * arrived, the page is loaded and the later checks need no override.
 */
export async function loadChannelsPayload(trigger: () => Promise<unknown>): Promise<ChannelsWithArtifactsPayload> {
  const responsePromise = PageUtils.waitForResponse(
    response => graphqlOperation(response.url()) === policyApiData.channelsOperation,
    { timeout: BIG_TIMEOUT },
  );
  await trigger();
  const body: unknown = await (await responsePromise).json();
  return requireValue(
    isChannelsPayload(body) ? body : null,
    `${policyApiData.channelsOperation} should return a channel list`,
  );
}

/** The named channel of a ChannelsWithArtifacts payload; throws when the payload does not list it. */
export function findChannel(payload: ChannelsWithArtifactsPayload, channel: string): ChannelPayload {
  return requireValue(
    payload.data.channels.channels.find(candidate => candidate.name === channel),
    `${policyApiData.channelsOperation} should return ${channel}`,
  );
}

/** The channel's assigned policy name, or null when it has none (the API reports a missing name as ''). */
export function assignedPolicyName(channel: ChannelPayload): string | null {
  const name = channel.assignedPolicy?.name;
  return name === undefined || name === '' ? null : name;
}

/** Narrows a parsed ChannelsWithArtifacts body to the shape the tests read. */
function isChannelsPayload(body: unknown): body is ChannelsWithArtifactsPayload {
  return (
    isRecord(body) && isRecord(body.data) && isRecord(body.data.channels) && Array.isArray(body.data.channels.channels)
  );
}

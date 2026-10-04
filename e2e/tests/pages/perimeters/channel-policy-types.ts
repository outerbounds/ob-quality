/** Shapes of the GraphQL payloads Package Sources reads (only the fields the tests use). */

export interface ChannelPayload {
  name: string;
  /** A channel whose policy was deleted reports null. */
  isDefaultPolicy: boolean | null;
  /** A channel without a policy reports null or an empty name. */
  assignedPolicy: { name: string } | null;
}

export interface ChannelsWithArtifactsPayload {
  data: { channels: { channels: ChannelPayload[] } };
}

import { EgressClient, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';

const liveKitUrl = process.env.LIVEKIT_URL || '';
const liveKitApiKey = process.env.LIVEKIT_API_KEY || '';
const liveKitApiSecret = process.env.LIVEKIT_API_SECRET || '';

export const clientes = {
  egressClient: new EgressClient(liveKitUrl, liveKitApiKey, liveKitApiSecret),
  roomServiceClient: new RoomServiceClient(liveKitUrl, liveKitApiKey, liveKitApiSecret),
  webhookReceiver: new WebhookReceiver(liveKitApiKey, liveKitApiSecret),
};

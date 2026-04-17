import { EgressClient, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";

const requireEnv = (name: "LIVEKIT_URL" | "LIVEKIT_API_KEY" | "LIVEKIT_API_SECRET"): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const liveKitUrl = requireEnv("LIVEKIT_URL");
const liveKitApiKey = requireEnv("LIVEKIT_API_KEY");
const liveKitApiSecret = requireEnv("LIVEKIT_API_SECRET");

export const clientes = {
  egressClient: new EgressClient(liveKitUrl, liveKitApiKey, liveKitApiSecret),
  roomServiceClient: new RoomServiceClient(liveKitUrl, liveKitApiKey, liveKitApiSecret),
  webhookReceiver: new WebhookReceiver(liveKitApiKey, liveKitApiSecret),
};

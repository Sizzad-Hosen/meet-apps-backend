import { AccessToken } from 'livekit-server-sdk';

export async function generateLiveKitToken({
  userId,
  roomName,
  role
}: {
  userId: string;
  roomName: string;
  role: "host" | "cohost" | "guest" | string;
}) {
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: '10m',
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    roomAdmin: role === "host" || role === "cohost",
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}

export const  generateRoomName= () => {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

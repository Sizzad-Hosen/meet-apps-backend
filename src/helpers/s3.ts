import { EgressClient, RoomServiceClient } from 'livekit-server-sdk';

export const clientes = {
  egressClient: new EgressClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  ),

  roomServiceCli  ent: new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  )
};
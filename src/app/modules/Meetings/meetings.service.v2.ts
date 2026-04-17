import { MeetingStatus, ParticipantRole, ParticipantStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { generateJoinCode } from "../../../helpers/generateJoinCode";
import { generateLiveKitToken, generateRoomName } from "../../../helpers/livekitToken";
import { clientes } from "../../../helpers/s3";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";

const createUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = generateJoinCode();
    const existingMeeting = await prisma.meeting.findUnique({
      where: { join_code: joinCode },
      select: { id: true },
    });

    if (!existingMeeting) {
      return joinCode;
    }
  }

  throw new ApiError(StatusCodes.CONFLICT, "Unable to generate a unique join code");
};

const getMeetingByCodeOrThrow = async (code: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code },
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
  }

  return meeting;
};

const ensureRoomExists = async (meeting: { livekit_room_name: string; max_participants: number }) => {
  try {
    await clientes.roomServiceClient.createRoom({
      name: meeting.livekit_room_name,
      maxParticipants: meeting.max_participants,
      emptyTimeout: 600,
      departureTimeout: 60,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
};

const getParticipantOrThrow = async (meetingId: string, userId: string) => {
  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meetingId, user_id: userId },
  });

  if (!participant) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found");
  }

  return participant;
};

const ensureModerator = async (meetingId: string, userId: string) => {
  const participant = await getParticipantOrThrow(meetingId, userId);

  if (participant.role !== ParticipantRole.host && participant.role !== ParticipantRole.cohost) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host or cohost can perform this action");
  }

  return participant;
};

const issueParticipantToken = async (
  meeting: { id: string; livekit_room_name: string },
  participant: { id: string; user_id: string; role: ParticipantRole },
) => {
  const livekitToken = await generateLiveKitToken({
    userId: participant.user_id,
    roomName: meeting.livekit_room_name,
    role: participant.role,
  });

  await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      livekit_token: livekitToken,
      joined_at: new Date(),
      left_at: null,
      status: ParticipantStatus.admitted,
    },
  });

  return livekitToken;
};

const countActiveParticipants = async (meetingId: string) => prisma.meetingParticipant.count({
  where: {
    meeting_id: meetingId,
    status: ParticipantStatus.admitted,
    left_at: null,
  },
});

const markMeetingActive = async (meetingId: string) => {
  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: MeetingStatus.active,
      started_at: new Date(),
    },
  });
};

const normalizeParticipantState = async (meetingId: string, userId: string, status: ParticipantStatus) => {
  await prisma.screenShare.deleteMany({
    where: {
      meeting_id: meetingId,
      user_id: userId,
    },
  });

  await prisma.meetingParticipant.updateMany({
    where: {
      meeting_id: meetingId,
      user_id: userId,
    },
    data: {
      status,
      left_at: new Date(),
      is_screen_sharing: false,
    },
  });
};

const createMeetings = async (payload: any, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: payload.title,
      type: payload.type,
      max_participants: payload.max_participants ?? 50,
      waiting_room_on: payload.waiting_room_on ?? true,
      allow_screenshare: payload.allow_screenshare ?? true,
      screenshare_needs_approval: payload.screenshare_needs_approval ?? false,
      is_recorded: payload.is_recorded ?? false,
      scheduled_at: payload.scheduled_at ? new Date(payload.scheduled_at) : null,
      host_id: userId,
      join_code: await createUniqueJoinCode(),
      livekit_room_name: generateRoomName(),
    },
  });

  await ensureRoomExists(meeting);

  const participant = await prisma.meetingParticipant.create({
    data: {
      meeting_id: meeting.id,
      user_id: userId,
      role: ParticipantRole.host,
      status: ParticipantStatus.admitted,
      joined_at: new Date(),
    },
  });

  return {
    meeting,
    livekitToken: await issueParticipantToken(meeting, participant),
  };
};

const joinMeeting = async (joinCode: string, userId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: joinCode },
    include: { meetingParticipants: true },
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
  }

  if (meeting.status === MeetingStatus.ended) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Meeting has already ended");
  }

  const isHost = meeting.host_id === userId;
  const existingParticipant = meeting.meetingParticipants.find((participant) => participant.user_id === userId);

  if (existingParticipant?.status === ParticipantStatus.denied) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not allowed to join this meeting");
  }

  if (!existingParticipant) {
    const activeParticipants = await countActiveParticipants(meeting.id);
    if (activeParticipants >= meeting.max_participants) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Meeting has reached the participant limit");
    }
  }

  const nextStatus = isHost || !meeting.waiting_room_on ? ParticipantStatus.admitted : ParticipantStatus.waiting;
  const participant = existingParticipant
    ? await prisma.meetingParticipant.update({
      where: { id: existingParticipant.id },
      data: {
        status: nextStatus,
        left_at: null,
        role: isHost ? ParticipantRole.host : existingParticipant.role,
      },
    })
    : await prisma.meetingParticipant.create({
      data: {
        meeting_id: meeting.id,
        user_id: userId,
        role: isHost ? ParticipantRole.host : ParticipantRole.guest,
        status: nextStatus,
      },
    });

  let livekitToken: string | null = null;
  if (participant.status === ParticipantStatus.admitted) {
    await ensureRoomExists(meeting);
    livekitToken = await issueParticipantToken(meeting, participant);
    await markMeetingActive(meeting.id);
  }

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      join_code: meeting.join_code,
      livekit_room_name: meeting.livekit_room_name,
      waiting_room_on: meeting.waiting_room_on,
      status: meeting.status,
    },
    participant: {
      id: participant.id,
      role: participant.role,
      status: participant.status,
    },
    livekitToken,
  };
};

const getLiveKitToken = async (code: string, userId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  const participant = await getParticipantOrThrow(meeting.id, userId);

  if (participant.status !== ParticipantStatus.admitted) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Participant is not admitted yet");
  }

  await ensureRoomExists(meeting);
  const token = await issueParticipantToken(meeting, participant);
  await markMeetingActive(meeting.id);

  return {
    roomName: meeting.livekit_room_name,
    token,
    participant: {
      role: participant.role,
      status: ParticipantStatus.admitted,
    },
  };
};

const leaveMeeting = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await getParticipantOrThrow(meeting.id, currentUserId);
  await normalizeParticipantState(meeting.id, currentUserId, ParticipantStatus.left);

  try {
    await clientes.roomServiceClient.removeParticipant(meeting.livekit_room_name, currentUserId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("participant does not exist")) {
      console.warn("removeParticipant failed:", message);
    }
  }

  return { left: true };
};

const getWaitingRoom = async (code: string, hostId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, hostId);

  return prisma.meetingParticipant.findMany({
    where: {
      meeting_id: meeting.id,
      status: ParticipantStatus.waiting,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
};

const ensureHost = async (meetingId: string, userId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
  }

  if (meeting.host_id !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can perform this action");
  }

  return meeting;
};

const admitParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);

  const participant = await prisma.meetingParticipant.findFirst({
    where: {
      meeting_id: meeting.id,
      user_id: targetUserId,
      status: ParticipantStatus.waiting,
    },
  });

  if (!participant) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found in waiting room");
  }

  await ensureRoomExists(meeting);
  const livekitToken = await issueParticipantToken(meeting, participant);
  await markMeetingActive(meeting.id);

  return {
    participantId: participant.id,
    userId: targetUserId,
    livekitToken,
  };
};

const admitAll = async (code: string, hostId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, hostId);

  const waitingParticipants = await prisma.meetingParticipant.findMany({
    where: {
      meeting_id: meeting.id,
      status: ParticipantStatus.waiting,
    },
  });

  await ensureRoomExists(meeting);

  const results = await Promise.all(waitingParticipants.map(async (participant) => ({
    userId: participant.user_id,
    livekitToken: await issueParticipantToken(meeting, participant),
  })));

  if (results.length) {
    await markMeetingActive(meeting.id);
  }

  return results;
};

const denyParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);
  const participant = await getParticipantOrThrow(meeting.id, targetUserId);

  await prisma.screenShare.deleteMany({
    where: {
      meeting_id: meeting.id,
      user_id: targetUserId,
    },
  });

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      status: ParticipantStatus.denied,
      is_screen_sharing: false,
      left_at: new Date(),
    },
  });
};

const kickParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);

  if (meeting.host_id === targetUserId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Host cannot be kicked");
  }

  await normalizeParticipantState(meeting.id, targetUserId, ParticipantStatus.left);

  try {
    await clientes.roomServiceClient.removeParticipant(meeting.livekit_room_name, targetUserId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("participant does not exist")) {
      console.warn("removeParticipant failed:", message);
    }
  }

  return { removed: true };
};

const endMeeting = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can end the meeting");
  }

  const now = new Date();

  await prisma.screenShare.deleteMany({
    where: { meeting_id: meeting.id },
  });

  await prisma.meetingParticipant.updateMany({
    where: { meeting_id: meeting.id },
    data: {
      status: ParticipantStatus.left,
      left_at: now,
      is_screen_sharing: false,
    },
  });

  const updatedMeeting = await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: MeetingStatus.ended,
      ended_at: now,
    },
  });

  try {
    await clientes.roomServiceClient.deleteRoom(meeting.livekit_room_name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("room does not exist")) {
      console.warn("deleteRoom failed:", message);
    }
  }

  return updatedMeeting;
};

const muteParticipant = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);
  const participant = await getParticipantOrThrow(meeting.id, targetUserId);

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { is_muted: true },
  });
};

const muteAll = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  await ensureModerator(meeting.id, currentUserId);

  await prisma.meetingParticipant.updateMany({
    where: {
      meeting_id: meeting.id,
      role: { not: ParticipantRole.host },
    },
    data: { is_muted: true },
  });

  return { muted: true };
};

const getParticipants = async (code: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);

  return prisma.meetingParticipant.findMany({
    where: { meeting_id: meeting.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
};

const assignCohost = async (code: string, targetUserId: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can assign co-host");
  }

  const participant = await getParticipantOrThrow(meeting.id, targetUserId);
  if (participant.role === ParticipantRole.host) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot change host role");
  }

  return prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: { role: ParticipantRole.cohost },
  });
};

const getMeetingByCode = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code },
    include: {
      meetingParticipants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      screenShares: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
  }

  return {
    ...meeting,
    currentParticipant: meeting.meetingParticipants.find((participant) => participant.user_id === currentUserId) ?? null,
  };
};

const updateMeeting = async (code: string, payload: any, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can update meeting");
  }

  return prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.waiting_room_on !== undefined ? { waiting_room_on: payload.waiting_room_on } : {}),
      ...(payload.max_participants !== undefined ? { max_participants: payload.max_participants } : {}),
      ...(payload.allow_screenshare !== undefined ? { allow_screenshare: payload.allow_screenshare } : {}),
      ...(payload.screenshare_needs_approval !== undefined ? { screenshare_needs_approval: payload.screenshare_needs_approval } : {}),
      ...(payload.is_recorded !== undefined ? { is_recorded: payload.is_recorded } : {}),
      ...(payload.scheduled_at !== undefined ? { scheduled_at: payload.scheduled_at ? new Date(payload.scheduled_at) : null } : {}),
    },
  });
};

const deleteMeeting = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCodeOrThrow(code);
  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only host can delete meeting");
  }

  await prisma.screenShare.deleteMany({
    where: { meeting_id: meeting.id },
  });

  await prisma.recording.deleteMany({
    where: { meeting_id: meeting.id },
  });

  await prisma.meetingParticipant.deleteMany({
    where: { meeting_id: meeting.id },
  });

  await prisma.meeting.delete({
    where: { id: meeting.id },
  });

  try {
    await clientes.roomServiceClient.deleteRoom(meeting.livekit_room_name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("room does not exist")) {
      console.warn("deleteRoom failed:", message);
    }
  }

  return { deleted: true };
};

const handleWebhookEvent = async (event: { event: string; room?: { name?: string }; participant?: { identity?: string } }) => {
  const roomName = event.room?.name;
  const participantIdentity = event.participant?.identity;

  if (!roomName) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Webhook event missing room name");
  }

  const meeting = await prisma.meeting.findUnique({
    where: { livekit_room_name: roomName },
  });

  if (!meeting) {
    return { ignored: true };
  }

  if (event.event === "room_started") {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.active,
        started_at: new Date(),
      },
    });
  }

  if (event.event === "room_finished") {
    const now = new Date();

    await prisma.screenShare.deleteMany({
      where: { meeting_id: meeting.id },
    });

    await prisma.meetingParticipant.updateMany({
      where: { meeting_id: meeting.id },
      data: {
        status: ParticipantStatus.left,
        left_at: now,
        is_screen_sharing: false,
      },
    });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.ended,
        ended_at: now,
      },
    });
  }

  if (participantIdentity && ["participant_joined", "participant_left", "participant_connection_aborted"].includes(event.event)) {
    await prisma.meetingParticipant.updateMany({
      where: {
        meeting_id: meeting.id,
        user_id: participantIdentity,
      },
      data: event.event === "participant_joined" ? {
        status: ParticipantStatus.admitted,
        joined_at: new Date(),
        left_at: null,
      } : {
        status: ParticipantStatus.left,
        left_at: new Date(),
        is_screen_sharing: false,
      },
    });

    if (event.event !== "participant_joined") {
      await prisma.screenShare.deleteMany({
        where: {
          meeting_id: meeting.id,
          user_id: participantIdentity,
        },
      });
    }
  }

  return { processed: true };
};

export const MeetingServices = {
  createMeetings,
  joinMeeting,
  getLiveKitToken,
  leaveMeeting,
  admitParticipant,
  admitAll,
  denyParticipant,
  kickParticipant,
  endMeeting,
  getWaitingRoom,
  muteParticipant,
  muteAll,
  getParticipants,
  assignCohost,
  getMeetingByCode,
  deleteMeeting,
  updateMeeting,
  handleWebhookEvent,
};

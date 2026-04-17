import { ParticipantRole, ParticipantStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";

export const getMeetingByCodeOrThrow = async (code: string) => {
    const meeting = await prisma.meeting.findUnique({
        where: { join_code: code },
    });

    if (!meeting) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Meeting not found");
    }

    return meeting;
};

export const getParticipantOrThrow = async (meetingId: string, userId: string) => {
    const participant = await prisma.meetingParticipant.findFirst({
        where: { meeting_id: meetingId, user_id: userId },
    });

    if (!participant) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Participant not found");
    }

    return participant;
};

export const ensureHost = async (meetingId: string, userId: string) => {
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

export const ensureModerator = async (meetingId: string, userId: string) => {
    const participant = await getParticipantOrThrow(meetingId, userId);

    if (participant.role !== ParticipantRole.host && participant.role !== ParticipantRole.cohost) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Only host or cohost can perform this action");
    }

    return participant;
};

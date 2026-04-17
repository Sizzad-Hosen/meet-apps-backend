import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import { ensureHost, getMeetingByCodeOrThrow, getParticipantOrThrow } from "../Meetings/meetings.helpers";
import { pollRepository } from "../../repositories/poll.repository";

const createPollPayloadSchema = z.object({
    question: z.string().trim().min(1).max(255),
    options: z.array(z.string().trim().min(1).max(255)).min(2).max(10),
});

const submitVotePayloadSchema = z.object({
    optionId: z.string().uuid(),
});

const createPoll = async (code: string, payload: unknown, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);
    const parsedPayload = createPollPayloadSchema.parse(payload);

    const poll = await pollRepository.createWithOptions(
        meeting.id,
        parsedPayload.question.trim(),
        parsedPayload.options.map((option) => option.trim()),
    );

    return poll;
};

const listPolls = async (code: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);

    const polls = await pollRepository.listByMeetingId(meeting.id);

    return polls.map((poll) => ({
        ...poll,
        options: poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            voteCount: option.votes.length,
        })),
    }));
};

const submitPollVote = async (code: string, pollId: string, payload: unknown, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);
    const parsedPayload = submitVotePayloadSchema.parse(payload);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: true },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    if (poll.is_closed) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Poll is closed");
    }

    const option = poll.options.find((item) => item.id === parsedPayload.optionId);
    if (!option) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll option not found");
    }

    return prisma.pollVote.upsert({
        where: {
            poll_id_voter_id: {
                poll_id: poll.id,
                voter_id: currentUserId,
            },
        },
        update: { option_id: option.id },
        create: {
            poll_id: poll.id,
            option_id: option.id,
            voter_id: currentUserId,
        },
    });
};

const getPollResults = async (code: string, pollId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
            options: { include: { votes: true } },
        },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    const results = poll.options.map((option) => ({
        id: option.id,
        text: option.text,
        voteCount: option.votes.length,
    }));

    const totalVotes = results.reduce((sum, item) => sum + item.voteCount, 0);

    return {
        pollId: poll.id,
        question: poll.question,
        is_closed: poll.is_closed,
        totalVotes,
        results,
    };
};

const closePoll = async (code: string, pollId: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    return prisma.poll.update({
        where: { id: pollId },
        data: {
            is_closed: true,
            closed_at: new Date(),
        },
    });
};

export const PollServices = {
    createPoll,
    listPolls,
    submitPollVote,
    getPollResults,
    closePoll,
};

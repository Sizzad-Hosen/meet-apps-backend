import { StatusCodes } from "http-status-codes";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import { ensureHost, getMeetingByCodeOrThrow, getParticipantOrThrow } from "../Meetings/meetings.helpers";

const createPoll = async (code: string, payload: any, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);

    if (!payload.question || !payload.options || !Array.isArray(payload.options) || payload.options.length < 2) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Question and at least two poll options are required");
    }

    const poll = await prisma.poll.create({
        data: {
            meeting_id: meeting.id,
            question: payload.question.trim(),
            options: {
                create: payload.options.map((text: string) => ({ text: text.trim() })),
            },
        },
        include: { options: true },
    });

    return poll;
};

const listPolls = async (code: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);

    const polls = await prisma.poll.findMany({
        where: { meeting_id: meeting.id },
        include: {
            options: {
                include: { votes: true },
            },
        },
        orderBy: { created_at: "desc" },
    });

    return polls.map((poll) => ({
        ...poll,
        options: poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            voteCount: option.votes.length,
        })),
    }));
};

const submitPollVote = async (code: string, pollId: string, payload: any, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

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

    if (!payload.optionId || typeof payload.optionId !== "string") {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Option selection is required");
    }

    const option = poll.options.find((item) => item.id === payload.optionId);
    if (!option) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll option not found");
    }

    const existingVote = await prisma.pollVote.findUnique({
        where: {
            poll_id_voter_id: {
                poll_id: poll.id,
                voter_id: currentUserId,
            },
        },
    });

    if (existingVote) {
        return prisma.pollVote.update({
            where: { id: existingVote.id },
            data: { option_id: option.id },
        });
    }

    return prisma.pollVote.create({
        data: {
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

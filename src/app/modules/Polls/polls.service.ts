import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import prisma from "../../../lib/prisma";
import ApiError from "../../errors/ApiError";
import { ensureHost, getMeetingByCodeOrThrow, getParticipantOrThrow } from "../Meetings/meetings.helpers";
import { pollRepository } from "../../repositories/poll.repository";

const createPollPayloadSchema = z.object({
    question: z.string().trim().min(1).max(255),
    options: z.array(z.string().trim().min(1).max(255)).min(2),
});

const submitVotePayloadSchema = z.object({
    optionId: z.string().uuid(),
});

const formatPoll = (
    poll: {
        id: string;
        question: string;
        is_closed: boolean;
        created_at?: Date;
        closed_at?: Date | null;
        options: Array<{
            id: string;
            text: string;
            votes: Array<{ voter_id: string }>;
        }>;
    },
    currentUserId: string,
) => {
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);
    const myVote = poll.options.find((option) =>
        option.votes.some((vote) => vote.voter_id === currentUserId),
    );

    return {
        id: poll.id,
        question: poll.question,
        is_closed: poll.is_closed,
        created_at: poll.created_at,
        closed_at: poll.closed_at,
        totalVotes,
        myVoteOptionId: myVote?.id ?? null,
        options: poll.options.map((option) => {
            const voteCount = option.votes.length;

            return {
                id: option.id,
                text: option.text,
                voteCount,
                votes: voteCount,
                percent: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
                selected: option.id === myVote?.id,
            };
        }),
    };
};

const createPoll = async (code: string, payload: unknown, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await ensureHost(meeting.id, currentUserId);
    const parsedPayload = createPollPayloadSchema.parse(payload);

    const poll = await pollRepository.createWithOptions(
        meeting.id,
        parsedPayload.question.trim(),
        parsedPayload.options.map((option) => option.trim()),
    );

    return {
        ...poll,
        totalVotes: 0,
        myVoteOptionId: null,
        options: poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            voteCount: 0,
            votes: 0,
            percent: 0,
            selected: false,
        })),
    };
};

const listPolls = async (code: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

    const polls = await pollRepository.listByMeetingId(meeting.id);

    return polls.map((poll) => formatPoll(poll, currentUserId));
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

    const existingVote = await prisma.pollVote.findUnique({
        where: {
            poll_id_voter_id: {
                poll_id: poll.id,
                voter_id: currentUserId,
            },
        },
    });

    if (existingVote) {
        await prisma.pollVote.update({
            where: { id: existingVote.id },
            data: { option_id: option.id },
        });
    } else {
        await prisma.pollVote.create({
            data: {
                poll_id: poll.id,
                option_id: option.id,
                voter_id: currentUserId,
            },
        });
    }

    const updatedPoll = await prisma.poll.findUniqueOrThrow({
        where: { id: poll.id },
        include: {
            options: { include: { votes: true } },
        },
    });

    return formatPoll(updatedPoll, currentUserId);
};

const getPollResults = async (code: string, pollId: string, currentUserId: string) => {
    const meeting = await getMeetingByCodeOrThrow(code);
    await getParticipantOrThrow(meeting.id, currentUserId);

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
            options: { include: { votes: true } },
        },
    });

    if (!poll || poll.meeting_id !== meeting.id) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Poll not found");
    }

    const formattedPoll = formatPoll(poll, currentUserId);

    return {
        pollId: formattedPoll.id,
        question: formattedPoll.question,
        is_closed: formattedPoll.is_closed,
        totalVotes: formattedPoll.totalVotes,
        myVoteOptionId: formattedPoll.myVoteOptionId,
        results: formattedPoll.options,
        options: formattedPoll.options,
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

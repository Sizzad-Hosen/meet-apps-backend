import prisma from "../../lib/prisma";

export const pollRepository = {
  createWithOptions(meetingId: string, question: string, options: string[]) {
    return prisma.poll.create({
      data: {
        meeting_id: meetingId,
        question,
        options: {
          create: options.map((text) => ({ text })),
        },
      },
      include: { options: true },
    });
  },

  listByMeetingId(meetingId: string) {
    return prisma.poll.findMany({
      where: { meeting_id: meetingId },
      include: {
        options: {
          include: { votes: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
  },
};

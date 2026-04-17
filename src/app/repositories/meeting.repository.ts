import prisma from "../../lib/prisma";

export const meetingRepository = {
  findByJoinCode(code: string) {
    return prisma.meeting.findUnique({
      where: { join_code: code },
    });
  },
};

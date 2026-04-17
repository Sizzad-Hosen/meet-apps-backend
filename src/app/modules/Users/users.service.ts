import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StatusCodes } from 'http-status-codes';
import prisma from '../../../lib/prisma';
import ApiError from '../../errors/ApiError';

const parseBase64Image = (base64: string) => {
    const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid base64 image payload');
    }

    return {
        contentType: matches[1],
        data: Buffer.from(matches[2], 'base64'),
    };
};

const uploadToS3 = async (bucket: string, key: string, body: Buffer, contentType: string) => {
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const client = new S3Client({ region });

    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
    }));

    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
};

const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    return user;
};

const updateMe = async (userId: string, payload: any) => {
    const data: any = {};

    if (payload.name !== undefined) {
        data.name = payload.name.trim();
    }

    if (payload.avatarUrl !== undefined) {
        data.avatarUrl = payload.avatarUrl;
    }

    if (payload.settings !== undefined) {
        data.settings = payload.settings;
    }

    if (Object.keys(data).length === 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'No profile fields provided to update');
    }

    return prisma.user.update({
        where: { id: userId },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
        },
    });
};

const getMyMeetings = async (userId: string) => {
    const meetings = await prisma.meeting.findMany({
        where: {
            OR: [
                { host_id: userId },
                {
                    meetingParticipants: {
                        some: { user_id: userId },
                    },
                },
            ],
        },
        distinct: ['id'],
        orderBy: { created_at: 'desc' },
        include: {
            meetingParticipants: {
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

    return meetings;
};

const getFrequentContacts = async (userId: string) => {
    const meetingIds = await prisma.meetingParticipant.findMany({
        where: { user_id: userId },
        select: { meeting_id: true },
        distinct: ['meeting_id'],
    });

    const participantRecords = await prisma.meetingParticipant.findMany({
        where: {
            meeting_id: { in: meetingIds.map((item) => item.meeting_id) },
            user_id: { not: userId },
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

    const contacts: Record<string, any> = {};
    participantRecords.forEach((record) => {
        if (!contacts[record.user.id]) {
            contacts[record.user.id] = {
                id: record.user.id,
                name: record.user.name,
                email: record.user.email,
                avatarUrl: record.user.avatarUrl,
            };
        }
    });

    return Object.values(contacts);
};

const uploadAvatar = async (userId: string, payload: any) => {
    let avatarUrl = payload.avatarUrl;

    if (!avatarUrl && payload.avatarBase64) {
        const { data, contentType } = parseBase64Image(payload.avatarBase64);
        const extension = contentType.split('/')[1] || 'png';
        const fileName = `${userId}.${extension}`;

        if (process.env.S3_BUCKET) {
            avatarUrl = await uploadToS3(process.env.S3_BUCKET, `avatars/${fileName}`, data, contentType);
        } else {
            const uploadsDirectory = path.resolve(process.cwd(), 'uploads', 'avatars');
            if (!fs.existsSync(uploadsDirectory)) {
                fs.mkdirSync(uploadsDirectory, { recursive: true });
            }

            const filePath = path.join(uploadsDirectory, fileName);
            fs.writeFileSync(filePath, data);
            const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            avatarUrl = `${baseUrl}/uploads/avatars/${encodeURIComponent(fileName)}`;
        }
    }

    if (!avatarUrl) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Avatar image or URL is required');
    }

    return prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            settings: true,
            createdAt: true,
            updatedAt: true,
        },
    });
};

export const UsersServices = {
    getMe,
    updateMe,
    getMyMeetings,
    getFrequentContacts,
    uploadAvatar,
};

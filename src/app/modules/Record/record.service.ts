import { EncodedFileOutput } from 'livekit-server-sdk';
import { StatusCodes } from 'http-status-codes';
import prisma from '../../../lib/prisma';
import { clientes } from '../../../helpers/s3';
import ApiError from '../../errors/ApiError';

const getMeetingByCode = async (code: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  return meeting;
};

export const startRecording = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCode(code);

  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host can start recording');
  }

  const existingRecording = await prisma.recording.findFirst({
    where: {
      meeting_id: meeting.id,
      status: 'recording'
    }
  });

  if (existingRecording) {
    throw new ApiError(StatusCodes.CONFLICT, 'Recording already in progress');
  }

  const admittedCount = await prisma.meetingParticipant.count({
    where: {
      meeting_id: meeting.id,
      status: 'admitted',
      left_at: null
    }
  });

  if (admittedCount === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot start recording without any admitted participants');
  }

  try {
    await clientes.roomServiceClient.createRoom({
      name: meeting.livekit_room_name,
      maxParticipants: meeting.max_participants
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
  }

  const fs = await import('fs');
  const path = await import('path');
  const filePath = `recordings/${meeting.id}/${Date.now()}.mp4`;
  const directory = path.dirname(filePath);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const output = new EncodedFileOutput({
    filepath: filePath
  });

  let egressInfo;
  try {
    egressInfo = await clientes.egressClient.startRoomCompositeEgress(
      meeting.livekit_room_name,
      output
    );
  } catch (error) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      `Failed to start recording egress: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!egressInfo?.egressId) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, 'Egress failed to start properly');
  }

  return prisma.recording.create({
    data: {
      meeting_id: meeting.id,
      egress_id: egressInfo.egressId,
      s3_key: filePath,
      status: 'recording'
    }
  });
};

const stopRecording = async (code: string, currentUserId: string) => {
  const meeting = await getMeetingByCode(code);

  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host can stop recording');
  }

  const recording = await prisma.recording.findFirst({
    where: { meeting_id: meeting.id, status: 'recording' }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'No active recording found');
  }

  await clientes.egressClient.stopEgress(recording.egress_id);

  const durationSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(recording.started_at).getTime()) / 1000)
  ).toString();

  return prisma.recording.update({
    where: { id: recording.id },
    data: {
      status: 'completed',
      ended_at: new Date(),
      duration_seconds: durationSeconds
    }
  });
};

const getRecordings = async (meetingId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meetingId, user_id: currentUserId }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  return prisma.recording.findMany({
    where: { meeting_id: meetingId },
    orderBy: { created_at: 'desc' }
  });
};

const getDownloadUrl = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recording not found');
  }

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: recording.meeting_id, user_id: currentUserId }
  });

  if (!participant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied');
  }

  const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

  return {
    url: `${baseUrl}/${recording.s3_key.replace(/\\/g, '/')}`,
    path: recording.s3_key,
    expires_in: null
  };
};

const deleteRecording = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Recording not found');
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: recording.meeting_id }
  });

  if (!meeting) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found');
  }

  if (meeting.host_id !== currentUserId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only host can delete');
  }

  const fs = await import('fs');
  if (recording.s3_key && fs.existsSync(recording.s3_key)) {
    fs.unlinkSync(recording.s3_key);
  }

  return prisma.recording.delete({
    where: { id: recordingId }
  });
};

export const RecordingServices = {
  startRecording,
  stopRecording,
  getRecordings,
  getDownloadUrl,
  deleteRecording
};

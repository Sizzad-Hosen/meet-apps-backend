import {  EncodedFileOutput, EncodedFileType, RoomCompositeOptions, RoomServiceClient } from 'livekit-server-sdk';

import prisma from '../../../lib/prisma';
import { clientes } from '../../../helpers/s3';

export const startRecording = async (code: string, currentUserId: string) => {
  // ─── 1. Meeting Fetch ─────────────────────────────
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');

  if (meeting.host_id !== currentUserId) {
    throw new Error('Only host can start recording');
  }

  // ─── 2. Duplicate Recording Check ──────────────────
  const existingRecording = await prisma.recording.findFirst({
    where: {
      meeting_id: meeting.id,
      status: 'recording'
    }
  });

  if (existingRecording) {
    throw new Error('Recording already in progress');
  }

  // ─── 3. Ensure room exists (safe) ──────────────────
  try {
    await clientes.roomServiceClient.createRoom({
      name: meeting.livekit_room_name
    });
  } catch (err) {
    console.log('⚠️ Room already exists or active');
  }

  // ─── 4. LOCAL file path ────────────────────────────
  const fileName = `recordings/${meeting.id}/${Date.now()}.mp4`;

  // ensure folder exists
  const fs = await import('fs');
  const path = await import('path');

  const dir = path.dirname(fileName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ─── 5. Egress Output (LOCAL ONLY) ─────────────────
  const output = new EncodedFileOutput({
    filepath: fileName
  });

  let egressInfo;

  try {
    egressInfo = await clientes.egressClient.startRoomCompositeEgress(
      meeting.livekit_room_name,
      output   // ✅ LOCAL MODE (no S3)
    );
  } catch (err) {
    throw new Error(
      `Failed to start egress: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!egressInfo?.egressId) {
    throw new Error('Egress failed to start properly');
  }

  // ─── 6. DB Save ────────────────────────────────────
  return await prisma.recording.create({
    data: {
      meeting_id: meeting.id,
      egress_id: egressInfo.egressId,
      file_path: fileName,
      status: 'recording'
    }
  });
};
const stopRecording = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can stop recording');

  const recording = await prisma.recording.findFirst({
    where: { meeting_id: meeting.id, status: 'recording' }
  });

  if (!recording) throw new Error('No active recording found');

  await clientes.egressClient.stopEgress(recording.egress_id);

  return await prisma.recording.update({
    where: { id: recording.id },
    data: {
      status: 'completed',
      ended_at: new Date()
    }
  });
};

const getRecordings = async (meetingId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId }
  });

  if (!meeting) throw new Error('Meeting not found');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meetingId, user_id: currentUserId }
  });

  if (!participant) throw new Error('Access denied');

  return await prisma.recording.findMany({
    where: { meeting_id: meetingId },
    orderBy: { created_at: 'desc' }
  });
};

const getDownloadUrl = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) throw new Error('Recording not found');

  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: recording.meeting_id, user_id: currentUserId }
  });

  if (!participant) throw new Error('Access denied');

  // ✅ LOCAL FILE URL
  const url = `http://localhost:5000/${recording.s3_key}`;

  return {
    url,
    expires_in: null
  };
};

const deleteRecording = async (recordingId: string, currentUserId: string) => {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId }
  });

  if (!recording) throw new Error('Recording not found');

  const meeting = await prisma.meeting.findUnique({
    where: { id: recording.meeting_id }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can delete');

  // ✅ delete from local storage
  const fs = await import('fs');
  if (fs.existsSync(recording.s3_key)) {
    fs.unlinkSync(recording.s3_key);
  }

  return await prisma.recording.delete({
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
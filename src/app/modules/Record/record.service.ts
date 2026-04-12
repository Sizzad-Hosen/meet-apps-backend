import { EncodedFileOutput } from 'livekit-server-sdk';
import prisma from '../../../lib/prisma';
import { clientes } from '../../../helpers/s3'; 

const startRecording = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can start recording');
  if (!meeting.is_recorded) throw new Error('Recording is disabled for this meeting');

  const fileName = `recordings/${meeting.id}/${Date.now()}.mp4`;

  const output = new EncodedFileOutput({
    filepath: fileName
  });

  const egress = await clientes.egressClient.startRoomCompositeEgress(
    meeting.livekit_room_name,
    {
      file: output
    }
  );

  const recording = await prisma.recording.create({
    data: {
      meeting_id: meeting.id,
      egress_id: egress.egressId,
      s3_key: fileName, 
      status: 'recording'
    }
  });

  return recording;
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
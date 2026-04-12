import {  EncodedFileOutput, S3Upload } from 'livekit-server-sdk';
import {  DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../../../lib/prisma';
import {  clientes } from '../../../helpers/s3';


const startRecording = async (code: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { join_code: code }
  });

  if (!meeting) throw new Error('Meeting not found');
  if (meeting.host_id !== currentUserId) throw new Error('Only host can start recording');
  if (!meeting.is_recorded) throw new Error('Recording is disabled for this meeting');

  const fileName = `recordings/${meeting.id}/${Date.now()}.mp4`;

 
const output = new EncodedFileOutput({
  filepath: fileName,
  output: {
    case: 's3',
    value: new S3Upload({
      bucket: process.env.AWS_S3_BUCKET!,
      region: process.env.AWS_REGION!,
      accessKey: process.env.AWS_ACCESS_KEY_ID!,
      secret: process.env.AWS_SECRET_ACCESS_KEY!
    })
  }
});

  const egress = await clientes.egressClient.startRoomCompositeEgress(
    meeting.livekit_room_name,
    { file: output }
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

  const updated = await prisma.recording.update({
    where: { id: recording.id },
    data: { status: 'completed', ended_at: new Date() }
  });

  return updated;
};

const getRecordings = async (meetingId: string, currentUserId: string) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId }
  });

  if (!meeting) throw new Error('Meeting not found');

  // participant check
  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: meetingId, user_id: currentUserId }
  });

  if (!participant) throw new Error('You are not a participant of this meeting');

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

  // participant check
  const participant = await prisma.meetingParticipant.findFirst({
    where: { meeting_id: recording.meeting_id, user_id: currentUserId }
  });

  if (!participant) throw new Error('Access denied');

  // signed URL generate করো — 1 ঘন্টা valid
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: recording.s3_key
  });

  const signedUrl = await getSignedUrl(clientes.s3Client, command, { expiresIn: 3600 });

  return { url: signedUrl, expires_in: 3600 };
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
  if (meeting.host_id !== currentUserId) throw new Error('Only host can delete recording');

  // S3 থেকে delete করো
  await clientes.s3Client.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: recording.s3_key
  }));

  // DB থেকে delete করো
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
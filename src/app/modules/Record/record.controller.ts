import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { RecordingServices } from './record.service';
import { sendResponse } from '../../../shared/sendResponse';


const startRecording = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await RecordingServices.startRecording(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Recording started successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const stopRecording = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await RecordingServices.stopRecording(code, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Recording stopped successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getRecordings = async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await RecordingServices.getRecordings(meetingId, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Recordings fetched successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDownloadUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await RecordingServices.getDownloadUrl(id, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Download URL generated successfully',
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteRecording = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await RecordingServices.deleteRecording(id, currentUserId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Recording deleted successfully',
      data: null
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const RecordingControllers = {
  startRecording,
  stopRecording,
  getRecordings,
  getDownloadUrl,
  deleteRecording
};
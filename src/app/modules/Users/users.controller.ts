import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { catchAsync } from '../../../shared/catchAsync';
import { sendResponse } from '../../../shared/sendResponse';
import { UsersServices } from './users.service';

const requireUserId = (req: Request) => req.user?.userId || '';

const getMe = catchAsync(async (req: Request, res: Response) => {
    const result = await UsersServices.getMe(requireUserId(req));
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Current user profile fetched successfully',
        data: result,
    });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
    const result = await UsersServices.updateMe(requireUserId(req), req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User profile updated successfully',
        data: result,
    });
});

const getMyMeetings = catchAsync(async (req: Request, res: Response) => {
    const result = await UsersServices.getMyMeetings(requireUserId(req));
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User meeting history fetched successfully',
        data: result,
    });
});

const getFrequentContacts = catchAsync(async (req: Request, res: Response) => {
    const result = await UsersServices.getFrequentContacts(requireUserId(req));
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Frequent contacts fetched successfully',
        data: result,
    });
});

const uploadAvatar = catchAsync(async (req: Request, res: Response) => {
    const result = await UsersServices.uploadAvatar(requireUserId(req), req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Avatar uploaded successfully',
        data: result,
    });
});

export const UsersControllers = {
    getMe,
    updateMe,
    getMyMeetings,
    getFrequentContacts,
    uploadAvatar,
};

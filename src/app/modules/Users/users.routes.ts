import express from 'express';
import { auth } from '../../middlewares/auth';
import { validateRequest } from '../../middlewares/validateRequest';
import { UsersControllers } from './users.controller';
import { UsersValidation } from './users.validation';

const router = express.Router();

router.get('/me', auth(), UsersControllers.getMe);
router.put('/me', auth(), validateRequest(UsersValidation.updateProfileSchema), UsersControllers.updateMe);
router.get('/me/meetings', auth(), UsersControllers.getMyMeetings);
router.get('/me/contacts', auth(), UsersControllers.getFrequentContacts);
router.post('/me/avatar', auth(), validateRequest(UsersValidation.uploadAvatarSchema), UsersControllers.uploadAvatar);

export const UsersRoutes = router;

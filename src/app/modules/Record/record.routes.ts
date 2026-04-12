import { auth } from '../../middlewares/auth';
import { RecordingControllers } from './record.controller';

const router = require('express').Router();

router.post('/:code/start', auth(), RecordingControllers.startRecording);
router.post('/:code/stop',  auth(), RecordingControllers.stopRecording);

router.get('/:meetingId',          auth(), RecordingControllers.getRecordings);
router.get('/:id/download',        auth(), RecordingControllers.getDownloadUrl);
router.delete('/:id',              auth(), RecordingControllers.deleteRecording);

export const RecordingRoutes = router;
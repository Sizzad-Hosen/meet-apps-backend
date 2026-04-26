import express from 'express'
import { AuthControllers } from './auth.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { AuthValidation } from './auth.validation';


const router = express.Router();

router.post('/register', validateRequest(AuthValidation.registerUserSchema), AuthControllers.register )
router.post('/login', validateRequest(AuthValidation.loginUserSchema), AuthControllers.login )
router.post('/send-verification-email', validateRequest(AuthValidation.sendVerificationEmailSchema), AuthControllers.sendVerificationEmail )
router.post('/verify-email', validateRequest(AuthValidation.verifyEmailSchema), AuthControllers.verifyEmail )
router.post('/forgot-password', validateRequest(AuthValidation.forgotPasswordSchema), AuthControllers.forgotPassword )
router.post('/reset-password', validateRequest(AuthValidation.resetPasswordSchema), AuthControllers.resetPassword )
router.post('/refresh-token', AuthControllers.refreshToken )
router.post('/logout', AuthControllers.logout )

export const AuthRoutes= router;


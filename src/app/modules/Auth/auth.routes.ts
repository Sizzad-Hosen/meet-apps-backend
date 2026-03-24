import express from 'express'
import { AuthControllers } from './auth.controller';


const router = express.Router();

router.post('/register', AuthControllers.register )
router.post('/login', AuthControllers.login )
router.post('/forgot-password', AuthControllers.forgotPassword )
router.post('/reset-password', AuthControllers.resetPassword )
router.post('/refresh-token', AuthControllers.refreshToken )

export const AuthRoutes= router;


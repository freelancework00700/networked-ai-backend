import { Router } from 'express';
import { login, sendVerificationOTP, verifyOTP, register, forgotPassword, resetPassword, socialLogin } from '../controllers/auth.controller';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { loginSchema, sendVerificationOTPSchema, verifyEmailOTPSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, socialLoginSchema } from '../validations/auth.validations';
import { authenticateToken } from '../middlewares/auth.middleware';

const authRouter = Router();

authRouter.post('/register', validateSchema(registerSchema, 'body'), register);
authRouter.post('/login', validateSchema(loginSchema, 'body'), login);
authRouter.post('/social-login', validateSchema(socialLoginSchema, 'body'), socialLogin);
authRouter.post('/send-verification-otp', validateSchema(sendVerificationOTPSchema, 'body'), sendVerificationOTP);
authRouter.post('/verify-otp', validateSchema(verifyEmailOTPSchema, 'body'), verifyOTP);
authRouter.post('/forgot-password', validateSchema(forgotPasswordSchema, 'body'), forgotPassword);
authRouter.post('/reset-password', authenticateToken, validateSchema(resetPasswordSchema, 'body'), resetPassword);

export default authRouter;

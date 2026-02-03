import { NextFunction, Request, Response } from "express";
import { sequelize } from "../server";
import userService from "../services/user.service";
import verificationService from "../services/verification.service";
import { RegisterUserPayload, UpdateUserPayload } from "../types/user.interfaces";
import { compareAsync, encrypt, hashAsync } from "../utils/crypto.service";
import { verifyFirebaseToken } from "../utils/firebase.service";
import loggerService from "../utils/logger.service";
import { sendEmailVerificationOTP, sendForgotPasswordMail } from "../utils/mail.service";
import { sendBadRequestResponse, sendNotFoundResponse, sendServerErrorResponse, sendSuccessResponse, sendUnauthorizedResponse } from "../utils/response.service";
import { sendOtpSms } from "../utils/twilio.service";
import { responseMessages } from "../utils/response-message.service";
import { User } from "../models";

/**
 * Social login
 * @route POST /api/auth/social-login
 */
export const socialLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { firebase_token, fcm_token } = req.body;
        // Verify Firebase Token
        const decodedToken = await verifyFirebaseToken(firebase_token);

        const firebaseUid = decodedToken.uid;
        const email = decodedToken.email ?? null;
        const mobile = decodedToken.phoneNumber ?? decodedToken.phone_number ?? null;
        const name = decodedToken.name ?? null;

        let user = null;
        let isNewUser = false;

        // Find by Email / Phone
        if (email || mobile) {
            user = await userService.findUserByEmailOrPhone(email, mobile);
        }

        // Find by Firebase UID
        if (!user) {
            user = await userService.findUserByFirebaseUid(firebaseUid);
        }

        // Existing User
        if (user) {
            // Prepare update data
            const updateData: UpdateUserPayload = {
                firebase_uid: user.firebase_uid !== firebaseUid ? firebaseUid : undefined,
                email: (!user.email && email) ? email : undefined,
                mobile: (!user.mobile && mobile) ? mobile : undefined,
                username: (!user.username && name) ? name : undefined,
                fcm_tokens: fcm_token ? userService.combineFcmTokens(user, fcm_token) : undefined,
            };

            // Update user to link Firebase UID and add missing profile fields
            await userService.updateUser(user.id, updateData);
            await user.reload();
        }

        // Create new user
        else {
            user = await userService.createUserWithFirebaseUid(firebaseUid, email, mobile, name, fcm_token);
            isNewUser = true;
        }

        // Generate Auth Token
        const token = encrypt(
            {
                userId: user.id,
                username: user.username ?? ''
            },
            '180d' // 6 months
        );

        return sendSuccessResponse(res, responseMessages.authentication.socialLoginSuccess, {
            token,
            user: user.toJSON(),
            is_new_user: isNewUser
        });
    } catch (error) {
        loggerService.error(`Social login error: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.socialLoginFailed, error);
        next(error);
    }
};

/**
 * Login a user
 * @route POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { mobile, otp, email, password, fcm_token, bearer_token } = req.body;

        let result:
            | { user: User; isNewUser: boolean }
            | { error: string }
            | undefined;

        if (mobile && otp) {
            result = await userService.loginWithMobileAndOtp(mobile, otp);
        } else if (email && password) {
            result = await userService.loginWithEmailAndPassword(email, password);
        } else if (bearer_token) {
            result = await userService.handleBearerTokenLogin(bearer_token);
        }

        if (!result) {
            return sendServerErrorResponse(res, responseMessages.authentication.loginFailed, new Error('Unknown login method'));
        }

        if ('error' in result) {
            return sendUnauthorizedResponse(res, result.error);
        }

        const { user, isNewUser } = result;
        if (!user) {
            return sendServerErrorResponse(res, responseMessages.authentication.loginFailed, new Error('User not found after processing'));
        }
        if (fcm_token) {
            await userService.updateUser(user.id, { fcm_tokens: `${user.fcm_tokens || ''},${fcm_token}` }, user.id);
        }

        const token = encrypt(
            {
                userId: user.id,
                username: user.username,
            },
            '180d'
        ); // 6 months = 180 days

        return sendSuccessResponse(res, responseMessages.authentication.loginSuccess, {
            token,
            user: user.toJSON(),
            is_new_user: isNewUser,
        });
    } catch (error) {
        loggerService.error(`Login error: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.loginFailed, error);
        next(error);
    }
};

/**
 * Send verification OTP for email or mobile
 * @route POST /api/auth/send-verification-otp
 */
export const sendVerificationOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, mobile } = req.body;

        const { code } = await verificationService.createVerification({
            email,
            mobile,
        });

        try {
            if (email) {
                sendEmailVerificationOTP(email, code);
            } else {
                await sendOtpSms(mobile, code);
            }
        } catch (sendError) {
            const errorMessage = `${responseMessages.authentication.sendVerificationCodeFailed} ${email ? 'email' : 'mobile'}: ${(sendError as Error).message || 'Unknown error'}`;
            return sendServerErrorResponse(res, errorMessage, sendError);
        }

        const successMessage = `${responseMessages.authentication.sendVerificationCodeSuccess} ${email ? 'email' : 'mobile'}`;
        return sendSuccessResponse(res, successMessage);
    } catch (error) {
        loggerService.error(`Error sending verification OTP: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.sendVerificationCodeFailed, error);
        next(error);
    }
};

/**
 * Verify OTP for email or mobile
 * @route POST /api/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, mobile, code } = req.body;

        const isValid = await verificationService.verifyOTP({
            email,
            mobile,
            code,
        });

        return res.json(isValid);
    } catch (error) {
        loggerService.error(`Error verifying OTP: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.verifyCodeFailed, error);
        next(error);
    }
};

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await sequelize.transaction();
    try {
        // Extract all fields from request body (same as update user)
        const {
            email,
            mobile,
            password
        } = req.body;

        /** Check username, email and mobile already exist or not */
        const [byEmail, byMobile] = await Promise.all([
            email ? userService.findUserByEmail(email) : null,
            mobile ? userService.findUserByPhone(mobile) : null
        ]);

        if (byEmail) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.user.emailAlreadyRegistered);
        }
        if (byMobile) {
            await transaction.rollback();
            return sendBadRequestResponse(res, responseMessages.user.mobileAlreadyRegistered);
        }

        // Build user data object
        const userData: RegisterUserPayload = {
            email,
            mobile,
        };

        // Only hash and include password if provided
        if (password) {
            userData.password = await hashAsync(password);
        }

        // Create user
        const newUser = await userService.createUser(userData, null, transaction);

        if (!newUser) {
            await transaction.rollback();
            return sendServerErrorResponse(res, responseMessages.user.failedToCreate);
        }

        await transaction.commit();

        // Generate JWT token
        const token = encrypt({
            userId: newUser.id,
            username: newUser.username,
        }, '180d'); // 6 months = 180 days

        return sendSuccessResponse(res, responseMessages.authentication.registerSuccess, {
            token,
            user: newUser,
        });
    } catch (error) {
        await transaction.rollback();
        loggerService.error(`Error registering user: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.registerFailed, error);
        next(error);
    }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        const user = await userService.findUserByEmail(email);
        if (!user) {
            return sendBadRequestResponse(res, responseMessages.user.notFoundSingle);
        }

        // Generate new password
        const newPassword = verificationService.generatePassword(8);

        // Update user password
        await userService.updateUser(user.id, { password: await hashAsync(newPassword) });

        // Send new password to user
        sendForgotPasswordMail({
            name: user.name || '',
            email: user.email || '',
            password: newPassword,
        });

        return sendSuccessResponse(res, responseMessages.authentication.forgotPasswordSuccess);

    } catch (error) {
        loggerService.error(`Error forgot password: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.forgotPasswordFailed, error);
        next(error);
    }
};

/** Reset password
 * @route POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedUser = res.locals.auth?.user;
        const { password, new_password } = req.body;

        const user = await userService.findUserById(authenticatedUser.id);
        if (!user) {
            return sendNotFoundResponse(res, responseMessages.user.notFoundSingle);
        }

        const isPasswordValid = await compareAsync(password, user.password || '');
        if (!isPasswordValid) {
            return sendUnauthorizedResponse(res, responseMessages.authentication.invalidPassword);
        }

        await userService.updateUser(user.id, { password: await hashAsync(new_password) });

        return sendSuccessResponse(res, responseMessages.authentication.resetPasswordSuccess);
    } catch (error) {
        loggerService.error(`Error resetting password: ${error}`);
        sendServerErrorResponse(res, responseMessages.authentication.resetPasswordFailed, error);
        next(error);
    }
};
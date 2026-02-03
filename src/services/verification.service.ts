import { Op } from 'sequelize';
import OtpVerification from '../models/otp-verification.model';
import { OtpVerificationType } from '../types/enums';
import { CreateVerificationParams, VerifyParams } from '../types/user.interfaces';

/** Generate a 6-digit random OTP */
const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/** 
 * Generate a random password with specified length
 * Includes uppercase, lowercase alphabets and numbers
 */
const generatePassword = (length: number = 8): string => {
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';

    const allChars = upperCase + lowerCase + numbers;

    let password = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * allChars.length);
        password += allChars[randomIndex];
    }

    return password;
};

/** Normalize mobile number by removing spaces and formatting */
const normalizeMobile = (mobile: string | undefined): string | undefined => {
    if (!mobile) return undefined;
    // Remove all spaces, dashes, and parentheses
    return mobile.replace(/[\s\-\(\)]/g, '');
};

/** Create a verification record for email or mobile. */
const createVerification = async ({ email, mobile }: CreateVerificationParams): Promise<{ code: string; expiresAt: Date }> => {
    const normalizedMobile = normalizeMobile(mobile);

    // Remove existing records for this channel
    await OtpVerification.destroy({
        where: {
            verification_type: email ? OtpVerificationType.EMAIL : OtpVerificationType.MOBILE,
            ...(email ? { email } : { mobile: normalizedMobile }),
        }
    });

    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await OtpVerification.create({
        email: email ? email : null,
        mobile: normalizedMobile ? normalizedMobile : null,
        verification_code: code,
        verification_type: email ? OtpVerificationType.EMAIL : OtpVerificationType.MOBILE,
        expires_at: expiresAt
    });

    return { code, expiresAt };
};

/** Verify OTP for email or mobile. */
const verifyOTP = async ({ email, mobile, code }: VerifyParams): Promise<boolean> => {
    const normalizedMobile = normalizeMobile(mobile);

    const currentDate = new Date();

    const whereClause: any = {
        verification_type: email ? OtpVerificationType.EMAIL : OtpVerificationType.MOBILE,
        verification_code: code,
        expires_at: {
            [Op.gt]: currentDate
        }
    };

    if (email) {
        whereClause.email = email;
    } else if (normalizedMobile && mobile && normalizedMobile !== mobile) {
        whereClause.mobile = {
            [Op.in]: [
                normalizedMobile,
                mobile
            ]
        };
    } else if (normalizedMobile) {
        whereClause.mobile = normalizedMobile;
    } else if (mobile) {
        whereClause.mobile = mobile;
    }

    const verification = await OtpVerification.findOne({ where: whereClause });

    if (!verification) {
        return false;
    }

    await OtpVerification.destroy({
        where: {
            id: verification.id
        }
    });

    return true;
};

export default {
    generateOTP,
    generatePassword,
    createVerification,
    verifyOTP
};


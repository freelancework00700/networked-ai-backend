import twilio from 'twilio';
import env from './validate-env';
import loggerService from './logger.service';
import { isSmsEnabled } from '../services/service-settings.service';

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTHTOKEN);

/**
 * Send a plain SMS via Twilio.
 * @param to E.164 formatted destination number (e.g., +15551234567)
 * @param body Message content
 */
export const sendSms = async (to: string, body: string) => {
    try {
        // Check if SMS service is enabled
        const smsEnabled = await isSmsEnabled();
        if (!smsEnabled) {
            loggerService.info(`SMS service is disabled. Skipping SMS to ${to}`);
            return null;
        }

        const message = await client.messages.create({
            from: env.TWILIO_PHONE_NUMBER,
            to,
            body,
        });

        loggerService.info(`Twilio SMS sent. SID=${message.sid}`);
        return message;
    } catch (error: any) {
        loggerService.error(`Twilio SMS send failed: ${error.message || error}`);
        throw error;
    }
};

/**
 * Helper to send an OTP code over SMS.
 * @param to E.164 formatted destination number  (e.g., +15551234567)
 * @param otp OTP/passcode to deliver
 */
export const sendOtpSms = (to: string, otp: string) => {
    const body = `Your verification code is ${otp}`;
    return sendSms(to, body);
};


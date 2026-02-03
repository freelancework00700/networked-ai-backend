import fs from 'fs';
import path from 'path';
import { SendForgotPasswordMailParams } from '../types/smtp-interfaces';
import { sendEmail } from './smtp.service';

/**
 * Send a forgot password email to a user with their new password
 * @param params Object containing name, email, password
 */
export const sendForgotPasswordMail = ({ name, email, password }: SendForgotPasswordMailParams) => {
    try {
        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/forgot-password-mail.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        // Replace placeholders
        html = html
            .replace(/{{name}}/g, name)
            .replace(/{{email}}/g, email)
            .replace(/{{password}}/g, password);

        // Send the email
        sendEmail({
            to: email,
            subject: 'Password Reset - Networked AI',
            html
        });
    } catch (error) {
        console.error('Error in sendForgotPasswordMail:', error);
        throw error;
    }
};

/**
 * Send email verification OTP
 * @param email Email address to send OTP to
 * @param otp 6-digit OTP code
 */
export const sendEmailVerificationOTP = (email: string, otp: string) => {
    try {
        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/email-verification-otp.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        // Replace OTP placeholder
        html = html.replace(/{{otp}}/g, otp);
        html = html.replace(/{{year}}/g, new Date().getFullYear().toString());

        // Send the email
        sendEmail({
            to: email,
            subject: 'Email Verification Code - Networked AI',
            html
        });
    } catch (error) {
        console.error('Error in sendEmailVerificationOTP:', error);
        throw error;
    }
};

/**
 * Send new networked request email to a user
 * @param email Email address to send email to
 * @param name Name of the event host
 * @param eventUrl URL of the event
 * @param message Message to send
 */
export const sendNewNetworkedRequestMail = (email: string, name: string, eventUrl: string, message: string) => {
    try {
        // Read the HTML template
        const templatePath = path.join(__dirname, '../contents/network-request-mail.html');
        let html = fs.readFileSync(templatePath, 'utf-8');
        html = html.replace(/{{name}}/g, name);
        html = html.replace(/{{eventUrl}}/g, eventUrl);
        html = html.replace(/{{year}}/g, new Date().getFullYear().toString());
        html = html.replace(/{{message}}/g, message);
        sendEmail({
            to: email,
            subject: 'New Networked Request - Networked AI',
            html
        });
    } catch (error) {
        console.error('Error in sendNewNetworkedRequestMail:', error);
        throw error;
    }
};
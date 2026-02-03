import aws from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import loggerService from "./logger.service";
import env from "./validate-env";

const sesClient = new aws.SES({
    apiVersion: env.AWS_API_VERSION,
    region: env.AWS_SES_REGION,
    credentials: {
        secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
        accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
    },
});

const transporter = nodemailer.createTransport({
    SES: { ses: sesClient, aws },
    sendingRate: env.AWS_SES_SENDING_RATE,
    maxConnections: env.AWS_SES_MAX_CONNECTIONS,
} as any);

export const sendEmail = (mailOptions: MailOptions): Promise<any> => {
    return new Promise((resolve, reject) => {
        try {
            // Build options object, only including fields that have values
            const options: MailOptions = {
                html: mailOptions.html,
                subject: mailOptions.subject,
                from: mailOptions.from || env.AWS_SES_FROM_EMAIL,
            };

            // Only include 'to' if it's provided and not empty
            if (mailOptions.to) {
                options.to = mailOptions.to;
            }

            // Only include 'bcc' if it's provided and not empty
            if (mailOptions.bcc && Array.isArray(mailOptions.bcc) && mailOptions.bcc.length > 0) {
                options.bcc = mailOptions.bcc;
            }

            // Only include attachments if provided
            if (mailOptions.attachments && mailOptions.attachments.length > 0) {
                options.attachments = mailOptions.attachments;
            }

            transporter.sendMail(options, (error, info) => {
                if (error) {
                    loggerService.error(`Error sending email: ${error.message}`);
                    reject(error);
                    return;
                }

                loggerService.info(`Email sent: ${info.response}`);
                resolve(info);
            });
        } catch (error: any) {
            loggerService.error(`Error sending email: ${error}`);
            reject(error);
        }
    });
};

import { Attachment } from 'nodemailer/lib/mailer';

export interface CreateEmailParams {
    type: string;
    html: string;
    from: string;
    bcc?: string[];
    subject: string;
    attachments?: Attachment[];
    created_by?: string | null;
}

export interface SendEmailPayload {
    type: string;
    html: string;
    from: string;
    subject: string;
    bcc?: string[];
    tag_ids?: string[];
    segment_ids?: string[];
}

export type GetAllEmailsOptions = {
    page?: number;
    limit?: number;
    search?: string;
    date_to?: string;
    date_from?: string;
    order_direction?: 'ASC' | 'DESC';
    order_by?: 'subject' | 'created_at';
};
import { EmailType } from '../types/enums';

export const sendEmailSchema = {
    type: 'object',
    properties: {
        is_all_tag: { type: 'boolean' },
        is_all_segment: { type: 'boolean' },
        html: { type: 'string', minLength: 1 },
        from: { type: 'string', maxLength: 500 },
        bcc: { type: 'array', items: { type: 'string' } },
        subject: { type: 'string', minLength: 1, maxLength: 500 },
        tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        type: { type: 'string', enum: [EmailType.CUSTOM, EmailType.CUSTOM_EVENT] },
        segment_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    required: ['type', 'html', 'subject'],
    additionalProperties: false,
};

export const getAllEmailsSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        date_to: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        date_from: { type: 'string', minLength: 1 },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'] },
        order_by: { type: 'string', enum: ['subject', 'created_at'] },
    },
    additionalProperties: false,
};
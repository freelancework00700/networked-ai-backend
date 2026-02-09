import { SmsType } from '../types/enums';

export const sendSmsSchema = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        is_all_tag: { type: 'boolean' },
        is_all_segment: { type: 'boolean' },
        message: { type: 'string', minLength: 1 },
        to: { type: 'array', items: { type: 'string' } },
        tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        type: { type: 'string', enum: [SmsType.CUSTOM, SmsType.CUSTOM_EVENT] },
        segment_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    required: ['type', 'message'],
    additionalProperties: false,
};

export const getAllSmsSchema = {
    type: 'object',
    properties: {
        page: { type: 'string', minLength: 1 },
        limit: { type: 'string', minLength: 1 },
        date_to: { type: 'string', minLength: 1 },
        search: { type: 'string', maxLength: 255 },
        date_from: { type: 'string', minLength: 1 },
        order_direction: { type: 'string', enum: ['ASC', 'DESC'] },
        order_by: { type: 'string', enum: ['message', 'created_at'] },
    },
    additionalProperties: false,
};

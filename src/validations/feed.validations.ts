import { MediaType } from "../types/enums";

export const createFeedSchema = {
    type: 'object',
    properties: {
        event_ids: { type: 'array', items: { type: 'string' } },
        address: { type: 'string', maxLength: 255 },
        latitude: { type: 'string', maxLength: 255 },
        longitude: { type: 'string', maxLength: 255 },
        content: { type: 'string' },
        /** Media input */
        medias: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    media_url: { type: 'string', minLength: 1, maxLength: 255 },
                    media_type: { type: 'string', enum: Object.values(MediaType) },
                    order: { type: ['integer', 'null'], minimum: 0 }
                },
                required: ['media_url', 'media_type'],
                additionalProperties: false
            }
        },
        mention_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        is_public: { type: 'boolean' },
    },
    additionalProperties: false,
};

export const updateFeedSchema = {
    type: 'object',
    properties: {
        event_ids: { type: 'array', items: { type: 'string' } },
        address: { type: 'string', maxLength: 255 },
        latitude: { type: 'string', maxLength: 255 },
        longitude: { type: 'string', maxLength: 255 },
        content: { type: 'string' },
        /** Media input */
        medias: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    media_url: { type: 'string', minLength: 1, maxLength: 255 },
                    media_type: { type: 'string', enum: Object.values(MediaType) },
                    order: { type: ['integer', 'null'], minimum: 0 }
                },
                required: ['media_url', 'media_type'],
                additionalProperties: false
            }
        },
        is_public: { type: 'boolean' },
        mention_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    additionalProperties: false,
};

export const feedNetworkBroadcastSchema = {
    type: 'object',
    properties: {
        feed_id: {
            type: 'string',
            format: 'uuid'
        },
        type: {
            type: 'string',
            enum: ['email', 'sms']
        }
    },
    required: ['feed_id', 'type'],
    additionalProperties: false
};


export const createGamificationBadgeSchema = {
    type: 'object',
    properties: {
        event_count: {
            type: 'integer',
            minimum: 0,
        },
        badge: {
            type: 'string',
            maxLength: 45,
        },
        title: {
            type: 'string',
            maxLength: 100,
        },
        priority: {
            type: 'integer',
            minimum: 0,
        },
        locked_url: {
            type: 'string',
            maxLength: 255,
        },
        event_hosted_url: {
            type: 'string',
            maxLength: 255,
        },
        event_attended_url: {
            type: 'string',
            maxLength: 255,
        },
        networks_url: {
            type: 'string',
            maxLength: 255,
        },
        messages_url: {
            type: 'string',
            maxLength: 255,
        },
        qr_url: {
            type: 'string',
            maxLength: 255,
        },
    },
    required: ['event_count'],
    additionalProperties: false,
};

export const updateGamificationBadgeSchema = {
    type: 'object',
    properties: {
        event_count: {
            type: 'integer',
            minimum: 0,
        },
        badge: {
            type: 'string',
            maxLength: 45,
        },
        title: {
            type: 'string',
            maxLength: 100,
        },
        priority: {
            type: 'integer',
            minimum: 0,
        },
        locked_url: {
            type: 'string',
            maxLength: 255,
        },
        event_hosted_url: {
            type: 'string',
            maxLength: 255,
        },
        event_attended_url: {
            type: 'string',
            maxLength: 255,
        },
        networks_url: {
            type: 'string',
            maxLength: 255,
        },
        messages_url: {
            type: 'string',
            maxLength: 255,
        },
        qr_url: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllGamificationBadgesSchema = {
    type: 'object',
    properties: {
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
};

export const getAllGamificationBadgesPaginatedSchema = {
    type: 'object',
    properties: {
        page: {
            type: 'string',
            minLength: 1,
        },
        limit: {
            type: 'string',
            minLength: 1,
        },
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    required: ['page', 'limit'],
    additionalProperties: false,
};


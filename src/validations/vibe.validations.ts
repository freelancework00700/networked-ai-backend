export const createVibeSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        icon: {
            type: 'string',
            maxLength: 255,
        },
        description: {
            type: 'string',
        },
    },
    required: ['name'],
    additionalProperties: false,
};

export const updateVibeSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
        },
        icon: {
            type: 'string',
            maxLength: 255,
        },
        description: {
            type: 'string',
        },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllVibesSchema = {
    type: 'object',
    properties: {
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
};

export const getAllVibesPaginatedSchema = {
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
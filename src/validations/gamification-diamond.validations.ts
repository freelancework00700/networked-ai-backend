export const createGamificationDiamondSchema = {
    type: 'object',
    properties: {
        color: {
            type: 'string',
            minLength: 1,
            maxLength: 45,
        },
        points: {
            type: 'integer',
            minimum: 0,
        },
        description: {
            type: 'string',
            maxLength: 45,
        },
        priority: {
            type: 'integer',
            minimum: 0,
        },
        icon_url: {
            type: 'string',
            maxLength: 255,
        },
    },
    required: ['color', 'points'],
    additionalProperties: false,
};

export const updateGamificationDiamondSchema = {
    type: 'object',
    properties: {
        color: {
            type: 'string',
            minLength: 1,
            maxLength: 45,
        },
        points: {
            type: 'integer',
            minimum: 0,
        },
        description: {
            type: 'string',
            maxLength: 45,
        },
        priority: {
            type: 'integer',
            minimum: 0,
        },
        icon_url: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllGamificationDiamondsSchema = {
    type: 'object',
    properties: {
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
};

export const getAllGamificationDiamondsPaginatedSchema = {
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


export const createReportReasonSchema = {
    type: 'object',
    properties: {
        reason: { 
            type: 'string', 
            minLength: 1, 
            maxLength: 255,
        },
        order: { 
            type: 'integer', 
            minimum: 0,
        },
    },
    required: ['reason', 'order'],
    additionalProperties: false,
};

export const updateReportReasonSchema = {
    type: 'object',
    properties: {
        reason: { 
            type: 'string', 
            minLength: 1, 
            maxLength: 255,
        },
        order: { 
            type: 'integer', 
            minimum: 0,
        },
    },
    additionalProperties: false,
    minProperties: 1,
};

export const getAllReportReasonsSchema = {
    type: 'object',
    properties: {
        search: {
            type: 'string',
            maxLength: 255,
        },
    },
    additionalProperties: false,
};

export const getAllReportReasonsPaginatedSchema = {
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


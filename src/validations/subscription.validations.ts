export const getUserSubscriptionsPaginatedSchema = {
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
    },
    required: ['page', 'limit'],
    additionalProperties: false,
};

